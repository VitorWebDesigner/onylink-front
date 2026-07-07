import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { config } from '../../lib/config';
import { mockGroups, mockGroupPosts } from '../../lib/mock';
import { toFeedPost, type FeedPost, type RawFeedRow } from '../feed/types';
import { toGroup, type Group, type GroupMember, type JoinRequest, type RawGroupRow } from './types';

/** Lista de comunidades. `mine` → só as que sou membro. Fixadas vêm primeiro.
 *  `poll` → refetch a cada 30s (badges de não visto/pedidos ao vivo). */
export function useGroups(opts?: { mine?: boolean; poll?: boolean }) {
  const mine = !!opts?.mine;
  return useQuery({
    queryKey: ['groups', mine ? 'mine' : 'all'],
    staleTime: 0,
    refetchInterval: opts?.poll ? 30_000 : undefined,
    queryFn: async (): Promise<Group[]> => {
      if (config.mock.groups) return mine ? mockGroups.filter((g) => g.joined) : mockGroups;
      const rows = await api.get<RawGroupRow[]>(`/web/groups${mine ? '?mine=1' : ''}`);
      return (rows ?? []).map(toGroup);
    },
  });
}

// useMessagesBadges mudou para features/messages/hooks.ts (Fase B): soma
// conversas 1:1 + grupos de chat + comunidades.

/** Uma comunidade por id (ou slug). */
export function useGroup(idOrSlug: string) {
  return useQuery({
    queryKey: ['group', idOrSlug],
    enabled: !!idOrSlug,
    staleTime: 0,
    queryFn: async (): Promise<Group | null> => {
      if (config.mock.groups) return mockGroups.find((g) => g.id === idOrSlug) ?? null;
      const row = await api.get<RawGroupRow>(`/web/groups/${idOrSlug}`);
      return row ? toGroup(row) : null;
    },
  });
}

/** Publicações da comunidade (SÓ membros — o back devolve 403 p/ não-membro).
 *  TEMPO REAL: refetch 15s (posts novos de outros membros entram sozinhos —
 *  cobre também Expo Go, que não recebe push); pausa durante mutação otimista.
 *  A FlatList da tela usa maintainVisibleContentPosition → nada pula sob o dedo. */
export function useGroupPosts(groupId: string, enabled = true) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['group-posts', groupId],
    enabled: !!groupId && enabled,
    refetchInterval: () => (qc.isMutating() ? false : 15_000),
    retry: false, // 403 de não-membro não deve re-tentar
    queryFn: async (): Promise<FeedPost[]> => {
      if (config.mock.groups) return mockGroupPosts[groupId] ?? [];
      const { items } = await api.get<{ items: RawFeedRow[] }>(`/web/posts?groupId=${groupId}&cursor=0&limit=30`);
      return items.map(toFeedPost);
    },
  });
}

/**
 * Entrar/sair. Pública entra direto; PRIVADA vira pedido (requested=true) até o
 * admin aprovar. Otimista nos dois casos.
 */
export function useToggleJoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, joined, isPrivate, requested }: { id: string; joined: boolean; isPrivate: boolean; requested: boolean }) => {
      if (config.mock.groups) return;
      if (joined || requested) return api.post(`/web/groups/${id}/leave`); // sair OU cancelar pedido
      return api.post(`/web/groups/${id}/join`);
    },
    onMutate: async ({ id, joined, isPrivate, requested }) => {
      await qc.cancelQueries({ queryKey: ['groups'] });
      const patch = (g: Group): Group => {
        if (g.id !== id) return g;
        if (joined) return { ...g, joined: false, myRole: null, memberCount: Math.max(0, g.memberCount - 1) };
        if (requested) return { ...g, requested: false };
        if (isPrivate) return { ...g, requested: true };
        return { ...g, joined: true, myRole: 'MEMBER', memberCount: g.memberCount + 1 };
      };
      const prevLists = qc.getQueriesData<Group[]>({ queryKey: ['groups'] });
      qc.setQueriesData<Group[]>({ queryKey: ['groups'] }, (old) => old?.map(patch));
      const prevOne = qc.getQueryData<Group>(['group', id]);
      if (prevOne) qc.setQueryData(['group', id], patch(prevOne));
      return { prevLists, prevOne };
    },
    onError: (_e, v, ctx) => {
      ctx?.prevLists?.forEach(([k, d]) => qc.setQueryData(k, d));
      if (ctx?.prevOne) qc.setQueryData(['group', v.id], ctx.prevOne);
    },
    onSettled: (_d, _e, v) => {
      if (config.mock.groups) return;
      void qc.invalidateQueries({ queryKey: ['groups'] });
      void qc.invalidateQueries({ queryKey: ['group', v.id] });
    },
  });
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  segment?: string;
  city?: string;
  coverPath?: string;
  isPrivate?: boolean;
}

