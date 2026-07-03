/** Grupo/comunidade segmentada (prompt.md §5.6). */
export interface Group {
  id: string;
  name: string;
  slug?: string;
  description: string | null;
  segment: string | null;
  city: string | null;
  coverPath?: string | null;
  isPremium?: boolean;
  memberCount: number;
  joined: boolean;
  creatorName?: string | null;
  /** Só no mock offline (ícone ilustrativo — Ionicon). */
  icon?: string;
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
  member_count: number;
  joined?: boolean;
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
  memberCount: r.member_count ?? 0,
  joined: Boolean(r.joined),
  creatorName: r.creator_name ?? null,
});
