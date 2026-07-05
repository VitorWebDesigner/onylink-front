import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { config } from '../../lib/config';
import { mockOpportunities } from '../../lib/mock';
import { applyCommentReaction, type CommentReactionKind } from '../comments/hooks';
import { toOpportunity, type ApplicationQuestion, type Opportunity, type OpportunityApplication, type OpportunityComment, type OpportunityKind, type RawOpportunityRow } from './types';

/** Lista oportunidades aprovadas, filtro opcional por tipo. Backend: GET /web/opportunities.
 *  TEMPO REAL: refetch 20s — oportunidades novas e contadores de terceiros
 *  entram sozinhos na aba (regra do dono: nada exige reabrir o app). */
export function useOpportunities(kind?: OpportunityKind | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['opportunities', kind ?? 'all'],
    staleTime: 0,
    refetchInterval: () => (qc.isMutating() ? false : 20_000),
    queryFn: async (): Promise<Opportunity[]> => {
      if (config.mock.opportunities) {
        return kind ? mockOpportunities.filter((o) => o.kind === kind) : mockOpportunities;
      }
      const qs = new URLSearchParams({ limit: '50', offset: '0' });
      if (kind) qs.set('kind', kind);
      const rows = await api.get<RawOpportunityRow[]>(`/web/opportunities?${qs.toString()}`);
      return (rows ?? []).map(toOpportunity);
    },
  });
}

/** Oportunidades publicadas por um usuário (aba do perfil). */
export function useUserOpportunities(id: string, enabled = true) {
  return useQuery({
    queryKey: ['user-opportunities', id],
    enabled: enabled && !!id && !config.mock.opportunities,
    queryFn: async (): Promise<Opportunity[]> => {
      const rows = await api.get<RawOpportunityRow[]>(`/web/users/${id}/opportunities?limit=30&offset=0`);
      return (rows ?? []).map(toOpportunity);
    },
  });
}

/** Uma oportunidade pelo id. Backend: GET /web/opportunities/:id.
 *  TEMPO REAL: refetch 10s (mesmo padrão do detalhe do post) — reações e
 *  contadores de terceiros sobem sozinhos; pausa durante mutação otimista. */
export function useOpportunity(id: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['opportunity', id],
    refetchInterval: () => (qc.isMutating() ? false : 10_000),
    queryFn: async (): Promise<Opportunity | null> => {
      if (config.mock.opportunities) return mockOpportunities.find((o) => o.id === id) ?? null;
      const row = await api.get<RawOpportunityRow>(`/web/opportunities/${id}`);
      return row ? toOpportunity(row) : null;
    },
  });
}

export interface CreateOpportunityInput {
  kind: OpportunityKind;
  title: string;
  description?: string;
  city?: string;
  segment?: string;
  applicationForm?: ApplicationQuestion[];
}

/** Cria oportunidade. Backend: POST /web/opportunities (entra já APROVADA). */
export function useCreateOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOpportunityInput) => {
      if (config.mock.opportunities) return { id: 'mock', ...input };
      return api.post('/web/opportunities', input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunities'] }),
  });
}

/** Curte/descurte com atualização otimista. Backend: POST/DELETE /web/opportunities/:id/like. */
export function useToggleOppLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, liked }: { id: string; liked: boolean }) => {
      if (config.mock.opportunities) return;
      return liked ? api.delete(`/web/opportunities/${id}/like`) : api.post(`/web/opportunities/${id}/like`);
    },
    onMutate: async ({ id, liked }) => {
      await qc.cancelQueries({ queryKey: ['opportunities'] });
      await qc.cancelQueries({ queryKey: ['opportunity', id] });
      const prevLists = qc.getQueriesData<Opportunity[]>({ queryKey: ['opportunities'] });
      const prevOne = qc.getQueryData<Opportunity>(['opportunity', id]);
      const patch = (o: Opportunity) => (o.id === id ? { ...o, liked: !liked, likeCount: o.likeCount + (liked ? -1 : 1) } : o);
      qc.setQueriesData<Opportunity[]>({ queryKey: ['opportunities'] }, (old) => (old ?? []).map(patch));
      if (prevOne) qc.setQueryData<Opportunity>(['opportunity', id], { ...prevOne, liked: !liked, likeCount: prevOne.likeCount + (liked ? -1 : 1) });
      return { prevLists, prevOne };
    },
    onError: (_e, v, ctx) => {
      ctx?.prevLists?.forEach(([key, data]) => qc.setQueryData(key, data));
      if (ctx?.prevOne) qc.setQueryData(['opportunity', v.id], ctx.prevOne);
    },
    onSettled: (_d, _e, v) => {
      if (!config.mock.opportunities) {
        qc.invalidateQueries({ queryKey: ['opportunities'] });
        qc.invalidateQueries({ queryKey: ['opportunity', v.id] });
      }
    },
  });
}

