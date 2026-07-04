import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { Icon, type IconName } from '../../components/Icon';
import { MembersSheet } from '../../components/community/MembersSheet';
import { useToast } from '../../components/feedback/toast';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { useAuth } from '../../store/auth';
import { useGroup, useGroupMembers, useJoinRequests, useModerateMembers, useTogglePinGroup, useToggleJoin } from '../../features/groups/hooks';

const MONTHS = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

/** Botão quadrado da fileira de ações (estilo WhatsApp, adaptado ao design). */
function ActionSquare({ icon, label, active, onPress }: { icon: IconName; label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-1 items-center gap-1.5 py-3 rounded-2xl bg-surface-muted border border-surface-border">
      <Icon name={icon} set={active ? 'bold' : 'light'} size={22} color={colors.brand[500]} />
      <Text className="text-ink-700 text-xs font-semibold">{label}</Text>
    </Pressable>
  );
}

function Row({ icon, label, badge, danger, onPress }: { icon: IconName; label: string; badge?: number; danger?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-row items-center gap-3 px-4 py-4 border-b border-surface-border">
      <Icon name={icon} set="light" size={22} color={danger ? colors.danger : colors.ink[900]} />
      <Text className={['flex-1 font-semibold text-[15px]', danger ? 'text-danger' : 'text-ink-900'].join(' ')}>{label}</Text>
      {badge ? (
        <View className="min-w-[22px] h-[22px] rounded-full bg-danger items-center justify-center px-1.5">
          <Text className="text-white text-xs font-bold">{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
      {!danger ? <Icon name="forward" set="light" size={16} color={colors.ink[400]} /> : null}
    </Pressable>
  );
}

/**
 * DADOS DA COMUNIDADE (estilo WhatsApp — plano-grupos-comunidades.md): foto grande,
 * nome, membros, descrição, fileira de ações, SOLICITAÇÕES com badge (admin),
 * membros inline + mostrar todos, sair/denunciar, "criada por" no rodapé.
 * Mesmo padrão vale para grupos de chat e 1:1 na Fase B.
 */
export default function CommunityDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const me = useAuth((s) => s.user);
  const { data: g, isLoading } = useGroup(id);
  const isAdmin = g?.myRole === 'ADMIN';
  const { data: members } = useGroupMembers(id, !!g?.joined);
  const { data: requests } = useJoinRequests(id, !!isAdmin && !!g?.isPrivate);
  const { remove } = useModerateMembers(id);
  const togglePin = useTogglePinGroup();
  const toggleJoin = useToggleJoin();
  const [membersOpen, setMembersOpen] = useState(false);
  const [membersTab, setMembersTab] = useState<'members' | 'requests'>('members');

  const openMembers = (tab: 'members' | 'requests') => { setMembersTab(tab); setMembersOpen(true); };

  const createdAt = g?.createdAt ? new Date(g.createdAt) : null;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border">
        <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP}>
          <Icon name="back" size={24} color={colors.ink[900]} />
        </Pressable>
        <Text className="text-ink-900 font-semibold text-base flex-1" numberOfLines={1}>Dados da comunidade</Text>
      </View>

      {isLoading || !g ? (
        <View className="flex-1 items-center justify-center">
          {isLoading ? <ActivityIndicator color={colors.brand[500]} /> : <EmptyState icon="groups" title="Comunidade não encontrada" />}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {/* identidade */}
          <View className="items-center gap-2 px-4 pt-6 pb-4">
            {g.coverPath ? (
              <Image source={{ uri: g.coverPath }} style={{ width: 96, height: 96, borderRadius: 48 }} contentFit="cover" />
            ) : (
              <View className="w-24 h-24 rounded-full bg-accent-50 items-center justify-center">
                <Text className="text-brand-500 font-bold text-3xl">{g.name.trim()[0]?.toUpperCase() ?? '?'}</Text>
              </View>
            )}
            <Text className="text-ink-900 font-extrabold text-xl text-center">{g.name}</Text>
            <Pressable onPress={() => openMembers('members')} hitSlop={6} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
              <Text className="text-ink-500 text-sm">
                Comunidade{g.isPrivate ? ' privada' : ''} · <Text className="text-brand-500 font-semibold">{g.memberCount.toLocaleString('pt-BR')} membros</Text>
              </Text>
            </Pressable>
            {g.description ? (
              <Text className="text-ink-700 leading-5 text-center px-2">{g.description}</Text>
            ) : isAdmin ? (
              <Text className="text-brand-500 text-sm font-semibold" suppressHighlighting onPress={() => router.push({ pathname: '/group/edit', params: { id: g.id } })}>
                Adicionar descrição da comunidade
              </Text>
            ) : null}
          </View>

          {/* fileira de ações */}
          <View className="flex-row gap-3 px-4 pb-5">
            {g.joined ? (
              <ActionSquare icon="paper" label="Publicar" onPress={() => router.push({ pathname: '/compose', params: { groupId: g.id, groupName: g.name } })} />
            ) : null}
            <ActionSquare icon="groups" label="Membros" onPress={() => openMembers('members')} />
            {g.joined ? (
              <ActionSquare
                icon="bookmark"
                label={g.pinned ? 'Fixada' : 'Fixar'}
                active={g.pinned}
                onPress={() => togglePin.mutate({ id: g.id, pinned: g.pinned }, { onError: (e) => toast.error(e instanceof Error ? e.message : 'Não foi possível fixar.') })}
              />
            ) : null}
            {isAdmin ? (
              <ActionSquare icon="edit" label="Editar" onPress={() => router.push({ pathname: '/group/edit', params: { id: g.id } })} />
            ) : null}
          </View>

          {/* solicitações (ADMIN, privada) — badge bem visível */}
          {isAdmin && g.isPrivate ? (
            <Row icon="bell" label="Solicitações de entrada" badge={requests?.length ?? 0} onPress={() => openMembers('requests')} />
          ) : null}

          {/* membros inline (primeiros 8) + mostrar todos */}
          {g.joined ? (
            <View className="pt-2">
              <Text className="text-ink-500 text-sm font-semibold px-4 pt-3 pb-1">{g.memberCount.toLocaleString('pt-BR')} membros</Text>
              {(members ?? []).slice(0, 8).map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => router.push({ pathname: '/user/[id]', params: { id: m.id } })}
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
                  {isAdmin && m.role !== 'ADMIN' && m.id !== me?.id ? (
                    <Text className="text-danger text-xs font-bold" suppressHighlighting onPress={() => remove.mutate(m.id)}>Remover</Text>
                  ) : null}
                </Pressable>
              ))}
              {(members?.length ?? 0) > 8 ? (
                <Pressable onPress={() => openMembers('members')} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="px-4 py-3 border-b border-surface-border">
                  <Text className="text-brand-500 font-semibold text-sm">Mostrar todos os membros</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* zona de saída */}
          <View className="pt-4">
            {g.joined ? (
              <Row icon="logout" label="Sair da comunidade" danger onPress={() => toggleJoin.mutate({ id: g.id, joined: true, isPrivate: g.isPrivate, requested: false }, { onSuccess: () => router.back() })} />
            ) : g.requested ? (
              <Row icon="close" label="Cancelar solicitação" danger onPress={() => toggleJoin.mutate({ id: g.id, joined: false, isPrivate: g.isPrivate, requested: true })} />
            ) : (
              <Row icon="groups" label={g.isPrivate ? 'Solicitar entrada' : 'Entrar na comunidade'} onPress={() => toggleJoin.mutate({ id: g.id, joined: false, isPrivate: g.isPrivate, requested: false })} />
            )}
            <Row icon="error" label="Denunciar comunidade" danger onPress={() => toast.info('Denúncias em breve.')} />
          </View>

          {/* rodapé */}
          <View className="px-4 pt-5">
            {g.creatorName ? <Text className="text-ink-400 text-xs">Criada por {g.creatorName}</Text> : null}
            {createdAt && !Number.isNaN(createdAt.getTime()) ? (
              <Text className="text-ink-400 text-xs">Criada em {createdAt.getDate()} de {MONTHS[createdAt.getMonth()]} de {createdAt.getFullYear()}</Text>
            ) : null}
          </View>
        </ScrollView>
      )}

      {g ? (
        <MembersSheet groupId={g.id} isAdmin={!!isAdmin} isPrivate={g.isPrivate} visible={membersOpen} onClose={() => setMembersOpen(false)} initialTab={membersTab} />
      ) : null}
    </SafeAreaView>
  );
}
