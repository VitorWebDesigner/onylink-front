import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { config } from '../../lib/config';
import { mockComments } from '../../lib/mock';
import { patchPostCaches } from '../feed/postCaches';
import type { Comment } from './types';

const key = (postId: string) => ['comments', postId];

interface RawCommentRow {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  parent_id: string | null;
  like_count: number;
  insight_count: number;
  reply_count: number;
  repost_count: number;
  share_count: number;
  liked: boolean;
  insighted: boolean;
  reposted: boolean;
  shared: boolean;
}

const toComment = (postId: string, r: RawCommentRow): Comment => ({
  id: r.id,
  postId,
  authorId: r.author_id,
  authorName: r.author_name,
  authorAvatar: r.author_avatar ?? null,
  authorRoleTitle: null,
  content: r.content,
  createdAt: r.created_at,
  parentId: r.parent_id ?? null,
  likeCount: r.like_count ?? 0,
  insightCount: r.insight_count ?? 0,
  replyCount: r.reply_count ?? 0,
  repostCount: r.repost_count ?? 0,
  shareCount: r.share_count ?? 0,
  liked: Boolean(r.liked),
  insighted: Boolean(r.insighted),
  reposted: Boolean(r.reposted),
  shared: Boolean(r.shared),
});

/** Comentários de um post (chapado, com threading). Backend: GET /web/posts/:id/comments.
 *  TEMPO REAL: refetch a cada 10s (comentários de OUTROS aparecem sozinhos);
 *  pausa enquanto há mutação otimista em voo. */
export function useComments(postId: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: key(postId),
    refetchInterval: () => (qc.isMutating() ? false : 10_000),
    queryFn: async (): Promise<Comment[]> => {
      if (config.mock.comments) return mockComments[postId] ?? [];
      const { items } = await api.get<{ items: RawCommentRow[] }>(`/web/posts/${postId}/comments`);
      return items.map((r) => toComment(postId, r));
    },
  });
}

/** Adiciona comentário OU resposta (parentId) com atualização otimista. */
export function useAddComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (config.mock.comments) return;
      return api.post(`/web/posts/${postId}/comments`, { content, parentId });
    },
    onMutate: async ({ content, parentId }) => {
      await qc.cancelQueries({ queryKey: key(postId) });
      const prev = qc.getQueryData<Comment[]>(key(postId));
      const optimistic: Comment = {
        id: `local-${Date.now()}`,
        postId,
        authorName: 'Você',
        authorAvatar: null,
        authorRoleTitle: null,
        content,
        createdAt: new Date().toISOString(),
        parentId: parentId ?? null,
        likeCount: 0,
        insightCount: 0,
        replyCount: 0,
        repostCount: 0,
        shareCount: 0,
        liked: false,
        insighted: false,
        reposted: false,
        shared: false,
      };
      qc.setQueryData<Comment[]>(key(postId), (old) => {
        const next = [...(old ?? []), optimistic];
        // resposta → soma reply_count do pai
        return parentId ? next.map((c) => (c.id === parentId ? { ...c, replyCount: c.replyCount + 1 } : c)) : next;
      });
      // contador de comentários sobe em TODAS as listas + detalhe (não só no feed geral)
      patchPostCaches(qc, postId, (p) => ({ ...p, commentCount: p.commentCount + 1 }));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key(postId), ctx.prev);
      patchPostCaches(qc, postId, (p) => ({ ...p, commentCount: Math.max(0, p.commentCount - 1) }));
    },
    onSettled: () => {
      if (!config.mock.comments) qc.invalidateQueries({ queryKey: key(postId) });
    },
  });
}

export type CommentReactionKind = 'like' | 'insight' | 'repost' | 'share';

/** Aplica o toggle de uma reação a um comentário no objeto (contador + flag). */
export function applyCommentReaction<T extends Comment | { likeCount: number; insightCount: number; repostCount: number; shareCount: number; liked: boolean; insighted: boolean; reposted: boolean; shared: boolean }>(
  c: T, kind: CommentReactionKind, active: boolean,
): T {
  const d = active ? -1 : 1;
  switch (kind) {
    case 'like': return { ...c, liked: !active, likeCount: c.likeCount + d };
    case 'insight': return { ...c, insighted: !active, insightCount: c.insightCount + d };
    case 'repost': return { ...c, reposted: !active, repostCount: c.repostCount + d };
    case 'share': return { ...c, shared: !active, shareCount: c.shareCount + d };
  }
}

/** Toggle de reação (curtir/insight/repost/enviar) em comentário, otimista no cache da lista. */
function useCommentReaction(postId: string, kind: CommentReactionKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, active }: { commentId: string; active: boolean }) => {
      if (config.mock.comments) return;
      const url = `/web/posts/comments/${commentId}/${kind}`;
      return active ? api.delete(url) : api.post(url);
    },
    onMutate: async ({ commentId, active }) => {
      await qc.cancelQueries({ queryKey: key(postId) });
      const prev = qc.getQueryData<Comment[]>(key(postId));
      qc.setQueryData<Comment[]>(key(postId), (old) =>
        (old ?? []).map((c) => (c.id === commentId ? applyCommentReaction(c, kind, active) : c)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key(postId), ctx.prev);
    },
    // sem invalidate: otimista já reflete o estado → sem flicker
  });
}

export const useToggleCommentLike = (postId: string) => useCommentReaction(postId, 'like');
export const useToggleCommentInsight = (postId: string) => useCommentReaction(postId, 'insight');
export const useToggleCommentRepost = (postId: string) => useCommentReaction(postId, 'repost');
export const useToggleCommentShare = (postId: string) => useCommentReaction(postId, 'share');
