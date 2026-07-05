import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { config } from '../../lib/config';
import { toFeedPost, type FeedPost, type RawFeedRow } from '../feed/types';

export interface ProfileLink {
  label: string;
  url: string;
}

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  avatarPath: string | null;
  coverPath: string | null;
  bio: string | null;
  roleTitle: string | null;
  segment: string | null;
  city: string | null;
  state: string | null;
  points: number;
  companyName: string | null;
  interests: string[];
  links: ProfileLink[];
  contactEmail: string | null;
  contactWhatsapp: string | null;
  contactUrl: string | null;
  createdAt: string | null;
  verified: boolean;
  professional: boolean;
  /** Selos automáticos por regra (Conector = 50+ seguidores; Autoridade = 100+ insights). */
  badgeConnector: boolean;
  badgeAuthority: boolean;
  followed: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

interface RawUser {
  id: string;
  name: string;
  handle: string;
  avatar_path: string | null;
  cover_path: string | null;
  bio: string | null;
  role_title: string | null;
  segment: string | null;
  city: string | null;
  state: string | null;
  points: number | null;
  company_name: string | null;
  interests: string[] | null;
  links: ProfileLink[] | null;
  contact_email: string | null;
  contact_whatsapp: string | null;
  contact_url: string | null;
  created_at: string | null;
  verified?: boolean;
  professional?: boolean;
  badge_connector?: boolean;
  badge_authority?: boolean;
  followed: boolean;
  followers_count: number | null;
  following_count: number | null;
  posts_count: number | null;
}

const toUser = (r: RawUser): UserProfile => ({
  id: r.id,
  name: r.name,
  handle: r.handle,
  avatarPath: r.avatar_path,
  coverPath: r.cover_path ?? null,
  bio: r.bio,
  roleTitle: r.role_title,
  segment: r.segment,
  city: r.city,
  state: r.state,
  points: r.points ?? 0,
  companyName: r.company_name,
  interests: r.interests ?? [],
  links: Array.isArray(r.links) ? r.links.filter((l) => l && l.url) : [],
  contactEmail: r.contact_email ?? null,
  contactWhatsapp: r.contact_whatsapp ?? null,
  contactUrl: r.contact_url ?? null,
  createdAt: r.created_at ?? null,
  verified: Boolean(r.verified),
  professional: Boolean(r.professional),
  badgeConnector: Boolean(r.badge_connector),
  badgeAuthority: Boolean(r.badge_authority),
  followed: Boolean(r.followed),
  followersCount: r.followers_count ?? 0,
  followingCount: r.following_count ?? 0,
  postsCount: r.posts_count ?? 0,
});

/** Perfil público de um usuário. Backend: GET /web/users/:id.
 *  staleTime 0 → contadores sempre frescos ao entrar na tela (o otimista do follow
 *  mexe no cache; sem refetch os números ficavam defasados). */
export function useUser(id: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['user', id],
    enabled: !!id,
    staleTime: 0,
    // contadores (seguidores/posts) de TERCEIROS sobem com a tela aberta
    refetchInterval: () => (qc.isMutating() ? false : 30_000),
    queryFn: async (): Promise<UserProfile> => toUser(await api.get<RawUser>(`/web/users/${id}`)),
  });
}

/** Perfil do usuário logado. Backend: GET /web/users/me. */
export function useMe() {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['user', 'me'],
    enabled: !config.mock.profile,
    staleTime: 0,
    // ganhar seguidor/ponto reflete na aba Perfil sem reabrir o app
    refetchInterval: () => (qc.isMutating() ? false : 30_000),
    queryFn: async (): Promise<UserProfile> => toUser(await api.get<RawUser>('/web/users/me')),
  });
}

export interface UpdateProfileInput {
  name?: string;
  avatarPath?: string;
  coverPath?: string;
  bio?: string;
  roleTitle?: string;
  segment?: string;
  city?: string;
  state?: string;
  contactEmail?: string;
  contactWhatsapp?: string;
  contactUrl?: string;
  /** Enviar o array COMPLETO (substitui; [] limpa). */
  links?: ProfileLink[];
  interests?: string[];
}

/** Publicações de um usuário (aba do perfil; fixado vem primeiro).
 *  staleTime 0 nas abas: cada entrada/troca de aba refaz o fetch (dados de
 *  terceiros frescos sem polling permanente em todas as abas). */
export function useUserPosts(id: string) {
  return useQuery({
    queryKey: ['user-posts', id],
    enabled: !!id && !config.mock.profile,
    staleTime: 0,
    queryFn: async (): Promise<FeedPost[]> => {
      const { items } = await api.get<{ items: RawFeedRow[] }>(`/web/users/${id}/posts?limit=30&offset=0`);
      return items.map(toFeedPost);
    },
  });
}

/** Aba Reposts — posts que o usuário repostou (ordem do repost). */
export function useUserReposts(id: string, enabled = true) {
  return useQuery({
    queryKey: ['user-reposts', id],
    enabled: enabled && !!id && !config.mock.profile,
    staleTime: 0,
    queryFn: async (): Promise<FeedPost[]> => {
      const { items } = await api.get<{ items: RawFeedRow[] }>(`/web/users/${id}/reposts?limit=30&offset=0`);
      return items.map(toFeedPost);
    },
  });
}

export interface UserCommentRow {
  id: string;
  content: string;
  createdAt: string;
  postId: string;
  likeCount: number;
  insightCount: number;
  replyCount: number;
  postAuthorName: string;
  postContent: string | null;
}

