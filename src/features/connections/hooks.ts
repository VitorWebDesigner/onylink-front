import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { config } from '../../lib/config';
import { patchAuthorCaches } from '../feed/hooks';

export interface SuggestUser {
  id: string;
  name: string;
  handle: string;
  avatarPath: string | null;
  roleTitle: string | null;
  segment: string | null;
  city: string | null;
}
interface RawSuggest {
  id: string;
  name: string;
  handle: string;
  avatar_path: string | null;
  role_title: string | null;
  segment: string | null;
  city: string | null;
}
const toSuggest = (r: RawSuggest): SuggestUser => ({
  id: r.id, name: r.name, handle: r.handle, avatarPath: r.avatar_path,
  roleTitle: r.role_title, segment: r.segment, city: r.city,
});

/** Pessoas com algo em comum com o usuário-semente (recém-seguido). */
export function useFollowSuggestions(seedId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['follow-suggestions', seedId],
    enabled: enabled && !!seedId && !config.mock.feed,
    queryFn: async (): Promise<SuggestUser[]> => {
      const rows = await api.get<RawSuggest[]>(`/web/connections/suggestions/${seedId}`);
      return (rows ?? []).map(toSuggest);
    },
  });
}

/** Seguir/deixar de seguir direto (cards de sugestão, sheet de membro — sem
 *  abrir o follow-flow). Replica o estado nas MESMAS superfícies do follow do
 *  feed: pílula Seguir de todos os posts do usuário + tela de perfil aberta. */
export function useFollowUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, followed }: { userId: string; followed: boolean }) => {
      if (config.mock.feed) return;
      return followed ? api.delete(`/web/connections/follow/${userId}`) : api.post(`/web/connections/follow/${userId}`);
    },
    onMutate: ({ userId, followed }) => {
      patchAuthorCaches(qc, userId, (p) => ({ ...p, authorFollowed: !followed }));
      const prevUser = qc.getQueryData<{ id: string; followed: boolean; followersCount: number }>(['user', userId]);
      if (prevUser) {
        qc.setQueryData(['user', userId], { ...prevUser, followed: !followed, followersCount: prevUser.followersCount + (followed ? -1 : 1) });
      }
    },
    onError: (_e, v) => {
      void qc.invalidateQueries({ queryKey: ['user', v.userId] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
