/** Categorias de post (espelha posts.schema.CATEGORIES do backend — CLAUDE.md §4). */
export const CATEGORIES = [
  'Vendas', 'Marketing', 'Financeiro', 'Gestão', 'Liderança', 'Operação',
  'Tecnologia', 'Contratação', 'Networking', 'Indicações', 'Cases',
  'Oportunidades', 'Dúvidas',
] as const;

export type PostCategory = (typeof CATEGORIES)[number];

/** Comentário em destaque trazido inline no feed (item 6 — o mais reagido do post).
 *  Mini-post: carrega contadores e o estado do leitor pra barra funcionar no feed. */
export interface TopComment {
  id: string;
  authorId?: string | null;
  authorName: string;
  authorVerified?: boolean;
  authorAdmin?: boolean;
  content: string;
  likeCount: number;
  insightCount: number;
  repostCount: number;
  shareCount: number;
  liked: boolean;
  insighted: boolean;
  reposted: boolean;
  shared: boolean;
}

/** Mídia de um post (URL já resolvida pelo backend — Bunny CDN / Stream HLS). */
export interface MediaItem {
  type: 'IMAGE' | 'VIDEO';
  url: string;
  thumbnail?: string;
}

export interface FeedPost {
  id: string;
  authorId?: string;
  content: string;
  category: PostCategory;
  media: MediaItem[];
  authorName: string;
  authorRoleTitle?: string | null;
  authorAvatar?: string | null;
  /** Selos do autor (mostrados ao lado do nome em TODO lugar — §13). */
  authorVerified?: boolean;
  authorAdmin?: boolean;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  shareCount: number;
  insightCount: number;
  viewCount: number;
  liked: boolean;
  reposted: boolean;
  shared: boolean;
  insighted: boolean;
  authorFollowed: boolean;
  subscribed: boolean;
  /** Fixado no perfil do autor (só vem no listamento por autor). */
  pinned?: boolean;
  /** Post de COMUNIDADE repostado no feed geral pelo admin (créditos no card). */
  communityId?: string | null;
  communityName?: string | null;
  featuredByName?: string | null;
  /** Dono da comunidade (created_by) — só ele reposta post NÃO destacado. */
  communityOwnerId?: string | null;
  /** Destacado no feed geral (público) — aí qualquer um pode repostar. */
  featured?: boolean;
  createdAt: string;
  topComment?: TopComment | null;
}

/** Linha crua do feed como o backend devolve (snake_case — ver posts.model.feed). */
export interface RawFeedRow {
  id: string;
  author_id: string;
  category: PostCategory;
  content: string;
  like_count: number;
  comment_count: number;
  repost_count?: number;
  share_count?: number;
  insight_count?: number;
  view_count?: number;
  created_at: string;
  author_name: string;
  author_avatar?: string | null;
  author_verified?: boolean;
  author_admin?: boolean;
  liked?: boolean;
  saved?: boolean;
  reposted?: boolean;
  shared?: boolean;
  insighted?: boolean;
  author_followed?: boolean;
  subscribed?: boolean;
  pinned?: boolean;
  group_id?: string | null;
  featured_at?: string | null;
  community_name?: string | null;
  community_owner_id?: string | null;
  featured_by_name?: string | null;
  media?: MediaItem[];
  top_comment_id?: string | null;
  top_comment_content?: string | null;
  top_comment_author_id?: string | null;
  top_comment_author?: string | null;
  top_comment_like_count?: number | null;
  top_comment_insight_count?: number | null;
  top_comment_repost_count?: number | null;
  top_comment_share_count?: number | null;
  top_comment_liked?: boolean | null;
  top_comment_insighted?: boolean | null;
  top_comment_reposted?: boolean | null;
  top_comment_shared?: boolean | null;
  top_comment_author_verified?: boolean | null;
  top_comment_author_admin?: boolean | null;
}

/**
 * Repostar PUBLICA no perfil/feed geral. Post de comunidade NÃO destacado é
 * conteúdo interno → só o DONO da comunidade pode repostar (decisão do dono;
 * o back devolve 403 igual). Destacado no feed geral já é público → todos podem.
 */
export function canRepostPost(p: FeedPost, meId?: string | null): boolean {
  return !p.communityId || !!p.featured || (!!meId && p.communityOwnerId === meId);
}

/** Normaliza a linha do backend (snake) para o modelo do app (camel). */
export function toFeedPost(r: RawFeedRow): FeedPost {
  return {
    id: r.id,
    authorId: r.author_id,
    content: r.content,
    category: r.category,
    media: r.media ?? [],
    authorName: r.author_name,
    authorAvatar: r.author_avatar ?? null,
    authorVerified: Boolean(r.author_verified),
    authorAdmin: Boolean(r.author_admin),
    likeCount: r.like_count,
    commentCount: r.comment_count,
    repostCount: r.repost_count ?? 0,
    shareCount: r.share_count ?? 0,
    insightCount: r.insight_count ?? 0,
    viewCount: r.view_count ?? 0,
    liked: Boolean(r.liked),
    reposted: Boolean(r.reposted),
    shared: Boolean(r.shared),
    insighted: Boolean(r.insighted),
    pinned: Boolean(r.pinned),
    communityId: r.group_id ?? null,
    communityName: r.community_name ?? null,
    communityOwnerId: r.community_owner_id ?? null,
    featured: Boolean(r.featured_at),
    featuredByName: r.featured_at ? (r.featured_by_name ?? null) : null,
    authorFollowed: Boolean(r.author_followed),
    subscribed: Boolean(r.subscribed),
    createdAt: r.created_at,
    topComment: r.top_comment_id
      ? {
          id: r.top_comment_id,
          authorId: r.top_comment_author_id ?? null,
          authorName: r.top_comment_author ?? '',
          authorVerified: Boolean(r.top_comment_author_verified),
          authorAdmin: Boolean(r.top_comment_author_admin),
          content: r.top_comment_content ?? '',
          likeCount: r.top_comment_like_count ?? 0,
          insightCount: r.top_comment_insight_count ?? 0,
          repostCount: r.top_comment_repost_count ?? 0,
          shareCount: r.top_comment_share_count ?? 0,
          liked: Boolean(r.top_comment_liked),
          insighted: Boolean(r.top_comment_insighted),
          reposted: Boolean(r.top_comment_reposted),
          shared: Boolean(r.top_comment_shared),
        }
      : null,
  };
}
