import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { config } from '../../lib/config';
import { mockGroups, mockGroupPosts } from '../../lib/mock';
import type { FeedPost } from '../feed/types';
import type { Group } from './types';

/** Lista de grupos/comunidades (prompt.md §5.6). Backend: GET /web/groups. */
export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async (): Promise<Group[]> => {
      if (config.mock.groups) return mockGroups;
      const { items } = await api.get<{ items: Group[] }>('/web/groups');
      return items;
    },
  });
}

/** Um grupo pelo id (lê do cache da lista em modo mock). */
export function useGroup(id: string) {
  const { data } = useGroups();
  return data?.find((g) => g.id === id) ?? null;
}

/** Posts dentro do grupo. Backend: GET /web/groups/:id/posts. */
export function useGroupPosts(id: string) {
  return useQuery({
    queryKey: ['group-posts', id],
    queryFn: async (): Promise<FeedPost[]> => {
      if (config.mock.groups) return mockGroupPosts[id] ?? [];
      const { items } = await api.get<{ items: FeedPost[] }>(`/web/groups/${id}/posts`);
      return items;
    },
  });
}

/** Entra/sai do grupo com atualização otimista. Backend: POST/DELETE /web/groups/:id/membership. */
export function useToggleJoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, joined }: { id: string; joined: boolean }) => {
      if (config.mock.groups) return;
      return joined ? api.delete(`/web/groups/${id}/membership`) : api.post(`/web/groups/${id}/membership`);
    },
    onMutate: async ({ id, joined }) => {
      await qc.cancelQueries({ queryKey: ['groups'] });
      const prev = qc.getQueryData<Group[]>(['groups']);
      qc.setQueryData<Group[]>(['groups'], (old) =>
        (old ?? []).map((g) =>
          g.id === id ? { ...g, joined: !joined, membersCount: g.membersCount + (joined ? -1 : 1) } : g,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['groups'], ctx.prev);
    },
    onSettled: () => {
      if (!config.mock.groups) qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
