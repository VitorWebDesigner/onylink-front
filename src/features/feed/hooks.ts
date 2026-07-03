import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { config } from '../../lib/config';
import { mockFeed } from '../../lib/mock';
import { applyCommentReaction, type CommentReactionKind } from '../comments/hooks';
import { toFeedPost, type FeedPost, type PostCategory, type RawFeedRow } from './types';

interface RawLiveRow {
  id: string;
  like_count: number;
  comment_count: number;
  repost_count: number;
  share_count: number;
  insight_count: number;
  view_count: number;
  top_comment_id: string | null;
  top_comment_content: string | null;
  top_comment_author: string | null;
  top_comment_like_count: number | null;
  top_comment_insight_count: number | null;
  top_comment_repost_count: number | null;
  top_comment_share_count: number | null;
}

/**
 * TEMPO REAL (item 2): busca os contadores atuais dos posts carregados e os
 * funde no cache do feed — assim curtidas/comentários/etc de OUTROS usuários
 * sobem na sua tela enquanto você rola. Só mexe nos CONTADORES (e no comentário
 * em destaque); preserva o SEU estado (liked/insighted/...). Pula a rodada se há
 * mutação otimista em voo, pra não brigar com o seu próprio toque. O AnimatedReaction
 * anima o número quando ele muda.
 */
export async function syncFeedLiveCounts(qc: QueryClient): Promise<void> {
  if (config.mock.feed) return;
  if (qc.isMutating()) return;
  const feed = qc.getQueryData<FeedPost[]>(['feed']);
  if (!feed?.length) return;
  const ids = feed.map((p) => p.id).slice(0, 60).join(',');
  try {
    const rows = (await api.get<RawLiveRow[]>(`/web/posts/live?ids=${ids}`)) ?? [];
    const map = new Map(rows.map((r) => [r.id, r]));
    qc.setQueryData<FeedPost[]>(['feed'], (old) =>
      (old ?? []).map((p) => {
        const r = map.get(p.id);
        if (!r) return p;
        return {
          ...p,
          likeCount: r.like_count,
          commentCount: r.comment_count,
          repostCount: r.repost_count ?? 0,
          shareCount: r.share_count ?? 0,
          insightCount: r.insight_count ?? 0,
          viewCount: r.view_count ?? p.viewCount,
          topComment: r.top_comment_id
            ? {
                id: r.top_comment_id,
                authorName: r.top_comment_author ?? '',
                content: r.top_comment_content ?? '',
                likeCount: r.top_comment_like_count ?? 0,
                insightCount: r.top_comment_insight_count ?? 0,
                repostCount: r.top_comment_repost_count ?? 0,
                shareCount: r.top_comment_share_count ?? 0,
                // live não traz o estado do leitor → preserva o local se for o mesmo comentário
                liked: p.topComment?.id === r.top_comment_id ? p.topComment.liked : false,
                insighted: p.topComment?.id === r.top_comment_id ? p.topComment.insighted : false,
                reposted: p.topComment?.id === r.top_comment_id ? p.topComment.reposted : false,
                shared: p.topComment?.id === r.top_comment_id ? p.topComment.shared : false,
              }
            : null,
        };
      }),
    );
  } catch {
    // silencioso: polling não deve gerar erro visível
  }
}

/** Toggle de reação no comentário-destaque direto do feed (otimista no cache do feed). */
export function useToggleTopCommentReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, kind, active }: { postId: string; commentId: string; kind: CommentReactionKind; active: boolean }) => {
      if (config.mock.feed) return;
      const url = `/web/posts/comments/${commentId}/${kind}`;
      return active ? api.delete(url) : api.post(url);
    },
    onMutate: async ({ postId, commentId, kind, active }) => {
      await qc.cancelQueries({ queryKey: ['feed'] });
      const prev = qc.getQueryData<FeedPost[]>(['feed']);
      qc.setQueryData<FeedPost[]>(['feed'], (old) =>
        (old ?? []).map((p) =>
          p.id === postId && p.topComment && p.topComment.id === commentId
            ? { ...p, topComment: applyCommentReaction(p.topComment, kind, active) }
            : p,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['feed'], ctx.prev);
    },
  });
}

