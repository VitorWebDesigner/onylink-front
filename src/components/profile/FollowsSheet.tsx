import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '../Avatar';
import { BottomSheet, SheetScrollView } from '../BottomSheet';
import { colors } from '../../theme/colors';
import { PRESSED_OPACITY } from '../../theme/tokens';
import { useAuth } from '../../store/auth';
import { useFollowsList, type FollowListUser } from '../../features/users/hooks';
import { useToggleFollowAuthor } from '../../features/feed/hooks';

export type FollowsKind = 'followers' | 'following';

/** Pílula Seguir/Seguindo (largura fixa). */
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

/**
 * BottomSheet de rede do perfil (stats tocáveis): alternador Seguidores | Seguindo,
 * seguir direto na lista e toque na pessoa → navega pro perfil dela.
 */
export function FollowsSheet({ userId, initialKind, visible, onClose }: {
  userId: string;
  initialKind: FollowsKind;
  visible: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const me = useAuth((s) => s.user);
  const [kind, setKind] = useState<FollowsKind>(initialKind);
  const { data, isLoading, isError, refetch } = useFollowsList(visible ? userId : '', kind);
  const follow = useToggleFollowAuthor();
  const [override, setOverride] = useState<Record<string, boolean>>({}); // otimista local

  // re-sincroniza a aba inicial a cada abertura
  const [lastVisible, setLastVisible] = useState(false);
  if (visible !== lastVisible) {
    setLastVisible(visible);
    if (visible) { setKind(initialKind); setOverride({}); }
  }

  const toggle = (u: FollowListUser) => {
    const cur = override[u.id] ?? u.followed;
    follow.mutate({ authorId: u.id, following: cur });
    setOverride((s) => ({ ...s, [u.id]: !cur }));
  };

  const open = (id: string) => {
    onClose();
    router.push({ pathname: '/user/[id]', params: { id } });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} fullHeight>
      <View className="flex-1">
        {/* alternador */}
        <View className="flex-row border-b border-surface-border">
          {(['followers', 'following'] as FollowsKind[]).map((k) => {
            const active = k === kind;
            return (
              <Pressable key={k} onPress={() => setKind(k)} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-1 items-center pb-2.5 pt-1">
                <Text className={active ? 'text-ink-900 font-bold text-sm' : 'text-ink-400 font-semibold text-sm'}>
                  {k === 'followers' ? 'Seguidores' : 'Seguindo'}
                </Text>
                {active ? <View className="absolute left-10 right-10 bottom-0 h-[2px] rounded-full bg-brand-500" /> : null}
              </Pressable>
            );
          })}
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.brand[500]} /></View>
        ) : isError ? (
          <View className="flex-1 items-center justify-center gap-2 px-6">
            <Text className="text-ink-500 text-center">Não foi possível carregar a lista.</Text>
            <Text className="text-brand-500 font-semibold" suppressHighlighting onPress={() => void refetch()}>Tentar novamente</Text>
          </View>
        ) : (
          <SheetScrollView className="flex-1">
            {(data ?? []).map((u) => {
              const followed = override[u.id] ?? u.followed;
              return (
                <Pressable
                  key={u.id}
                  onPress={() => open(u.id)}
                  style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
                  className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border"
                >
                  <Avatar name={u.name} uri={u.avatarPath} size="md" />
                  <View className="flex-1">
                    <Text className="text-ink-900 font-semibold text-sm" numberOfLines={1}>{u.name}</Text>
                    <Text className="text-ink-400 text-[13px]" numberOfLines={1}>@{u.handle}{u.roleTitle ? ` · ${u.roleTitle}` : ''}</Text>
                  </View>
                  {u.id !== me?.id ? <FollowBtn followed={followed} onPress={() => toggle(u)} /> : null}
                </Pressable>
              );
            })}
            {!data?.length ? (
              <Text className="text-ink-500 text-center py-10">
                {kind === 'followers' ? 'Nenhum seguidor ainda.' : 'Não segue ninguém ainda.'}
              </Text>
            ) : null}
          </SheetScrollView>
        )}
      </View>
    </BottomSheet>
  );
}
