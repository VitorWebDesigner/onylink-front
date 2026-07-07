import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { BottomSheet, SheetHeader, SheetScrollView } from '../../components/BottomSheet';
import { CountBadge } from '../../components/CountBadge';
import { UserBadges } from '../../components/UserBadges';
import { EmptyState } from '../../components/EmptyState';
import { Icon, type IconName } from '../../components/Icon';
import { MemberActionsSheet } from '../../components/community/MemberActionsSheet';
import { MembersSheet } from '../../components/community/MembersSheet';
import { useDialog } from '../../components/feedback/dialog';
import { useToast } from '../../components/feedback/toast';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { timeAgo } from '../../lib/time';
import { useAuth } from '../../store/auth';
import { useGroup, useGroupMembers, useGroupPosts, useJoinRequests, useModerateMembers, useTogglePinGroup, useToggleJoin } from '../../features/groups/hooks';
import type { GroupMember } from '../../features/groups/types';

const MONTHS = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

/** Botão quadrado da fileira de ações (estilo WhatsApp — pedido do dono). */
function ActionSquare({ icon, label, active, onPress }: { icon: IconName; label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-1 items-center gap-1.5 py-3 rounded-2xl bg-surface-muted border border-surface-border">
      <Icon name={icon} set={active ? 'bold' : 'light'} size={22} color={colors.brand[500]} />
      <Text className="text-ink-700 text-xs font-semibold" numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function Row({ icon, label, sub, badge, danger, onPress }: {
  icon: IconName; label: string; sub?: string; badge?: number; danger?: boolean; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-row items-center gap-3 px-4 py-4 border-b border-surface-border">
      <Icon name={icon} set="light" size={22} color={danger ? colors.danger : colors.ink[900]} />
      <View className="flex-1">
        <Text className={['font-semibold text-[15px]', danger ? 'text-danger' : 'text-ink-900'].join(' ')}>{label}</Text>
        {sub ? <Text className="text-ink-500 text-[13px]">{sub}</Text> : null}
      </View>
      {badge ? <CountBadge count={badge} size={22} /> : null}
      {!danger ? <Icon name="forward" set="light" size={16} color={colors.ink[400]} /> : null}
    </Pressable>
  );
}

/**
 * DADOS DA COMUNIDADE (estilo WhatsApp): fileira de SQUARES (Publicar/Membros/
 * Buscar/Fixar/Editar), rows (solicitações c/ badge, mídia, convidar), membros
 * com SETA → sheet flutuante de ações (perfil/seguir/promover/transferir/remover),
 * sair com confirmação (dono não sai sem transferir).
 */
export default function CommunityDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const dialog = useDialog();
  const me = useAuth((s) => s.user);
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const { data: g, isLoading } = useGroup(id);
  const isAdmin = g?.myRole === 'ADMIN';
  const isOwner = !!g?.createdBy && g.createdBy === me?.id;
  const { data: members } = useGroupMembers(id, !!g?.joined);
  const { data: requests } = useJoinRequests(id, !!isAdmin && !!g?.isPrivate);
  const { remove, promote, transfer } = useModerateMembers(id);
  const { data: posts } = useGroupPosts(id, !!g?.joined);
  const togglePin = useTogglePinGroup();
  const toggleJoin = useToggleJoin();
  const [membersOpen, setMembersOpen] = useState(false);
  const [membersTab, setMembersTab] = useState<'members' | 'requests'>('members');
  const [mediaOpen, setMediaOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [memberTarget, setMemberTarget] = useState<GroupMember | null>(null);

  const openMembers = (tab: 'members' | 'requests') => { setMembersTab(tab); setMembersOpen(true); };

  const mediaItems = useMemo(
    () => (posts ?? []).flatMap((p) => p.media.map((m, i) => ({ key: `${p.id}-${i}`, postId: p.id, type: m.type, uri: m.type === 'VIDEO' ? m.thumbnail : m.url }))),
    [posts],
  );
  const cell = Math.floor((screenW - 4) / 3);

  const searchResults = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return (posts ?? []).filter((p) => p.content?.toLowerCase().includes(q) || p.authorName.toLowerCase().includes(q));
  }, [posts, searchQ]);

  async function onLeave() {
    if (!g) return;
    if (isOwner) {
      toast.error('Você é o dono. Transfira a propriedade para outro admin antes de sair.');
      return;
    }
    const ok = await dialog.confirm({
      title: 'Sair da comunidade?',
      message: `Você deixará de ver e publicar em ${g.name}.`,
      confirmText: 'Sair',
      cancelText: 'Cancelar',
      destructive: true,
    });
    if (ok) toggleJoin.mutate(
      { id: g.id, joined: true, isPrivate: g.isPrivate, requested: false },
      { onSuccess: () => router.back(), onError: (e) => toast.error(e instanceof Error ? e.message : 'Não foi possível sair.') },
    );
  }

  async function onTransfer(targetId: string, targetName: string) {
    const ok = await dialog.confirm({
      title: 'Transferir propriedade?',
      message: `${targetName} vira o dono da comunidade. Você continua como admin e poderá sair depois.`,
      confirmText: 'Transferir',
      cancelText: 'Cancelar',
      destructive: true,
    });
    if (ok) transfer.mutate(targetId, {
      onSuccess: () => toast.success('Propriedade transferida.'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Não foi possível transferir.'),
    });
  }

  async function onRemove(targetId: string) {
    const ok = await dialog.confirm({
      title: 'Remover da comunidade?',
      message: 'A pessoa perde o acesso às publicações e pode pedir para entrar de novo.',
      confirmText: 'Remover',
      cancelText: 'Cancelar',
      destructive: true,
    });
    if (ok) remove.mutate(targetId, { onSuccess: () => toast.success('Membro removido.') });
  }

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
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
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

          {/* fileira de SQUARES (estilo WhatsApp) */}
          {g.joined ? (
            <View className="flex-row gap-2.5 px-4 pb-5">
              <ActionSquare icon="paper" label="Publicar" onPress={() => router.push({ pathname: '/compose', params: { groupId: g.id, groupName: g.name } })} />
              <ActionSquare icon="groups" label="Membros" onPress={() => openMembers('members')} />
              <ActionSquare icon="search" label="Buscar" onPress={() => setSearchOpen(true)} />
              <ActionSquare
                icon="bookmark"
                label={g.pinned ? 'Fixada' : 'Fixar'}
                active={g.pinned}
                onPress={() => togglePin.mutate({ id: g.id, pinned: g.pinned }, {
                  onSuccess: () => toast.success(g.pinned ? 'Comunidade desafixada.' : 'Comunidade fixada.'),
                  onError: (e) => toast.error(e instanceof Error ? e.message : 'Não foi possível fixar.'),
                })}
              />
              {isAdmin ? <ActionSquare icon="edit" label="Editar" onPress={() => router.push({ pathname: '/group/edit', params: { id: g.id } })} /> : null}
            </View>
          ) : null}

          {/* solicitações (ADMIN, privada) — badge bem visível */}
          {isAdmin && g.isPrivate ? (
            <Row icon="bell" label="Solicitações de entrada" sub="Aprove ou recuse quem pediu para entrar" badge={requests?.length ?? g.pendingRequests} onPress={() => openMembers('requests')} />
          ) : null}

          {g.joined ? (
            <Row icon="image" label="Mídia da comunidade" sub={`${mediaItems.length} arquivo${mediaItems.length === 1 ? '' : 's'} nas publicações`} onPress={() => setMediaOpen(true)} />
          ) : null}
          <Row
            icon="send"
            label="Convidar pessoas"
            sub="Compartilhe a comunidade fora do OnyLink"
            onPress={() => void Share.share({ message: `Participe da comunidade "${g.name}" no OnyLink — ${g.description ?? 'networking de negócios de verdade.'}` })}
          />

          {/* membros inline — SETA indica ações; toque abre o sheet flutuante */}
          {g.joined ? (
            <View className="pt-2">
              <Text className="text-ink-500 text-sm font-semibold px-4 pt-3 pb-1">{g.memberCount.toLocaleString('pt-BR')} membros</Text>
              {(members ?? []).slice(0, 8).map((m) => {
                const self = m.id === me?.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => (self ? router.push('/(tabs)/profile') : setMemberTarget(m))}
                    style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
                    className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border"
                  >
                    <Avatar name={m.name} uri={m.avatarPath} size="md" />
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-ink-900 font-semibold text-sm shrink" numberOfLines={1}>{self ? 'Você' : m.name}</Text>
                        <UserBadges verified={m.verified} admin={m.admin} size={13} />
                        {m.role === 'ADMIN' ? (
                          <View className="rounded-pill px-2 py-0.5 bg-accent-50">
                            <Text className="text-brand-500 text-[10px] font-bold">{g.createdBy === m.id ? 'DONO' : 'ADMIN'}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="text-ink-400 text-[13px]" numberOfLines={1}>@{m.handle}{m.roleTitle ? ` · ${m.roleTitle}` : ''}</Text>
                    </View>
                    <Icon name="forward" set="light" size={16} color={colors.ink[400]} />
                  </Pressable>
                );
              })}
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
              <Row
                icon="logout"
                label="Sair da comunidade"
                sub={isOwner ? 'Você é o dono — transfira a propriedade primeiro' : undefined}
                danger
                onPress={() => void onLeave()}
              />
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

      {/* membros OU pedidos (modo único — selecionar membro fecha e abre o sheet de ações) */}
      {g ? (
        <MembersSheet
          groupId={g.id}
          mode={membersTab}
          visible={membersOpen}
          onClose={() => setMembersOpen(false)}
          onSelectMember={(m) => { setMembersOpen(false); setTimeout(() => setMemberTarget(m), 250); }}
        />
      ) : null}

      {/* ações do membro (flutuante) */}
      {g ? (
        <MemberActionsSheet
          member={memberTarget}
          group={g}
          onClose={() => setMemberTarget(null)}
          onPromote={(uid) => promote.mutate(uid, { onSuccess: () => toast.success('Agora é admin da comunidade.') })}
          onTransfer={(uid, name) => void onTransfer(uid, name)}
          onRemove={(uid) => void onRemove(uid)}
        />
      ) : null}

      {/* mídia da comunidade */}
      <BottomSheet visible={mediaOpen} onClose={() => setMediaOpen(false)} fullHeight>
        <View className="flex-1">
          <SheetHeader title="Mídia da comunidade" />
          {mediaItems.length ? (
            <SheetScrollView className="flex-1">
              <View className="flex-row flex-wrap">
                {/* tamanho da célula em style ESTÁTICO num View externo (§13) — no retorno de
                    style-função do Pressable o NativeWind derrubava pra 0×0 e a grade sumia
                    (a row dizia "1 arquivo" e o sheet parecia vazio). Fundo muted garante
                    célula visível mesmo com thumbnail de vídeo ainda processando na Bunny. */}
                {mediaItems.map((m, i) => (
                  <View key={m.key} style={{ width: cell, height: cell, marginLeft: i % 3 === 0 ? 0 : 2, marginBottom: 2 }} className="bg-surface-muted">
                    <Pressable
                      onPress={() => { setMediaOpen(false); router.push({ pathname: '/post/[id]', params: { id: m.postId } }); }}
                      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
                      className="flex-1"
                    >
                      {m.uri ? <Image source={{ uri: m.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                      {m.type === 'VIDEO' ? (
                        <View style={{ position: 'absolute', top: 6, right: 6 }}>
                          <Icon name="play" size={14} color="#FFFFFF" />
                        </View>
                      ) : null}
                    </Pressable>
                  </View>
                ))}
              </View>
            </SheetScrollView>
          ) : (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-ink-500 text-center">Nenhuma mídia nas publicações ainda.</Text>
            </View>
          )}
        </View>
      </BottomSheet>

      {/* buscar nas publicações da comunidade */}
      <BottomSheet visible={searchOpen} onClose={() => { setSearchOpen(false); setSearchQ(''); }} fullHeight>
        <View className="flex-1">
          <SheetHeader title="Buscar na comunidade" />
          <View className="px-4 py-3">
            <TextInput
              value={searchQ}
              onChangeText={setSearchQ}
              placeholder="Buscar por texto ou autor…"
              placeholderTextColor={colors.ink[400]}
              autoFocus
              className="h-11 rounded-input px-4 bg-surface-muted text-ink-900 border border-surface-border"
            />
          </View>
          <SheetScrollView className="flex-1" keyboardShouldPersistTaps="handled">
            {searchResults.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => { setSearchOpen(false); setSearchQ(''); router.push({ pathname: '/post/[id]', params: { id: p.id } }); }}
                style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
                className="px-4 py-3 border-b border-surface-border gap-0.5"
              >
                <View className="flex-row items-center gap-2">
                  <Text className="text-ink-900 font-semibold text-sm" numberOfLines={1}>{p.authorName}</Text>
                  <Text className="text-ink-400 text-xs">· {timeAgo(p.createdAt)}</Text>
                </View>
                <Text className="text-ink-700 leading-5" numberOfLines={2}>{p.content?.trim() || `#${p.category}`}</Text>
              </Pressable>
            ))}
            {searchQ.trim() && !searchResults.length ? (
              <Text className="text-ink-500 text-center py-10">Nada encontrado nas publicações.</Text>
            ) : null}
          </SheetScrollView>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