/** Registra uma view do post ao abrir; aplica a contagem devolvida no cache do feed. */
export function useRecordView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string): Promise<{ viewCount: number } | undefined> => {
      if (config.mock.feed) return;
      return api.post<{ viewCount: number }>(`/web/posts/${postId}/view`);
    },
    onSuccess: (data, postId) => {
      if (!data) return;
      qc.setQueryData<FeedPost[]>(['feed'], (old) =>
        (old ?? []).map((p) => (p.id === postId ? { ...p, viewCount: data.viewCount } : p)),
      );
    },
  });
}

/** Inscreve/desinscreve notificações do post (sino do header), otimista no feed. */
export function useTogglePostSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, subscribed }: { postId: string; subscribed: boolean }) => {
      if (config.mock.feed) return;
      return subscribed ? api.delete(`/web/posts/${postId}/subscribe`) : api.post(`/web/posts/${postId}/subscribe`);
    },
    onMutate: async ({ postId, subscribed }) => {
      await qc.cancelQueries({ queryKey: ['feed'] });
      const prev = qc.getQueryData<FeedPost[]>(['feed']);
      qc.setQueryData<FeedPost[]>(['feed'], (old) =>
        (old ?? []).map((p) => (p.id === postId ? { ...p, subscribed: !subscribed } : p)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['feed'], ctx.prev);
    },
  });
}

/** Seguir/deixar de seguir o autor de um post; otimista em TODOS os posts dele no feed. */
export function useToggleFollowAuthor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ authorId, following }: { authorId: string; following: boolean }) => {
      if (config.mock.feed) return;
      return following ? api.delete(`/web/connections/follow/${authorId}`) : api.post(`/web/connections/follow/${authorId}`);
    },
    onMutate: async ({ authorId, following }) => {
      await qc.cancelQueries({ queryKey: ['feed'] });
      const prev = qc.getQueryData<FeedPost[]>(['feed']);
      qc.setQueryData<FeedPost[]>(['feed'], (old) =>
        (old ?? []).map((p) => (p.authorId === authorId ? { ...p, authorFollowed: !following } : p)),
      );
      // reflete também nas LISTAS DE POSTS DE PERFIL abertas (pílula Seguir do card)
      qc.setQueriesData<FeedPost[]>({ queryKey: ['user-posts'] }, (old) =>
        old?.map((p) => (p.authorId === authorId ? { ...p, authorFollowed: !following } : p)),
      );
      // e na tela de perfil do usuário, se aberta
      const prevUser = qc.getQueryData<{ id: string; followed: boolean; followersCount: number }>(['user', authorId]);
      if (prevUser) {
        qc.setQueryData(['user', authorId], { ...prevUser, followed: !following, followersCount: prevUser.followersCount + (following ? -1 : 1) });
      }
      return { prev, prevUser };
    },
    onError: (_e, v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['feed'], ctx.prev);
      if (ctx?.prevUser) qc.setQueryData(['user', v.authorId], ctx.prevUser);
      void qc.invalidateQueries({ queryKey: ['user-posts'] }); // desfaz o otimista das listas de perfil
    },
  });
}

/** Fixa/desafixa um post no PRÓPRIO perfil (1 por usuário; fixar troca o anterior). */
export function usePinPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, pinned }: { postId: string; pinned: boolean }) => {
      if (config.mock.feed) return;
      return pinned ? api.delete(`/web/posts/${postId}/pin`) : api.post(`/web/posts/${postId}/pin`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['user-posts'] }); // reordena (fixado primeiro)
    },
  });
}

/**
 * Lista o feed aprovado. Backend: GET /web/posts?cursor=&limit= (root do módulo),
 * ordenado por relevância (CLAUDE.md §8). Normaliza snake→camel na fronteira.
 * Em modo demo (config.mock.feed) devolve posts de exemplo, sem backend.
 */
