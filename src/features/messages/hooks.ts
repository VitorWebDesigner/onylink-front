import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { config } from '../../lib/config';
import { useAuth } from '../../store/auth';
import { useGroups } from '../groups/hooks';
import { toConversation, type ChatMember, type ChatMessage, type Conversation, type RawConversationRow } from './types';

interface RawMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  created_at: string;
}

const toMessage = (r: RawMessageRow): ChatMessage => ({
  id: r.id,
  conversationId: r.conversation_id,
  senderId: r.sender_id,
  senderName: r.sender_name,
  senderAvatar: r.sender_avatar,
  content: r.content,
  createdAt: r.created_at,
});

/** Conversas (1:1 + grupos de chat), fixadas primeiro. Poll 10s (badges/última msg). */
export function useConversations() {
  const qc = useQueryClient();
  const authed = useAuth((s) => s.status === 'authenticated');
  return useQuery({
    queryKey: ['conversations'],
    enabled: authed && !config.mock.groups,
    staleTime: 0,
    refetchInterval: () => (qc.isMutating() ? false : 10_000),
    queryFn: async (): Promise<Conversation[]> => {
      const rows = await api.get<RawConversationRow[]>('/web/messages?limit=50');
      return (rows ?? []).map(toConversation);
    },
  });
}

/** Detalhe da conversa (meta + membros). */
export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversation', id],
    enabled: !!id && !config.mock.groups,
    staleTime: 0,
    queryFn: async (): Promise<Conversation & { members: ChatMember[] }> => {
      const r = await api.get<RawConversationRow & { members: { id: string; name: string; handle: string; avatar_path: string | null; role_title: string | null; role: string; followed: boolean }[] }>(`/web/messages/${id}`);
      return {
        ...toConversation(r),
        members: (r.members ?? []).map((m) => ({ id: m.id, name: m.name, handle: m.handle, avatarPath: m.avatar_path, roleTitle: m.role_title, role: m.role, followed: Boolean(m.followed) })),
      };
    },
  });
}

/** Mensagens da conversa aberta — TEMPO REAL v1 = polling curto (4s, decisão do
 *  plano §3.2). Abrir/poll marca lida no back. Guarda otimista via isMutating. */
export function useMessages(id: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['chat-messages', id],
    enabled: !!id && !config.mock.groups,
    staleTime: 0,
    refetchInterval: () => (qc.isMutating() ? false : 4_000),
    queryFn: async (): Promise<{ items: ChatMessage[]; othersReadAt: string | null }> => {
      const r = await api.get<{ items: RawMessageRow[]; othersReadAt: string | null }>(`/web/messages/${id}/messages?limit=60`);
      // zera o badge desta conversa na lista (o back já marcou lida)
      qc.setQueryData<Conversation[]>(['conversations'], (old) =>
        old?.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)),
      );
      return { items: (r.items ?? []).map(toMessage), othersReadAt: r.othersReadAt ?? null };
    },
  });
}

