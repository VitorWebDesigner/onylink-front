/** Comunidade (feed segmentado — plano-grupos-comunidades.md). */
export interface Group {
  id: string;
  name: string;
  slug?: string;
  description: string | null;
  segment: string | null;
  city: string | null;
  coverPath?: string | null;
  isPremium?: boolean;
  isPrivate: boolean;
  memberCount: number;
  joined: boolean;
  /** Pedido de entrada pendente (comunidade privada). */
  requested: boolean;
  /** Fixada pelo usuário (máx. 5). */
  pinned: boolean;
  /** Papel do usuário na comunidade ('ADMIN' | 'MEMBER' | null). */
  myRole?: string | null;
  creatorName?: string | null;
  /** Só no mock offline (ícone ilustrativo — Ionicon). */
  icon?: string;
}

export interface GroupMember {
  id: string;
  name: string;
  handle: string;
  avatarPath: string | null;
  roleTitle: string | null;
  role: string; // ADMIN | MEMBER
}

export interface JoinRequest {
  id: string;
  name: string;
  handle: string;
  avatarPath: string | null;
  roleTitle: string | null;
}

/** Linha crua do backend (snake_case — ver groups.model). */
export interface RawGroupRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  segment: string | null;
  city: string | null;
  cover_path: string | null;
  is_premium: boolean;
  is_private: boolean;
  member_count: number;
  joined?: boolean;
  requested?: boolean;
  pinned?: boolean;
  my_role?: string | null;
  creator_name?: string | null;
}

export const toGroup = (r: RawGroupRow): Group => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  description: r.description,
  segment: r.segment,
  city: r.city,
  coverPath: r.cover_path,
  isPremium: Boolean(r.is_premium),
  isPrivate: Boolean(r.is_private),
  memberCount: r.member_count ?? 0,
  joined: Boolean(r.joined),
  requested: Boolean(r.requested),
  pinned: Boolean(r.pinned),
  myRole: r.my_role ?? null,
  creatorName: r.creator_name ?? null,
});
