import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '../Avatar';
import { BottomSheet, SheetScrollView } from '../BottomSheet';
import { Button } from '../Button';
import { Icon } from '../Icon';
import { colors } from '../../theme/colors';
import { PRESSED_OPACITY } from '../../theme/tokens';
import { useAuth } from '../../store/auth';
import { useGroupMembers, useJoinRequests, useModerateMembers } from '../../features/groups/hooks';
import type { GroupMember } from '../../features/groups/types';

export type MembersSheetMode = 'members' | 'requests';

/**
 * Sheet da comunidade em MODO ÚNICO (sem abas — decisão do dono):
 *  - mode="members": SÓ a lista de membros (seta → sheet de ações).
 *  - mode="requests": SÓ as solicitações de entrada (aprovar/recusar).
 */
export function MembersSheet({ groupId, mode, visible, onClose, onSelectMember }: {
  groupId: string;
  mode: MembersSheetMode;
  visible: boolean;
  onClose: () => void;
  /** Tocar num membro → a tela hospedeira fecha este sheet e abre o de AÇÕES. */
  onSelectMember?: (m: GroupMember) => void;
}) {
  const router = useRouter();
  const me = useAuth((s) => s.user);
  const { data: members, isLoading: loadingMembers } = useGroupMembers(groupId, visible && mode === 'members');
  const { data: requests, isLoading: loadingRequests } = useJoinRequests(groupId, visible && mode === 'requests');
  const { approve, reject } = useModerateMembers(groupId);

  const open = (id: string) => { onClose(); router.push({ pathname: '/user/[id]', params: { id } }); };
  const loading = mode === 'members' ? loadingMembers : loadingRequests;

  return (
    <BottomSheet visible={visible} onClose={onClose} fullHeight>
      <View className="flex-1">
        <Text className="text-ink-900 text-lg font-extrabold text-center pb-3">
          {mode === 'members' ? 'Membros' : 'Solicitações de entrada'}
        </Text>

        {loading ? (
          <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.brand[500]} /></View>
        ) : (
          <SheetScrollView className="flex-1">
            {mode === 'members' ? (
              <>
                {(members ?? []).map((m) => (
                  <Pressable
                    key={m.id}
                    onPress={() => (m.id === me?.id || !onSelectMember ? open(m.id) : onSelectMember(m))}
                    style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
                    className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border"
                  >
                    <Avatar name={m.name} uri={m.avatarPath} size="md" />
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-ink-900 font-semibold text-sm" numberOfLines={1}>{m.id === me?.id ? 'Você' : m.name}</Text>
                        {m.role === 'ADMIN' ? (
                          <View className="rounded-pill px-2 py-0.5 bg-accent-50">
                            <Text className="text-brand-500 text-[10px] font-bold">ADMIN</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="text-ink-400 text-[13px]" numberOfLines={1}>@{m.handle}{m.roleTitle ? ` · ${m.roleTitle}` : ''}</Text>
                    </View>
                    {/* seta = há mais ações (sheet flutuante) */}
                    <Icon name="forward" set="light" size={16} color={colors.ink[400]} />
                  </Pressable>
                ))}
                {!members?.length ? <Text className="text-ink-500 text-center py-10">Nenhum membro ainda.</Text> : null}
              </>
            ) : (
              <>
                {(requests ?? []).map((r) => (
                  <View key={r.id} className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border">
                    <Pressable onPress={() => open(r.id)} hitSlop={6} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
                      <Avatar name={r.name} uri={r.avatarPath} size="md" />
                    </Pressable>
                    <Pressable onPress={() => open(r.id)} className="flex-1" style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
                      <Text className="text-ink-900 font-semibold text-sm" numberOfLines={1}>{r.name}</Text>
                      <Text className="text-ink-400 text-[13px]" numberOfLines={1}>@{r.handle}{r.roleTitle ? ` · ${r.roleTitle}` : ''}</Text>
                    </Pressable>
                    <View className="flex-row gap-2">
                      <Button title="Aprovar" size="sm" variant="accent" onPress={() => approve.mutate(r.id)} />
                      <Button title="Recusar" size="sm" variant="secondary" onPress={() => reject.mutate(r.id)} />
                    </View>
                  </View>
                ))}
                {!requests?.length ? <Text className="text-ink-500 text-center py-10">Nenhum pedido pendente.</Text> : null}
              </>
            )}
          </SheetScrollView>
        )}
      </View>
    </BottomSheet>
  );
}