/** Insight (toggle) otimista em oportunidade. Backend: POST/DELETE /web/opportunities/:id/insight. */
export function useToggleOppInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, insighted }: { id: string; insighted: boolean }) => {
      if (config.mock.opportunities) return;
      return insighted ? api.delete(`/web/opportunities/${id}/insight`) : api.post(`/web/opportunities/${id}/insight`);
    },
    onMutate: async ({ id, insighted }) => {
      await qc.cancelQueries({ queryKey: ['opportunities'] });
      await qc.cancelQueries({ queryKey: ['opportunity', id] });
      const prevLists = qc.getQueriesData<Opportunity[]>({ queryKey: ['opportunities'] });
      const prevOne = qc.getQueryData<Opportunity>(['opportunity', id]);
      const patch = (o: Opportunity) => (o.id === id ? { ...o, insighted: !insighted, insightCount: o.insightCount + (insighted ? -1 : 1) } : o);
      qc.setQueriesData<Opportunity[]>({ queryKey: ['opportunities'] }, (old) => (old ?? []).map(patch));
      if (prevOne) qc.setQueryData<Opportunity>(['opportunity', id], { ...prevOne, insighted: !insighted, insightCount: prevOne.insightCount + (insighted ? -1 : 1) });
      return { prevLists, prevOne };
    },
    onError: (_e, v, ctx) => {
      ctx?.prevLists?.forEach(([key, data]) => qc.setQueryData(key, data));
      if (ctx?.prevOne) qc.setQueryData(['opportunity', v.id], ctx.prevOne);
    },
  });
}

/** Registra 1 view ao abrir a oportunidade; aplica a contagem no cache. */
export function useRecordOppView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<{ viewCount: number } | undefined> => {
      if (config.mock.opportunities) return;
      return api.post<{ viewCount: number }>(`/web/opportunities/${id}/view`);
    },
    onSuccess: (data, id) => {
      if (!data) return;
      qc.setQueryData<Opportunity>(['opportunity', id], (o) => (o ? { ...o, viewCount: data.viewCount } : o));
    },
  });
}

/** Inscreve/desinscreve notificações da oportunidade (sino), otimista. */
export function useToggleOppSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, subscribed }: { id: string; subscribed: boolean }) => {
      if (config.mock.opportunities) return;
      return subscribed ? api.delete(`/web/opportunities/${id}/subscribe`) : api.post(`/web/opportunities/${id}/subscribe`);
    },
    onMutate: async ({ id, subscribed }) => {
      await qc.cancelQueries({ queryKey: ['opportunity', id] });
      const prev = qc.getQueryData<Opportunity>(['opportunity', id]);
      if (prev) qc.setQueryData<Opportunity>(['opportunity', id], { ...prev, subscribed: !subscribed });
      return { prev };
    },
    onError: (_e, v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['opportunity', v.id], ctx.prev);
    },
  });
}

const commentsKey = (id: string) => ['opportunity-comments', id];

interface RawOppComment {
  id: string;
  content: string;
  created_at: string;
  author_id?: string;
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
const toOppComment = (r: RawOppComment): OpportunityComment => ({
  id: r.id,
  authorId: r.author_id ?? null,
  authorName: r.author_name,
  authorAvatar: r.author_avatar ?? null,
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

/** Comentários de uma oportunidade (threading). Backend: GET /web/opportunities/:id/comments. */
export function useOppComments(id: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: commentsKey(id),
    // TEMPO REAL: comentários de terceiros aparecem sozinhos (padrão do post)
    refetchInterval: () => (qc.isMutating() ? false : 10_000),
    queryFn: async (): Promise<OpportunityComment[]> => {
      if (config.mock.opportunities) return [];
      const rows = await api.get<RawOppComment[]>(`/web/opportunities/${id}/comments`);
      return (rows ?? []).map(toOppComment);
    },
  });
}

/** Adiciona comentário OU resposta (parentId), otimista. POST /web/opportunities/:id/comments. */
export function useAddOppComment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (config.mock.opportunities) return;
      return api.post(`/web/opportunities/${id}/comments`, { content, parentId });
    },
    onMutate: async ({ content, parentId }) => {
      await qc.cancelQueries({ queryKey: commentsKey(id) });
      const prev = qc.getQueryData<OpportunityComment[]>(commentsKey(id));
      const prevLists = qc.getQueriesData<Opportunity[]>({ queryKey: ['opportunities'] });
      const prevOne = qc.getQueryData<Opportunity>(['opportunity', id]);
      const optimistic: OpportunityComment = {
        id: `local-${Date.now()}`, authorName: 'Você', authorAvatar: null, content,
        createdAt: new Date().toISOString(), parentId: parentId ?? null,
        likeCount: 0, insightCount: 0, replyCount: 0, repostCount: 0, shareCount: 0,
        liked: false, insighted: false, reposted: false, shared: false,
      };
      qc.setQueryData<OpportunityComment[]>(commentsKey(id), (old) => {
        const next = [...(old ?? []), optimistic];
        return parentId ? next.map((c) => (c.id === parentId ? { ...c, replyCount: c.replyCount + 1 } : c)) : next;
      });
      qc.setQueriesData<Opportunity[]>({ queryKey: ['opportunities'] }, (old) => (old ?? []).map((o) => (o.id === id ? { ...o, commentCount: o.commentCount + 1 } : o)));
      if (prevOne) qc.setQueryData<Opportunity>(['opportunity', id], { ...prevOne, commentCount: prevOne.commentCount + 1 });
      return { prev, prevLists, prevOne };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(commentsKey(id), ctx.prev);
      ctx?.prevLists?.forEach(([k, data]) => qc.setQueryData(k, data));
      if (ctx?.prevOne) qc.setQueryData(['opportunity', id], ctx.prevOne);
    },
    onSettled: () => {
      if (!config.mock.opportunities) qc.invalidateQueries({ queryKey: commentsKey(id) });
    },
  });
}

