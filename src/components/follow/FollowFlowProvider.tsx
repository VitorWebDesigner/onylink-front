import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '../Avatar';
import { Button } from '../Button';
import { BottomSheet, SheetScrollView, SHEET_BG, sheetShadow } from '../BottomSheet';
import { colors } from '../../theme/colors';
import { PRESSED_OPACITY } from '../../theme/tokens';
import { useToggleFollowAuthor } from '../../features/feed/hooks';
import { useFollowSuggestions, type SuggestUser } from '../../features/connections/hooks';

export interface FollowTarget {
  id: string;
  name: string;
  avatarPath?: string | null;
  followed: boolean;
}

const Ctx = createContext<{ start: (t: FollowTarget) => void } | null>(null);

export function useFollowFlow() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useFollowFlow precisa de <FollowFlowProvider>');
  return c;
}

/** Pílula Seguir/Seguindo com largura fixa (não mexe layout). */
function FollowBtn({ followed, onPress }: { followed: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1, minWidth: 88 })}
      className={followed ? 'rounded-full border border-surface-border py-1.5 px-3 items-center justify-center' : 'rounded-full bg-brand-500 py-1.5 px-3 items-center justify-center'}
    >
      <Text className={followed ? 'text-ink-700 text-xs font-bold' : 'text-white text-xs font-bold'}>{followed ? 'Seguindo' : 'Seguir'}</Text>
    </Pressable>
  );
}

/** Sheet de sugestões (altura total). Tocar num usuário → visita o perfil. */
function Suggestions({ seed, onDone }: { seed: FollowTarget; onDone: () => void }) {
  const router = useRouter();
  const { data, isLoading } = useFollowSuggestions(seed.id, true);
  const follow = useToggleFollowAuthor();
  const [followed, setFollowed] = useState<Record<string, boolean>>({});

  const toggle = (u: SuggestUser) => {
    const cur = !!followed[u.id];
    follow.mutate({ authorId: u.id, following: cur });
    setFollowed((s) => ({ ...s, [u.id]: !cur }));
  };

  const openProfile = (id: string) => {
    onDone();
    router.push({ pathname: '/user/[id]', params: { id } });
  };

  return (
    <View className="flex-1">
      <Text className="text-ink-900 text-lg font-extrabold text-center pt-1 pb-3">Sugestões para você</Text>
      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.brand[500]} /></View>
      ) : data?.length ? (
        <SheetScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
          {data.map((u) => (
            <Pressable
              key={u.id}
              onPress={() => openProfile(u.id)}
              style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
              className="flex-row items-center gap-3 py-3 border-b border-surface-border"
            >
              <Avatar name={u.name} uri={u.avatarPath} size="md" />
              <View className="flex-1">
                <Text className="text-ink-900 font-semibold text-sm" numberOfLines={1}>{u.name}</Text>
                <Text className="text-ink-400 text-[13px]" numberOfLines={1}>@{u.handle}{u.roleTitle ? ` · ${u.roleTitle}` : ''}</Text>
              </View>
              <FollowBtn followed={!!followed[u.id]} onPress={() => toggle(u)} />
            </Pressable>
          ))}
        </SheetScrollView>
      ) : (
        <View className="flex-1 items-center justify-center px-6"><Text className="text-ink-500 text-center">Sem sugestões por enquanto.</Text></View>
      )}
      <View className="px-4 pt-3">
        <Button title="Concluir" variant="primary" onPress={onDone} />
      </View>
    </View>
  );
}

/**
 * Orquestra o fluxo de seguir/deixar de seguir com bottom sheets:
 *  - seguir → aplica na hora + abre "Sugestões para você" (afinidade);
 *  - deixar de seguir → abre sheet de CONFIRMAÇÃO antes de aplicar.
 */
export function FollowFlowProvider({ children }: { children: ReactNode }) {
  const follow = useToggleFollowAuthor();
  const [confirm, setConfirm] = useState<FollowTarget | null>(null);
  const [suggestFor, setSuggestFor] = useState<FollowTarget | null>(null);

  const start = useCallback(
    (t: FollowTarget) => {
      if (t.followed) {
        setConfirm(t); // pede confirmação antes de deixar de seguir
      } else {
        follow.mutate({ authorId: t.id, following: false }); // segue na hora
        setSuggestFor(t); // e abre sugestões
      }
    },
    [follow],
  );

  const doUnfollow = () => {
    if (confirm) follow.mutate({ authorId: confirm.id, following: true });
    setConfirm(null);
  };

  const api = useMemo(() => ({ start }), [start]);

  return (
    <Ctx.Provider value={api}>
      {children}

      {/* Confirmação de deixar de seguir — dois cards flutuantes (estilo Threads) */}
      <BottomSheet visible={!!confirm} onClose={() => setConfirm(null)} floating>
        {confirm ? (
          <>
            <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: SHEET_BG, ...sheetShadow }}>
              <View className="items-center gap-3 px-6 pt-5 pb-4">
                <Avatar name={confirm.name} uri={confirm.avatarPath} size="xxl" />
                <Text className="text-ink-900 text-base font-semibold text-center">Deixar de seguir {confirm.name}?</Text>
              </View>
              <View className="h-px bg-surface-border" />
              <Pressable onPress={doUnfollow} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="py-4 items-center">
                <Text className="text-danger text-base font-bold">Deixar de seguir</Text>
              </Pressable>
            </View>
            <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: SHEET_BG, ...sheetShadow }}>
              <Pressable onPress={() => setConfirm(null)} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="py-4 items-center">
                <Text className="text-ink-900 text-base font-semibold">Cancelar</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </BottomSheet>

      {/* Sugestões após seguir — altura total */}
      <BottomSheet visible={!!suggestFor} onClose={() => setSuggestFor(null)} fullHeight>
        {suggestFor ? <Suggestions seed={suggestFor} onDone={() => setSuggestFor(null)} /> : null}
      </BottomSheet>
    </Ctx.Provider>
  );
}
