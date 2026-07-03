import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { config } from '../../lib/config';
import { mockGroups, mockGroupPosts } from '../../lib/mock';
import { toFeedPost, type FeedPost, type RawFeedRow } from '../feed/types';
import { toGroup, type Group, type RawGroupRow } from './types';

/** Lista de grupos. `mine` → só os que sou membro. Backend: GET /web/groups. */
export function useGroups(opts?: { mine?: boolean }) {
  const mine = !!opts?.mine;
  return useQuery({
    queryKey: ['groups', mine ? 'mine' : 'all'],
    queryFn: async (): Promise<Group[]> => {
      if (config.mock.groups) return mine ? mockGroups.filter((g) => g.joined) : mockGroups;
      const rows = await api.get<RawGroupRow[]>(`/web/groups${mine ? '?mine=1' : ''}`);
      return (rows ?? []).map(toGroup);
    },
  });
}

/** Um grupo por id (ou slug). Backend: GET /web/groups/:idOuSlug. */
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

/** Publicações do grupo — mesmo formato do feed (PostCard direto).
 *  Backend: GET /web/posts?groupId=... */
export function useGroupPosts(groupId: string) {
  return useQuery({
    queryKey: ['group-posts', groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<FeedPost[]> => {
      if (config.mock.groups) return mockGroupPosts[groupId] ?? [];
      const { items } = await api.get<{ items: RawFeedRow[] }>(`/web/posts?groupId=${groupId}&cursor=0&limit=30`);
      return items.map(toFeedPost);
    },
  });
}

/** Entra/sai do grupo (otimista). Backend: POST /web/groups/:id/join | /:id/leave. */
export function useToggleJoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, joined }: { id: string; joined: boolean }) => {
      if (config.mock.groups) return;
      return joined ? api.post(`/web/groups/${id}/leave`) : api.post(`/web/groups/${id}/join`);
    },
    onMutate: async ({ id, joined }) => {
      await qc.cancelQueries({ queryKey: ['groups'] });
      const patch = (g: Group) => (g.id === id ? { ...g, joined: !joined, memberCount: Math.max(0, g.memberCount + (joined ? -1 : 1)) } : g);
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
    onSettled: () => {
      if (!config.mock.groups) void qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  segment?: string;
  city?: string;
}

/** Cria grupo (ADMIN ou conta profissional). Backend: POST /web/groups. */
export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateGroupInput): Promise<Group> => {
      const row = await api.post<RawGroupRow>('/web/groups', input);
      return toGroup(row);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
