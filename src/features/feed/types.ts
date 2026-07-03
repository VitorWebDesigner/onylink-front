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
  liked?: boolean;
  saved?: boolean;
  reposted?: boolean;
  shared?: boolean;
  insighted?: boolean;
  author_followed?: boolean;
  subscribed?: boolean;
  pinned?: boolean;
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
    authorFollowed: Boolean(r.author_followed),
    subscribed: Boolean(r.subscribed),
    createdAt: r.created_at,
    topComment: r.top_comment_id
      ? {
          id: r.top_comment_id,
          authorId: r.top_comment_author_id ?? null,
          authorName: r.top_comment_author ?? '',
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
