/** Número compacto pt-BR: 142 · "1,2 mil" · "3,4 mi". */
export function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace('.', ',') + ' mil';
  return (n / 1_000_000).toFixed(1).replace('.', ',') + ' mi';
}

/** @handle do usuário (coluna handle, única). Fallback: deriva do e-mail. */
export function handleOf(u?: { handle?: string | null; email?: string | null } | null): string {
  if (u?.handle) return '@' + u.handle;
  const local = u?.email?.split('@')[0];
  if (local) return '@' + local.toLowerCase().replace(/[^a-z0-9._]/g, '');
  return '@voce';
}
