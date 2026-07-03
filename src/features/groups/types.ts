/** Grupo/comunidade segmentada (prompt.md §5.6). icon = nome de um Ionicon. */
export interface Group {
  id: string;
  name: string;
  segment: string;
  city?: string | null;
  membersCount: number;
  description: string;
  icon: string;
  joined: boolean;
}