/** Aba Respostas — comentários do usuário com contexto do post. */
export function useUserComments(id: string, enabled = true) {
  return useQuery({
    queryKey: ['user-comments', id],
    enabled: enabled && !!id && !config.mock.profile,
    staleTime: 0,
    queryFn: async (): Promise<UserCommentRow[]> => {
      const rows = await api.get<{ id: string; content: string; created_at: string; post_id: string; like_count: number; insight_count: number; reply_count: number; post_author_name: string; post_content: string | null }[]>(`/web/users/${id}/comments?limit=30&offset=0`);
      return (rows ?? []).map((r) => ({
        id: r.id, content: r.content, createdAt: r.created_at, postId: r.post_id,
        likeCount: r.like_count ?? 0, insightCount: r.insight_count ?? 0, replyCount: r.reply_count ?? 0,
        postAuthorName: r.post_author_name, postContent: r.post_content,
      }));
    },
  });
}

export interface UserMediaItem {
  postId: string;
  type: string;
  url: string;
  thumbnail?: string;
}

/** Aba Mídia — grade de imagens/vídeos dos posts do usuário. */
export function useUserMedia(id: string, enabled = true) {
  return useQuery({
    queryKey: ['user-media', id],
    enabled: enabled && !!id && !config.mock.profile,
    staleTime: 0,
    queryFn: async (): Promise<UserMediaItem[]> => {
      const rows = await api.get<{ post_id: string; type: string; url: string; thumbnail?: string }[]>(`/web/users/${id}/media?limit=60&offset=0`);
      return (rows ?? []).map((r) => ({ postId: r.post_id, type: r.type, url: r.url, thumbnail: r.thumbnail }));
    },
  });
}

export interface FollowListUser {
  id: string;
  name: string;
  handle: string;
  avatarPath: string | null;
  roleTitle: string | null;
  followed: boolean;
}

/** Listas de rede (stats tocáveis): seguidores OU seguindo. */
export function useFollowsList(id: string, kind: 'followers' | 'following') {
  return useQuery({
    queryKey: ['follows', id, kind],
    enabled: !!id && !config.mock.profile,
    staleTime: 0,
    queryFn: async (): Promise<FollowListUser[]> => {
      const rows = await api.get<{ id: string; name: string; handle: string; avatar_path: string | null; role_title: string | null; followed: boolean }[]>(`/web/users/${id}/${kind}?limit=100&offset=0`);
      return (rows ?? []).map((r) => ({ id: r.id, name: r.name, handle: r.handle, avatarPath: r.avatar_path, roleTitle: r.role_title, followed: Boolean(r.followed) }));
    },
  });
}

/* ——— Painel do Empresário (Fase 2) ——— */

export interface TopPost {
  id: string;
  content: string | null;
  category: string;
  viewCount: number;
  insightCount: number;
  likeCount: number;
  commentCount: number;
  /** 1ª mídia do post (thumbnail resolvida pelo backend). */
  media: { type: string; url: string; thumbnail?: string } | null;
}

export interface DiagnosticScores {
  financeiro: number | null;
  comercial: number | null;
  marketing: number | null;
  gestao: number | null;
  total: number | null;
}

export interface MyInsights {
  views30d: number; viewsPrev: number;
  insights30d: number; insightsPrev: number;
  followers30d: number; followersPrev: number; followersTotal: number;
  interactions30d: number; interactionsPrev: number;
  applications30d: number; applicationsTotal: number;
  points: number;
  topPosts: TopPost[];
  diagnostic: DiagnosticScores | null;
}

interface RawInsights {
  views_30d: number; views_prev: number;
  insights_30d: number; insights_prev: number;
  followers_30d: number; followers_prev: number; followers_total: number;
  interactions_30d: number; interactions_prev: number;
  applications_30d: number; applications_total: number;
  points: number | null;
  top_posts: { id: string; content: string | null; category: string; view_count: number; insight_count: number; like_count: number; comment_count: number; media: { type: string; url: string; thumbnail?: string } | null }[];
  diagnostic: { score_financeiro: number | null; score_comercial: number | null; score_marketing: number | null; score_gestao: number | null; score_total: number | null } | null;
}

/** Métricas do próprio usuário (30d + variação). Backend: GET /web/users/me/insights.
 *  403 se a conta não for PROFISSIONAL — chame só com `enabled` gateado. */
export function useMyInsights(enabled = true) {
  return useQuery({
    queryKey: ['my-insights'],
    enabled: enabled && !config.mock.profile,
    staleTime: 0, // painel sempre fresco ao abrir
    queryFn: async (): Promise<MyInsights> => {
      const r = await api.get<RawInsights>('/web/users/me/insights');
      return {
        views30d: r.views_30d, viewsPrev: r.views_prev,
        insights30d: r.insights_30d, insightsPrev: r.insights_prev,
        followers30d: r.followers_30d, followersPrev: r.followers_prev, followersTotal: r.followers_total,
        interactions30d: r.interactions_30d, interactionsPrev: r.interactions_prev,
        applications30d: r.applications_30d, applicationsTotal: r.applications_total,
        points: r.points ?? 0,
        topPosts: (r.top_posts ?? []).map((p) => ({
          id: p.id, content: p.content, category: p.category,
          viewCount: p.view_count, insightCount: p.insight_count, likeCount: p.like_count, commentCount: p.comment_count,
          media: p.media ?? null,
        })),
        diagnostic: r.diagnostic
          ? {
              financeiro: r.diagnostic.score_financeiro, comercial: r.diagnostic.score_comercial,
              marketing: r.diagnostic.score_marketing, gestao: r.diagnostic.score_gestao, total: r.diagnostic.score_total,
            }
          : null,
      };
    },
  });
}

/** Edição do próprio perfil. Backend: PATCH /web/users/me (parcial — só o que veio). */
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => api.patch<unknown>('/web/users/me', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['user'] }); // me + perfis públicos em cache
    },
  });
}
