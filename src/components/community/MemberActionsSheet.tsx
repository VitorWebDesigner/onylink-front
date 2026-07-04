import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '../Avatar';
import { BottomSheet, SHEET_BG, sheetShadow } from '../BottomSheet';
import { Icon, type IconName } from '../Icon';
import { useToast } from '../feedback/toast';
import { colors } from '../../theme/colors';
import { PRESSED_OPACITY } from '../../theme/tokens';
import { useAuth } from '../../store/auth';
import { useFollowUser } from '../../features/connections/hooks';
import type { Group, GroupMember } from '../../features/groups/types';

function SquareAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-1 items-center gap-1.5 py-3 rounded-2xl bg-surface-muted border border-surface-border">
      <Icon name={icon} set="light" size={22} color={colors.brand[500]} />
      <Text className="text-ink-700 text-xs font-semibold">{label}</Text>
    </Pressable>
  );
}

function Row({ icon, label, danger, onPress }: { icon: IconName; label: string; danger?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-row items-center gap-3 px-4 py-4">
      <Icon name={icon} set="light" size={20} color={danger ? colors.danger : colors.ink[900]} />
      <Text className={['font-semibold text-[15px]', danger ? 'text-danger' : 'text-ink-900'].join(' ')}>{label}</Text>
    </Pressable>
  );
}

/**
 * Sheet FLUTUANTE de ações sobre um MEMBRO da comunidade (estilo WhatsApp):
 * identidade + atalhos (Perfil/Seguir/Mensagem) + ações de moderação
 * (Promover · Transferir · Remover) conforme papel de quem abriu.
 */
export function MemberActionsSheet({ member, group, onClose, onPromote, onTransfer, onRemove }: {
  member: GroupMember | null;
  group: Group;
  onClose: () => void;
  onPromote: (userId: string) => void;
  onTransfer: (userId: string, name: string) => void;
  onRemove: (userId: string) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const me = useAuth((s) => s.user);
  const follow = useFollowUser();
  const [followedOverride, setFollowedOverride] = useState<Record<string, boolean>>({});

  const m = member;
  const isAdminViewer = group.myRole === 'ADMIN';
  const isOwnerViewer = !!group.createdBy && group.createdBy === me?.id;
  const self = m?.id === me?.id;
  const followed = m ? (followedOverride[m.id] ?? m.followed) : false;

  const openProfile = () => {
    if (!m) return;
    onClose();
    router.push({ pathname: '/user/[id]', params: { id: m.id } });
  };

  return (
    <BottomSheet visible={!!m} onClose={onClose} floating>
      {m ? (
        <>
          {/* identidade + atalhos */}
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: SHEET_BG, ...sheetShadow }}>
            <View className="items-center gap-2 px-5 pt-6 pb-4">
              <Avatar name={m.name} uri={m.avatarPath} size="xxl" />
              <View className="items-center">
                <View className="flex-row items-center gap-2">
                  <Text className="text-ink-900 font-extrabold text-lg">{m.name}</Text>
                  {m.role === 'ADMIN' ? (
                    <View className="rounded-pill px-2 py-0.5 bg-accent-50">
                      <Text className="text-brand-500 text-[10px] font-bold">{group.createdBy === m.id ? 'DONO' : 'ADMIN'}</Text>
                    </View>
                  ) : null}
                </View>
                <Text className="text-ink-500 text-sm">@{m.handle}{m.roleTitle ? ` · ${m.roleTitle}` : ''}</Text>
              </View>
              {!self ? (
                <View className="flex-row gap-3 w-full pt-2">
                  <SquareAction icon="user" label="Perfil" onPress={openProfile} />
                  <SquareAction
                    icon="connector"
                    label={followed ? 'Seguindo' : 'Seguir'}
                    onPress={() => {
                      setFollowedOverride((s) => ({ ...s, [m.id]: !followed }));
                      follow.mutate({ userId: m.id, followed });
                    }}
                  />
                  <SquareAction icon="chat" label="Mensagem" onPress={() => toast.info('Mensagens diretas em breve.')} />
                </View>
              ) : null}
            </View>
          </View>

          {/* moderação (papéis) */}
          {!self && (isAdminViewer || isOwnerViewer) ? (
            <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: SHEET_BG, ...sheetShadow }}>
              {isAdminViewer && m.role !== 'ADMIN' ? (
                <Row icon="verified" label="Promover a admin da comunidade" onPress={() => { onClose(); onPromote(m.id); }} />
              ) : null}
              {isOwnerViewer && m.role === 'ADMIN' ? (
                <Row icon="authority" label="Transferir propriedade" onPress={() => { onClose(); onTransfer(m.id, m.name); }} />
              ) : null}
              {isAdminViewer && m.role !== 'ADMIN' ? (
                <>
                  <View className="h-px bg-surface-border mx-4" />
                  <Row icon="close" label="Remover da comunidade" danger onPress={() => { onClose(); onRemove(m.id); }} />
                </>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}
    </BottomSheet>
  );
}
