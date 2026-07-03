import type { IconName } from '../../components/Icon';

/** Tipos de oportunidade (espelha opportunities.schema do backend). */
export type OpportunityKind = 'INDICACAO' | 'PARCERIA' | 'FORNECEDOR' | 'VAGA' | 'EVENTO';

export const OPPORTUNITY_KINDS: { kind: OpportunityKind; label: string; icon: IconName }[] = [
  { kind: 'INDICACAO', label: 'Indicação', icon: 'connector' },
  { kind: 'PARCERIA', label: 'Parceria', icon: 'repost' },
  { kind: 'FORNECEDOR', label: 'Fornecedor', icon: 'bag' },
  { kind: 'VAGA', label: 'Vaga', icon: 'work' },
  { kind: 'EVENTO', label: 'Evento', icon: 'calendar' },
];

export const KIND_META: Record<OpportunityKind, { label: string; icon: IconName }> = Object.fromEntries(
  OPPORTUNITY_KINDS.map((k) => [k.kind, { label: k.label, icon: k.icon }]),
) as Record<OpportunityKind, { label: string; icon: IconName }>;

export interface ApplicationQuestion {
  id: string;
  label: string;
  required?: boolean;
}

export interface Opportunity {
  id: string;
  authorId?: string;
  kind: OpportunityKind;
  title: string;
  description: string | null;
  city: string | null;
  segment: string | null;
  authorName: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  insightCount: number;
  viewCount: number;
  liked: boolean;
  insighted: boolean;
  subscribed: boolean;
  authorFollowed: boolean;
  applicationForm?: ApplicationQuestion[];
  applied?: boolean;
  applicationCount?: number;
}

export interface OpportunityApplication {
  id: string;
  applicantName: string;
  answers: { label: string; answer: string }[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  ownerReply: string | null;
  createdAt: string;
}

/** Linha crua do backend (snake_case — ver opportunities.model). */
export interface RawOpportunityRow {
  id: string;
  author_id?: string;
  kind: OpportunityKind;
  title: string;
  description?: string | null;
  city?: string | null;
  segment?: string | null;
  created_at: string;
  author_name: string;
  like_count?: number;
  comment_count?: number;
  insight_count?: number;
  view_count?: number;
  liked?: boolean;
  insighted?: boolean;
  subscribed?: boolean;
  author_followed?: boolean;
  application_form?: ApplicationQuestion[];
  applied?: boolean;
  application_count?: number;
}

export function toOpportunity(r: RawOpportunityRow): Opportunity {
  return {
    id: r.id,
    authorId: r.author_id,
    kind: r.kind,
    title: r.title,
    description: r.description ?? null,
    city: r.city ?? null,
    segment: r.segment ?? null,
    authorName: r.author_name,
    createdAt: r.created_at,
    likeCount: r.like_count ?? 0,
    commentCount: r.comment_count ?? 0,
    insightCount: r.insight_count ?? 0,
    viewCount: r.view_count ?? 0,
    liked: Boolean(r.liked),
    insighted: Boolean(r.insighted),
    subscribed: Boolean(r.subscribed),
    authorFollowed: Boolean(r.author_followed),
    applicationForm: r.application_form ?? [],
    applied: Boolean(r.applied),
    applicationCount: r.application_count ?? 0,
  };
}

export interface OpportunityComment {
  id: string;
  authorName: string;
  authorAvatar?: string | null;
  content: string;
  createdAt: string;
  parentId: string | null;
  likeCount: number;
  insightCount: number;
  replyCount: number;
  repostCount: number;
  shareCount: number;
  liked: boolean;
  insighted: boolean;
  reposted: boolean;
  shared: boolean;
}
