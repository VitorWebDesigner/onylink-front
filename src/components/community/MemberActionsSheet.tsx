import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '../Avatar';
import { BottomSheet, SHEET_BG, sheetShadow } from '../BottomSheet';
import { Icon, type IconName } from '../Icon';
import { UserBadges } from '../UserBadges';
import { useToast } from '../feedback/toast';
import { colors } from '../../theme/colors';
import { PRESSED_OPACITY } from '../../theme/tokens';
import { useAuth } from '../../store/auth';
import { useFollowUser } from '../../features/connections/hooks';
import { useOpenDm } from '../../features/messages/hooks';

/** Shape mínima — serve GroupMember (comunidade) e ChatMember (grupo de chat). */
export interface MemberLike {
  id: string;
  name: string;
  handle: string;
  avatarPath: string | null;
  roleTitle: string | null;
  role: string;
  followed: boolean;
  verified?: boolean;
  admin?: boolean;
}
/** Contexto de moderação — Group ou Conversation satisfazem estruturalmente. */
export interface ModerationScope {
  myRole?: string | null;
  createdBy?: string | null;
}

function SquareAction({ icon, label, danger, onPress }: { icon: IconName; label: string; danger?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
      className={['flex-1 items-center gap-1.5 py-3 rounded-2xl border', danger ? 'bg-danger/5 border-danger/30' : 'bg-surface-muted border-surface-border'].join(' ')}
    >
      <Icon name={icon} set="light" size={20} color={danger ? colors.danger : colors.brand[500]} />
      <Text className={['text-[11px] font-semibold', danger ? 'text-danger' : 'text-ink-700'].join(' ')} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

/**
 * Sheet FLUTUANTE de ações sobre um MEMBRO da comunidade: identidade + TODAS as
 * ações lado a lado numa linha só (Perfil/Seguir/Mensagem + Promover/Transferir/
 * Remover conforme papel) + card Cancelar embaixo.
 */
export function MemberActionsSheet({ member, group, onClose, onPromote, onTransfer, onRemove }: {
  member: MemberLike | null;
  group: ModerationScope;
  onClose: () => void;
  onPromote: (userId: string) => void;
  onTransfer: (userId: string, name: string) => void;
  onRemove: (userId: string) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const me = useAuth((s) => s.user);
  const follow = useFollowUser();
  const openDm = useOpenDm();
  const [followedOverride, setFollowedOverride] = useState<Record<string, boolean>>({});

  const m = member;
  const isAdminViewer = group.myRole === 'ADMIN';
  const isOwnerViewer = !!group.createdBy && group.createdBy === me?.id;
  const self = m?.id === me?.id;
  const targetIsOwner = !!m && group.createdBy === m.id;
  const followed = m ? (followedOverride[m.id] ?? m.followed) : false;

  // regras de moderação (espelham o back): admin promove/remove MEMBRO;
  // dono transfere p/ admin e remove qualquer um (menos ele mesmo)
  const canPromote = !self && isAdminViewer && m?.role !== 'ADMIN';
  const canTransfer = !self && isOwnerViewer && m?.role === 'ADMIN';
  const canRemove = !self && !targetIsOwner && (isOwnerViewer || (isAdminViewer && m?.role !== 'ADMIN'));

  const openProfile = () => {
    if (!m) return;
    onClose();
    router.push({ pathname: '/user/[id]', params: { id: m.id } });
  };

  return (
    <BottomSheet visible={!!m} onClose={onClose} floating>
      {m ? (
        <>
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: SHEET_BG, ...sheetShadow }}>
            <View className="items-center gap-2 px-4 pt-6 pb-4">
              <Avatar name={m.name} uri={m.avatarPath} size="xxl" />
              <View className="items-center">
                <View className="flex-row items-center gap-2">
                  <Text className="text-ink-900 font-extrabold text-lg shrink" numberOfLines={1}>{m.name}</Text>
                  <UserBadges verified={m.verified} admin={m.admin} size={15} />
                  {m.role === 'ADMIN' ? (
                    <View className="rounded-pill px-2 py-0.5 bg-accent-50">
                      <Text className="text-brand-500 text-[10px] font-bold">{targetIsOwner ? 'DONO' : 'ADMIN'}</Text>
                    </View>
                  ) : null}
                </View>
                <Text className="text-ink-500 text-sm">@{m.handle}{m.roleTitle ? ` · ${m.roleTitle}` : ''}</Text>
              </View>

              {/* TODAS as ações numa linha só */}
              {!self ? (
                <View className="flex-row gap-2 w-full pt-2">
                  <SquareAction icon="user" label="Perfil" onPress={openProfile} />
                  <SquareAction
                    icon="connector"
                    label={followed ? 'Seguindo' : 'Seguir'}
                    onPress={() => {
                      setFollowedOverride((s) => ({ ...s, [m.id]: !followed }));
                      follow.mutate({ userId: m.id, followed });
                    }}
                  />
                  <SquareAction
                    icon="chat"
                    label="Mensagem"
                    onPress={() => {
                      onClose();
                      openDm.mutate(m.id, {
                        onSuccess: (conv) => router.push({ pathname: '/chat/[id]', params: { id: conv.id } }),
                        onError: () => toast.error('Não foi possível abrir a conversa.'),
                      });
                    }}
                  />
                  {canPromote ? <SquareAction icon="verified" label="Promover" onPress={() => { onClose(); onPromote(m.id); }} /> : null}
                  {canTransfer ? <SquareAction icon="authority" label="Transferir" onPress={() => { onClose(); onTransfer(m.id, m.name); }} /> : null}
                  {canRemove ? <SquareAction icon="close" label="Remover" danger onPress={() => { onClose(); onRemove(m.id); }} /> : null}
                </View>
              ) : null}
            </View>
          </View>

          {/* fechar */}
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: SHEET_BG, ...sheetShadow }}>
            <Pressable onPress={onClose} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="py-4 items-center">
              <Text className="text-ink-900 text-base font-semibold">Cancelar</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </BottomSheet>
  );
}
