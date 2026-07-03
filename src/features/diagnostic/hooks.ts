import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { DiagnosticAnswers, DiagnosticResult } from './types';

/**
 * Envia o diagnóstico. POST /web/diagnostics (CLAUDE.md §8 — porta de aquisição).
 * Usuário logado: backend associa pelo Bearer. `leadEmail` só p/ fluxo anônimo.
 */
export function useSubmitDiagnostic() {
  return useMutation({
    mutationFn: (answers: DiagnosticAnswers) =>
      api.post<DiagnosticResult>('/web/diagnostics', { answers }),
  });
}
