import type { QueryClient } from '@tanstack/react-query';
import type { FeedPost } from './types';

/**
 * Helpers de cache de POST — arquivo próprio (sem imports de outros hooks) de
 * propósito: comments/hooks e connections/hooks também usam, e importar de
 * feed/hooks criava REQUIRE CYCLE (comments → feed → comments) com risco de
 * export não inicializado no boot (warning real no Metro).
 *
 * Um post pode viver em VÁRIOS caches ao mesmo tempo: feed geral, feed de
 * comunidade (group-posts), abas do perfil (user-posts/user-reposts), busca
 * (search-posts) e o detalhe standalone (['post', id]). TODO toggle otimista
 * passa por aqui — senão post de comunidade (fora do feed geral) não reflete
 * a reação em lugar nenhum (bug real).
 */
export const POST_LIST_KEYS = [['feed'], ['group-posts'], ['user-posts'], ['user-reposts'], ['search-posts']] as const;

export function patchPostCaches(qc: QueryClient, postId: string, patch: (p: FeedPost) => FeedPost) {
  for (const key of POST_LIST_KEYS) {
    qc.setQueriesData<FeedPost[]>({ queryKey: key }, (old) =>
      old?.map((p) => (p.id === postId ? patch(p) : p)),
    );
  }
  qc.setQueryData<FeedPost>(['post', postId], (old) => (old ? patch(old) : old));
}

/** Idem, mas por AUTOR (pílula Seguir replicada em todos os posts dele). */
export function patchAuthorCaches(qc: QueryClient, authorId: string, patch: (p: FeedPost) => FeedPost) {
  for (const key of POST_LIST_KEYS) {
    qc.setQueriesData<FeedPost[]>({ queryKey: key }, (old) =>
      old?.map((p) => (p.authorId === authorId ? patch(p) : p)),
    );
  }
  qc.setQueriesData<FeedPost>({ queryKey: ['post'] }, (old) =>
    old && old.authorId === authorId ? patch(old) : old,
  );
}

/** Desfaz otimista re-buscando tudo que pode ter sido tocado (erro é raro). */
export function invalidatePostCaches(qc: QueryClient, postId?: string) {
  for (const key of POST_LIST_KEYS) void qc.invalidateQueries({ queryKey: key });
  if (postId) void qc.invalidateQueries({ queryKey: ['post', postId] });
}