export function useFeed() {
  return useQuery({
    queryKey: ['feed'],
    queryFn: async (): Promise<FeedPost[]> => {
      if (config.mock.feed) return mockFeed;
      const { items } = await api.get<{ items: RawFeedRow[]; nextCursor: number | null }>(
        '/web/posts?cursor=0&limit=20',
      );
      return items.map(toFeedPost);
    },
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { content: string; category: PostCategory; groupId?: string; media?: { type: 'IMAGE' | 'VIDEO'; path: string }[] }) => {
      if (config.mock.feed) return { id: 'mock', status: 'PENDING' };
      return api.post<{ id: string; status: string }>('/web/posts', input);
    },
    onSuccess: (_d, vars) => {
      if (config.mock.feed) return;
      void qc.invalidateQueries({ queryKey: ['feed'] });
      if (vars.groupId) void qc.invalidateQueries({ queryKey: ['group-posts', vars.groupId] });
    },
  });
}

/**
 * Curte/descurte um post com atualização otimista (feedback instantâneo).
 * Backend: POST /web/posts/:id/like (curtir) e DELETE (descurtir).
 */
export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (config.mock.feed) return;
      return liked ? api.delete(`/web/posts/${postId}/like`) : api.post(`/web/posts/${postId}/like`);
    },
    onMutate: async ({ postId, liked }) => {
      await qc.cancelQueries({ queryKey: ['feed'] });
      const prev = qc.getQueryData<FeedPost[]>(['feed']);
      qc.setQueryData<FeedPost[]>(['feed'], (old) =>
        (old ?? []).map((p) =>
          p.id === postId ? { ...p, liked: !liked, likeCount: p.likeCount + (liked ? -1 : 1) } : p,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['feed'], ctx.prev);
    },
    // Sem invalidate: o otimista já reflete o estado real → atualização imperceptível.
  });
}

/** Repostar (toggle) otimista. Backend: POST/DELETE /web/posts/:id/repost. */
export function useToggleRepost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, reposted }: { postId: string; reposted: boolean }) => {
      if (config.mock.feed) return;
      return reposted ? api.delete(`/web/posts/${postId}/repost`) : api.post(`/web/posts/${postId}/repost`);
    },
    onMutate: async ({ postId, reposted }) => {
      await qc.cancelQueries({ queryKey: ['feed'] });
      const prev = qc.getQueryData<FeedPost[]>(['feed']);
      qc.setQueryData<FeedPost[]>(['feed'], (old) =>
        (old ?? []).map((p) => (p.id === postId ? { ...p, reposted: !reposted, repostCount: p.repostCount + (reposted ? -1 : 1) } : p)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['feed'], ctx.prev);
    },
  });
}

/** Enviar/compartilhar (toggle) otimista. Backend: POST/DELETE /web/posts/:id/share. */
export function useToggleShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, shared }: { postId: string; shared: boolean }) => {
      if (config.mock.feed) return;
      return shared ? api.delete(`/web/posts/${postId}/share`) : api.post(`/web/posts/${postId}/share`);
    },
    onMutate: async ({ postId, shared }) => {
      await qc.cancelQueries({ queryKey: ['feed'] });
      const prev = qc.getQueryData<FeedPost[]>(['feed']);
      qc.setQueryData<FeedPost[]>(['feed'], (old) =>
        (old ?? []).map((p) => (p.id === postId ? { ...p, shared: !shared, shareCount: p.shareCount + (shared ? -1 : 1) } : p)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['feed'], ctx.prev);
    },
  });
}

/** Insight (toggle) otimista — reação de valor. Backend: POST/DELETE /web/posts/:id/insight. */
export function useToggleInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, insighted }: { postId: string; insighted: boolean }) => {
      if (config.mock.feed) return;
      return insighted ? api.delete(`/web/posts/${postId}/insight`) : api.post(`/web/posts/${postId}/insight`);
    },
    onMutate: async ({ postId, insighted }) => {
      await qc.cancelQueries({ queryKey: ['feed'] });
      const prev = qc.getQueryData<FeedPost[]>(['feed']);
      qc.setQueryData<FeedPost[]>(['feed'], (old) =>
        (old ?? []).map((p) => (p.id === postId ? { ...p, insighted: !insighted, insightCount: p.insightCount + (insighted ? -1 : 1) } : p)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['feed'], ctx.prev);
    },
  });
}