/** Envia mensagem com bolha otimista (aparece na hora; troca pela real no refetch). */
export function useSendMessage(id: string) {
  const qc = useQueryClient();
  const me = useAuth((s) => s.user);
  return useMutation({
    mutationFn: (content: string) => api.post(`/web/messages/${id}/messages`, { content }),
    onMutate: async (content) => {
      await qc.cancelQueries({ queryKey: ['chat-messages', id] });
      const optimistic: ChatMessage = {
        id: `local-${Date.now()}`,
        conversationId: id,
        senderId: me?.id ?? 'me',
        senderName: me?.name ?? 'Você',
        senderAvatar: null,
        content,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      qc.setQueryData<{ items: ChatMessage[]; othersReadAt: string | null }>(['chat-messages', id], (old) => ({
        items: [optimistic, ...(old?.items ?? [])],
        othersReadAt: old?.othersReadAt ?? null,
      }));
      // lista de conversas: última mensagem + sobe pro topo no próximo refetch
      qc.setQueryData<Conversation[]>(['conversations'], (old) =>
        old?.map((c) => (c.id === id ? { ...c, lastContent: content, lastSenderId: me?.id ?? null, lastCreatedAt: optimistic.createdAt } : c)),
      );
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['chat-messages', id] });
      void qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export interface ChatContact {
  id: string;
  name: string;
  handle: string;
  avatarPath: string | null;
  roleTitle: string | null;
}

/** CONTATOS (sigo OU me seguem) — candidatos a grupo de chat (decisão do dono).
 *  A lista aparece INTEIRA abaixo do campo; a busca filtra localmente. */
export function useChatContacts() {
  return useQuery({
    queryKey: ['chat-contacts'],
    enabled: !config.mock.groups,
    staleTime: 60_000,
    queryFn: async (): Promise<ChatContact[]> => {
      const rows = await api.get<{ id: string; name: string; handle: string; avatar_path: string | null; role_title: string | null }[]>('/web/messages/contacts');
      return (rows ?? []).map((r) => ({ id: r.id, name: r.name, handle: r.handle, avatarPath: r.avatar_path, roleTitle: r.role_title }));
    },
  });
}

/** Abre (ou retorna) a conversa 1:1 com um usuário → devolve a Conversation. */
export function useOpenDm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string): Promise<Conversation> => {
      const r = await api.post<RawConversationRow>(`/web/messages/with/${userId}`);
      return toConversation(r);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

export interface CreateChatGroupInput {
  name: string;
  description?: string;
  photoPath?: string;
  memberIds: string[];
}

/** Cria grupo de chat (criador = dono/admin; máx 150). */
export function useCreateChatGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateChatGroupInput): Promise<Conversation> => {
      const r = await api.post<RawConversationRow>('/web/messages/groups', input);
      return toConversation(r);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

/** Edita grupo (nome/descrição/foto — admin). */
export function useUpdateChatGroup(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; description?: string; photoPath?: string }) =>
      api.patch(`/web/messages/${id}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['conversation', id] });
      void qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/** Moderação do grupo de chat (mesmas regras da comunidade). */
export function useChatModeration(id: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['conversation', id] });
    void qc.invalidateQueries({ queryKey: ['conversations'] });
  };
  const addMembers = useMutation({
    mutationFn: (userIds: string[]) => api.post(`/web/messages/${id}/members`, { userIds }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (userId: string) => api.delete(`/web/messages/${id}/members/${userId}`),
    onSuccess: invalidate,
  });
  const promote = useMutation({
    mutationFn: (userId: string) => api.post(`/web/messages/${id}/members/${userId}/promote`),
    onSuccess: invalidate,
  });
  const transfer = useMutation({
    mutationFn: (userId: string) => api.post(`/web/messages/${id}/members/${userId}/transfer`),
    onSuccess: invalidate,
  });
  return { addMembers, remove, promote, transfer };
}

/** Fixa/desafixa conversa OU grupo (máx 5 por tipo — o back barra o excesso). */
export function useTogglePinConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      pinned ? api.delete(`/web/messages/${id}/pin`) : api.post(`/web/messages/${id}/pin`),
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['conversations'] });
      void qc.invalidateQueries({ queryKey: ['conversation', v.id] });
    },
  });
}

/**
 * Badges da tela Mensagens (e do ícone na tab bar): soma o NÃO VISTO/NÃO
 * RESOLVIDO por aba — Conversas (1:1 não lidas) · Grupos (grupos de chat não
 * lidos) · Comunidades (posts não vistos + pedidos de entrada).
 */
export function useMessagesBadges() {
  const { data: convs } = useConversations();
  const { data: mine } = useGroups({ mine: true, poll: true });
  const chats = (convs ?? []).filter((c) => !c.isGroup).reduce((acc, c) => acc + c.unreadCount, 0);
  const groups = (convs ?? []).filter((c) => c.isGroup).reduce((acc, c) => acc + c.unreadCount, 0);
  const communities = (mine ?? []).reduce((acc, g) => acc + (g.unreadPosts ?? 0) + (g.pendingRequests ?? 0), 0);
  return { chats, groups, communities, total: chats + groups + communities };
}
