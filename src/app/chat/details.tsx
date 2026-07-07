import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar } from '../../components/Avatar';
import { BottomSheet, SheetHeader, SheetScrollView } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { Checkbox } from '../../components/Checkbox';
import { EmptyState } from '../../components/EmptyState';
import { Icon, type IconName } from '../../components/Icon';
import { MemberActionsSheet } from '../../components/community/MemberActionsSheet';
import { useDialog } from '../../components/feedback/dialog';
import { useToast } from '../../components/feedback/toast';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { pickImages, uploadImage } from '../../lib/media';
import { useAuth } from '../../store/auth';
import { useChatContacts, useChatModeration, useConversation, useTogglePinConversation, useUpdateChatGroup, type ChatContact } from '../../features/messages/hooks';
import { conversationPhoto, conversationTitle } from '../../features/messages/types';
import type { ChatMember } from '../../features/messages/types';

function ActionSquare({ icon, label, active, onPress }: { icon: IconName; label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-1 items-center gap-1.5 py-3 rounded-2xl bg-surface-muted border border-surface-border">
      <Icon name={icon} set={active ? 'bold' : 'light'} size={22} color={colors.brand[500]} />
      <Text className="text-ink-700 text-xs font-semibold" numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

/**
 * DADOS da conversa (Fase B) — MESMO padrão WhatsApp dos dados da comunidade:
 * identidade, squares, participantes com sheet de ações, sair com confirmação
 * (dono não sai sem transferir).
 */
export default function ChatDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const dialog = useDialog();
  const me = useAuth((s) => s.user);
  const insets = useSafeAreaInsets();
  const { data: conv, isLoading } = useConversation(id);
  const { addMembers, remove, promote, transfer } = useChatModeration(id);
  const update = useUpdateChatGroup(id);
  const togglePin = useTogglePinConversation();

  const isAdmin = conv?.myRole === 'ADMIN';
  const isOwner = !!conv?.createdBy && conv.createdBy === me?.id;
  const ownerName = useMemo(() => conv?.members.find((m) => m.id === conv.createdBy)?.name ?? null, [conv]);

  const [memberTarget, setMemberTarget] = useState<ChatMember | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // adicionar participantes — SÓ contatos (sigo/me seguem); filtro local
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<ChatContact[]>([]);
  const { data: contacts } = useChatContacts();
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const candidates = (contacts ?? [])
    .filter((u) => !conv?.members.some((m) => m.id === u.id))
    .filter((u) => {
      const t = norm(q.trim());
      return !t || norm(u.name).includes(t) || norm(u.handle).includes(t.replace(/^@/, ''));
    });

  // edição (admin)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  async function onLeave() {
    if (!conv) return;
    if (isOwner) {
      toast.error('Você é o dono. Transfira a propriedade para outro admin antes de sair.');
      return;
    }
    const ok = await dialog.confirm({
      title: 'Sair do grupo?',
      message: `Você deixará de receber as mensagens de ${conversationTitle(conv)}.`,
      confirmText: 'Sair',
      cancelText: 'Cancelar',
      destructive: true,
    });
    if (ok && me) remove.mutate(me.id, {
      onSuccess: () => { router.back(); router.back(); },
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Não foi possível sair.'),
    });
  }

  async function onTransfer(targetId: string, targetName: string) {
    const ok = await dialog.confirm({
      title: 'Transferir propriedade?',
      message: `${targetName} vira o dono do grupo. Você continua como admin.`,
      confirmText: 'Transferir',
      cancelText: 'Cancelar',
      destructive: true,
    });
    if (ok) transfer.mutate(targetId, { onSuccess: () => toast.success('Propriedade transferida.') });
  }

  async function onRemove(targetId: string) {
    const ok = await dialog.confirm({
      title: 'Remover do grupo?',
      message: 'A pessoa deixa de ver e mandar mensagens neste grupo.',
      confirmText: 'Remover',
      cancelText: 'Cancelar',
      destructive: true,
    });
    if (ok) remove.mutate(targetId, {
      onSuccess: () => toast.success('Participante removido.'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Não foi possível remover.'),
    });
  }

  function submitAdd() {
    if (!selected.length) return;
    addMembers.mutate(selected.map((u) => u.id), {
      onSuccess: () => { toast.success('Participantes adicionados.'); setAddOpen(false); setSelected([]); setQ(''); },
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Não foi possível adicionar.'),
    });
  }

  async function pickPhoto() {
    try {
      setUploading(true);
      const [uri] = await pickImages(1);
      if (!uri) return;
      const up = await uploadImage(uri, 'chatGroupPhoto');
      update.mutate({ photoPath: up.url }, { onSuccess: () => toast.success('Foto atualizada.') });
    } catch {
      toast.error('Não foi possível subir a foto.');
    } finally {
      setUploading(false);
    }
  }

  function submitEdit() {
    const input: { name?: string; description?: string } = {};
    if (name.trim().length >= 2) input.name = name.trim();
    if (description.trim()) input.description = description.trim();
    if (!input.name && !input.description) { setEditOpen(false); return; }
    update.mutate(input, {
      onSuccess: () => { toast.success('Grupo atualizado.'); setEditOpen(false); },
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Não foi possível salvar.'),
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border">
        <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP}>
          <Icon name="back" size={24} color={colors.ink[900]} />
        </Pressable>
        <Text className="text-ink-900 font-semibold text-base flex-1" numberOfLines={1}>
          {conv?.isGroup ? 'Dados do grupo' : 'Dados da conversa'}
        </Text>
      </View>

      {isLoading || !conv ? (
        <View className="flex-1 items-center justify-center">
          {isLoading ? <ActivityIndicator color={colors.brand[500]} /> : <EmptyState icon="chat" title="Conversa não encontrada" />}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          {/* identidade */}
          <View className="items-center gap-2 px-4 pt-6 pb-4">
            {conversationPhoto(conv) ? (
              <Image source={{ uri: conversationPhoto(conv)! }} style={{ width: 96, height: 96, borderRadius: 48 }} contentFit="cover" />
            ) : (
              <Avatar name={conversationTitle(conv)} size="xxl" />
            )}
            <Text className="text-ink-900 font-extrabold text-xl text-center">{conversationTitle(conv)}</Text>
            <Text className="text-ink-500 text-sm">
              {conv.isGroup
                ? `Grupo · ${conv.memberCount.toLocaleString('pt-BR')} participantes`
                : conv.peerHandle ? `@${conv.peerHandle}` : 'Conversa'}
            </Text>
            {conv.isGroup && conv.description ? (
              <Text className="text-ink-700 leading-5 text-center px-2">{conv.description}</Text>
            ) : null}
          </View>

          {/* squares */}
          <View className="flex-row gap-2.5 px-4 pb-5">
            {!conv.isGroup && conv.peerId ? (
              <ActionSquare icon="user" label="Perfil" onPress={() => router.push({ pathname: '/user/[id]', params: { id: conv.peerId! } })} />
            ) : null}
            <ActionSquare
              icon="bookmark"
              label={conv.pinned ? 'Fixado' : 'Fixar'}
              active={conv.pinned}
              onPress={() => togglePin.mutate({ id: conv.id, pinned: conv.pinned }, { onError: (e) => toast.error(e instanceof Error ? e.message : 'Não foi possível fixar.') })}
            />
            {conv.isGroup && isAdmin ? (
              <ActionSquare icon="plus" label="Adicionar" onPress={() => setAddOpen(true)} />
            ) : null}
            {conv.isGroup && isAdmin ? (
              <ActionSquare icon="edit" label="Editar" onPress={() => { setName(conv.name ?? ''); setDescription(conv.description ?? ''); setEditOpen(true); }} />
            ) : null}
          </View>

          {/* participantes (grupo) — mesmo padrão da comunidade: seta → sheet de ações */}
          {conv.isGroup ? (
            <View>
              <Text className="text-ink-500 text-sm font-semibold px-4 pt-3 pb-1">
                {conv.memberCount.toLocaleString('pt-BR')} participantes
              </Text>
              {conv.members.map((m) => {
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
                        <Text className="text-ink-900 font-semibold text-sm" numberOfLines={1}>{self ? 'Você' : m.name}</Text>
                        {m.role === 'ADMIN' ? (
                          <View className="rounded-pill px-2 py-0.5 bg-accent-50">
                            <Text className="text-brand-500 text-[10px] font-bold">{conv.createdBy === m.id ? 'DONO' : 'ADMIN'}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="text-ink-400 text-[13px]" numberOfLines={1}>@{m.handle}{m.roleTitle ? ` · ${m.roleTitle}` : ''}</Text>
                    </View>
                    <Icon name="forward" set="light" size={16} color={colors.ink[400]} />
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* zona de saída */}
          {conv.isGroup ? (
            <View className="pt-4">
              <Pressable onPress={() => void onLeave()} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-row items-center gap-3 px-4 py-4 border-b border-surface-border">
                <Icon name="logout" set="light" size={22} color={colors.danger} />
                <View className="flex-1">
                  <Text className="text-danger font-semibold text-[15px]">Sair do grupo</Text>
                  {isOwner ? <Text className="text-ink-500 text-[13px]">Você é o dono — transfira a propriedade primeiro</Text> : null}
                </View>
              </Pressable>
            </View>
          ) : null}

          {/* rodapé */}
          {conv.isGroup && ownerName ? (
            <View className="px-4 pt-5">
              <Text className="text-ink-400 text-xs">Criado por {ownerName}</Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* ações sobre um participante (mesmo sheet da comunidade) */}
      {conv ? (
        <MemberActionsSheet
          member={memberTarget}
          group={{ myRole: conv.myRole, createdBy: conv.createdBy }}
          onClose={() => setMemberTarget(null)}
          onPromote={(uid) => promote.mutate(uid, { onSuccess: () => toast.success('Agora é admin do grupo.') })}
          onTransfer={(uid, n) => void onTransfer(uid, n)}
          onRemove={(uid) => void onRemove(uid)}
        />
      ) : null}

      {/* adicionar participantes (admin) */}
      <BottomSheet visible={addOpen} onClose={() => setAddOpen(false)} fullHeight>
        <View className="flex-1">
          <SheetHeader title="Adicionar participantes" />
          <View className="px-4 py-3">
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Filtrar por nome ou @usuário…"
              placeholderTextColor={colors.ink[400]}
              className="h-11 rounded-input px-4 bg-surface-muted text-ink-900 border border-surface-border"
            />
          </View>
          {/* selecionados — fileira de avatares com × (mesmo padrão do criar grupo);
              paddingTop dá respiro pro × que sobressai do avatar (senão corta) */}
          {selected.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ gap: 14, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 }}>
              {selected.map((u) => (
                <View key={u.id} className="items-center" style={{ width: 56 }}>
                  <View>
                    <Avatar name={u.name} uri={u.avatarPath} size="lg" />
                    <Pressable onPress={() => setSelected((s) => s.filter((x) => x.id !== u.id))} hitSlop={8} className="absolute -right-1.5 -top-1.5 w-5 h-5 rounded-full bg-brand-500 border-2 border-surface items-center justify-center">
                      <Icon name="close" size={10} color="#FFFFFF" />
                    </Pressable>
                  </View>
                  <Text numberOfLines={1} className="text-ink-700 text-[11px] mt-1">{u.name.split(' ')[0]}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}
          <SheetScrollView className="flex-1" keyboardShouldPersistTaps="handled">
            {!candidates.length ? (
              <Text className="text-ink-500 text-sm text-center py-8">
                {q.trim() ? 'Ninguém na sua rede com esse nome.' : 'Todo mundo da sua rede já está no grupo.'}
              </Text>
            ) : null}
            {candidates.map((u) => {
              const on = selected.some((x) => x.id === u.id);
              return (
                <Pressable key={u.id} onPress={() => setSelected((s) => (on ? s.filter((x) => x.id !== u.id) : [...s, u]))} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border">
                  <Avatar name={u.name} uri={u.avatarPath} size="md" />
                  <View className="flex-1">
                    <Text className="text-ink-900 font-semibold text-sm" numberOfLines={1}>{u.name}</Text>
                    <Text className="text-ink-400 text-[13px]" numberOfLines={1}>@{u.handle}</Text>
                  </View>
                  <Checkbox checked={on} />
                </Pressable>
              );
            })}
          </SheetScrollView>
          <View className="px-4 py-3">
            <Button title={selected.length ? `Adicionar (${selected.length})` : 'Adicionar'} variant="accent" onPress={submitAdd} disabled={!selected.length} loading={addMembers.isPending} />
          </View>
        </View>
      </BottomSheet>

      {/* editar grupo (admin) */}
      <BottomSheet visible={editOpen} onClose={() => setEditOpen(false)}>
        <View className="pb-3">
          <SheetHeader title="Editar grupo" />
          <View className="px-4 pt-4 gap-3">
            <Pressable onPress={() => void pickPhoto()} disabled={uploading} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="self-center">
              <View className="w-20 h-20 rounded-full bg-surface-muted border border-surface-border items-center justify-center overflow-hidden">
                {conv?.photoPath ? (
                  <Image source={{ uri: conv.photoPath }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : uploading ? (
                  <ActivityIndicator color={colors.brand[500]} />
                ) : (
                  <Icon name="camera" set="light" size={26} color={colors.ink[500]} />
                )}
              </View>
            </Pressable>
            <TextInput value={name} onChangeText={setName} placeholder="Nome do grupo" placeholderTextColor={colors.ink[400]} maxLength={80} className="h-11 rounded-input px-4 bg-surface-muted text-ink-900 border border-surface-border" />
            <TextInput value={description} onChangeText={setDescription} placeholder="Descrição (opcional)" placeholderTextColor={colors.ink[400]} maxLength={300} multiline className="min-h-[72px] rounded-input px-4 py-3 bg-surface-muted text-ink-900 border border-surface-border" />
            <Button title="Salvar" variant="accent" onPress={submitEdit} loading={update.isPending} />
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
