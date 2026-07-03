import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toFeedPost, type FeedPost, type RawFeedRow } from '../feed/types';

export interface SearchUser {
  id: string;
  name: string;
  handle: string;
  avatarPath: string | null;
  roleTitle: string | null;
  segment: string | null;
  city: string | null;
  followed: boolean;
}
interface RawSearchUser {
  id: string;
  name: string;
  handle: string;
  avatar_path: string | null;
  role_title: string | null;
  segment: string | null;
  city: string | null;
  followed: boolean;
}
const toSearchUser = (r: RawSearchUser): SearchUser => ({
  id: r.id, name: r.name, handle: r.handle, avatarPath: r.avatar_path,
  roleTitle: r.role_title, segment: r.segment, city: r.city, followed: r.followed,
});

/** Busca usuários (nome/@/segmento/cidade). Backend: GET /web/users/search. */
export function useSearchUsers(q: string) {
  return useQuery({
    queryKey: ['search-users', q],
    enabled: q.trim().length > 0,
    queryFn: async (): Promise<SearchUser[]> => {
      const rows = await api.get<RawSearchUser[]>(`/web/users/search?q=${encodeURIComponent(q)}&limit=20`);
      return (rows ?? []).map(toSearchUser);
    },
  });
}

/** Busca posts por conteúdo. Backend: GET /web/posts/search. */
export function useSearchPosts(q: string) {
  return useQuery({
    queryKey: ['search-posts', q],
    enabled: q.trim().length > 0,
    queryFn: async (): Promise<FeedPost[]> => {
      const { items } = await api.get<{ items: RawFeedRow[] }>(`/web/posts/search?q=${encodeURIComponent(q)}`);
      return (items ?? []).map(toFeedPost);
    },
  });
}

/** Seguir/deixar de seguir (otimista). Backend: POST/DELETE /web/connections/follow/:id. */
export function useFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, following }: { userId: string; following: boolean }) =>
      following ? api.delete(`/web/connections/follow/${userId}`) : api.post(`/web/connections/follow/${userId}`),
    onMutate: async ({ userId, following }) => {
      const prev = qc.getQueriesData<SearchUser[]>({ queryKey: ['search-users'] });
      qc.setQueriesData<SearchUser[]>({ queryKey: ['search-users'] }, (old) =>
        (old ?? []).map((u) => (u.id === userId ? { ...u, followed: !following } : u)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      ctx?.prev?.forEach(([k, d]) => qc.setQueryData(k, d));
    },
  });
}