/** Toggle de reação (curtir/insight/repost/enviar) em comentário de oportunidade, otimista. */
function useOppCommentReaction(id: string, kind: CommentReactionKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, active }: { commentId: string; active: boolean }) => {
      if (config.mock.opportunities) return;
      const url = `/web/opportunities/comments/${commentId}/${kind}`;
      return active ? api.delete(url) : api.post(url);
    },
    onMutate: async ({ commentId, active }) => {
      await qc.cancelQueries({ queryKey: commentsKey(id) });
      const prev = qc.getQueryData<OpportunityComment[]>(commentsKey(id));
      qc.setQueryData<OpportunityComment[]>(commentsKey(id), (old) =>
        (old ?? []).map((c) => (c.id === commentId ? applyCommentReaction(c, kind, active) : c)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(commentsKey(id), ctx.prev);
    },
  });
}

export const useToggleOppCommentLike = (id: string) => useOppCommentReaction(id, 'like');
export const useToggleOppCommentInsight = (id: string) => useOppCommentReaction(id, 'insight');
export const useToggleOppCommentRepost = (id: string) => useOppCommentReaction(id, 'repost');
export const useToggleOppCommentShare = (id: string) => useOppCommentReaction(id, 'share');

interface RawApplicationRow {
  id: string;
  applicant_name: string;
  answers: { label: string; answer: string }[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  owner_reply: string | null;
  created_at: string;
}
const toApplication = (r: RawApplicationRow): OpportunityApplication => ({
  id: r.id,
  applicantName: r.applicant_name,
  answers: r.answers ?? [],
  status: r.status,
  ownerReply: r.owner_reply,
  createdAt: r.created_at,
});

/** Oportunidades publicadas pelo dono (com nº de candidaturas). GET /web/opportunities/mine. */
export function useMyOpportunities() {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['my-opportunities'],
    staleTime: 0,
    // contagem de candidaturas sobe sozinha no chip Minhas
    refetchInterval: () => (qc.isMutating() ? false : 30_000),
    queryFn: async (): Promise<Opportunity[]> => {
      if (config.mock.opportunities) return mockOpportunities.slice(0, 2).map((o) => ({ ...o, applicationCount: o.commentCount }));
      const rows = await api.get<RawOpportunityRow[]>('/web/opportunities/mine');
      return (rows ?? []).map(toOpportunity);
    },
  });
}

/** Candidatar-se (responde o formulário). POST /web/opportunities/:id/apply. */
export function useApply(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (answers: { label: string; answer: string }[]) => {
      if (config.mock.opportunities) return;
      return api.post(`/web/opportunities/${id}/apply`, { answers });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunity', id] }),
  });
}

/** Candidaturas de uma oportunidade (só dono). GET /web/opportunities/:id/applications. */
export function useApplications(id: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['opportunity-applications', id],
    staleTime: 0,
    // candidaturas novas de terceiros entram sozinhas com a tela aberta
    refetchInterval: () => (qc.isMutating() ? false : 15_000),
    queryFn: async (): Promise<OpportunityApplication[]> => {
      if (config.mock.opportunities) return [];
      const rows = await api.get<RawApplicationRow[]>(`/web/opportunities/${id}/applications`);
      return (rows ?? []).map(toApplication);
    },
  });
}

/** Aprovar/recusar/responder candidatura. PATCH /web/opportunities/applications/:appId. */
export function useUpdateApplication(oppId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ appId, status, reply }: { appId: string; status?: 'APPROVED' | 'REJECTED'; reply?: string }) => {
      if (config.mock.opportunities) return;
      return api.patch(`/web/opportunities/applications/${appId}`, { status, reply });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunity-applications', oppId] }),
  });
}