/** Cria comunidade (ADMIN ou conta profissional). Criador entra como admin. */
export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateGroupInput): Promise<Group> => {
      const row = await api.post<RawGroupRow>('/web/groups', input);
      return toGroup(row);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export interface UpdateGroupInput {
  name?: string;
  description?: string;
  segment?: string;
  city?: string;
  coverPath?: string;
  isPrivate?: boolean;
}

/** Edita a comunidade (só admin). */
export function useUpdateGroup(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateGroupInput) => api.patch(`/web/groups/${id}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['group', id] });
      void qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

/** Membros da comunidade. */
export function useGroupMembers(id: string, enabled = true) {
  return useQuery({
    queryKey: ['group-members', id],
    enabled: !!id && enabled && !config.mock.groups,
    staleTime: 0,
    queryFn: async (): Promise<GroupMember[]> => {
      const rows = await api.get<{ id: string; name: string; handle: string; avatar_path: string | null; role_title: string | null; role: string; followed: boolean; verified?: boolean; is_admin?: boolean }[]>(`/web/groups/${id}/members?limit=200`);
      return (rows ?? []).map((r) => ({ id: r.id, name: r.name, handle: r.handle, avatarPath: r.avatar_path, roleTitle: r.role_title, role: r.role, followed: Boolean(r.followed), verified: Boolean(r.verified), admin: Boolean(r.is_admin) }));
    },
  });
}

/** Pedidos pendentes (privada — só admin). */
export function useJoinRequests(id: string, enabled = true) {
  return useQuery({
    queryKey: ['group-requests', id],
    enabled: !!id && enabled && !config.mock.groups,
    staleTime: 0,
    queryFn: async (): Promise<JoinRequest[]> => {
      const rows = await api.get<{ id: string; name: string; handle: string; avatar_path: string | null; role_title: string | null }[]>(`/web/groups/${id}/requests`);
      return (rows ?? []).map((r) => ({ id: r.id, name: r.name, handle: r.handle, avatarPath: r.avatar_path, roleTitle: r.role_title }));
    },
  });
}

/** Aprova/recusa pedido; remove membro (admin). */
export function useModerateMembers(id: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['group-requests', id] });
    void qc.invalidateQueries({ queryKey: ['group-members', id] });
    void qc.invalidateQueries({ queryKey: ['group', id] });
  };
  const approve = useMutation({
    mutationFn: (userId: string) => api.post(`/web/groups/${id}/requests/${userId}/approve`),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: (userId: string) => api.post(`/web/groups/${id}/requests/${userId}/reject`),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (userId: string) => api.delete(`/web/groups/${id}/members/${userId}`),
    onSuccess: invalidate,
  });
  const promote = useMutation({
    mutationFn: (userId: string) => api.post(`/web/groups/${id}/members/${userId}/promote`),
    onSuccess: invalidate,
  });
  const transfer = useMutation({
    mutationFn: (userId: string) => api.post(`/web/groups/${id}/members/${userId}/transfer`),
    onSuccess: invalidate,
  });
  return { approve, reject, remove, promote, transfer };
}

/** Reposta/remove post da comunidade NO FEED GERAL (admin). */
export function useFeaturePost(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, featured }: { postId: string; featured: boolean }) =>
      featured ? api.delete(`/web/groups/${groupId}/feature/${postId}`) : api.post(`/web/groups/${groupId}/feature/${postId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['group-posts', groupId] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

/** Fixa/desafixa a comunidade (máx. 5 — o back barra o excesso). */
export function useTogglePinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      pinned ? api.delete(`/web/groups/${id}/pin`) : api.post(`/web/groups/${id}/pin`),
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['groups'] });
      void qc.invalidateQueries({ queryKey: ['group', v.id] });
    },
  });
}
