import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../store/auth';
import type { DiagnosticAnswers, DiagnosticRecommendation, DiagnosticResult } from './types';

/**
 * Envia o diagnóstico. POST /web/diagnostics (CLAUDE.md §8 — porta de aquisição).
 * Usuário logado: backend associa pelo Bearer. `leadEmail` só p/ fluxo anônimo.
 */
export function useSubmitDiagnostic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (answers: DiagnosticAnswers) =>
      api.post<DiagnosticResult>('/web/diagnostics', { answers }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['diagnostic-latest'] });
      void qc.invalidateQueries({ queryKey: ['my-insights'] }); // maturidade do Painel
    },
  });
}

interface RawLatestRow {
  id: string;
  score_financeiro: number | null;
  score_comercial: number | null;
  score_marketing: number | null;
  score_gestao: number | null;
  score_total: number | null;
  recommendations: DiagnosticRecommendation[] | null;
  created_at: string;
}

export interface LatestDiagnostic extends DiagnosticResult {
  createdAt: string;
}

/** Último diagnóstico do usuário (Configurações → ver resultado/refazer).
 *  null = nunca respondeu. GET /web/diagnostics/me/latest. */
export function useLatestDiagnostic() {
  const authed = useAuth((s) => s.status === 'authenticated');
  return useQuery({
    queryKey: ['diagnostic-latest'],
    enabled: authed,
    staleTime: 0,
    queryFn: async (): Promise<LatestDiagnostic | null> => {
      const r = await api.get<RawLatestRow | null>('/web/diagnostics/me/latest');
      if (!r) return null;
      const recommendations = Array.isArray(r.recommendations) ? r.recommendations : [];
      return {
        scores: {
          financeiro: r.score_financeiro ?? 0,
          comercial: r.score_comercial ?? 0,
          marketing: r.score_marketing ?? 0,
          gestao: r.score_gestao ?? 0,
        },
        total: r.score_total ?? 0,
        recommendations,
        recommendedGroups: [...new Set(recommendations.flatMap((x) =>
          x.groups?.length ? x.groups.map((g) => g.slug) : x.groupSlug ? [x.groupSlug] : [],
        ))],
        createdAt: r.created_at,
      };
    },
  });
}
