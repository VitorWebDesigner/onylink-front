import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../store/auth';

export type ReportTargetType = 'POST' | 'COMMENT' | 'USER' | 'MESSAGE';

/** Motivos fixos de denúncia (sem digitação livre — padrão do app). */
export const REPORT_REASONS = [
  'Spam ou repetitivo',
  'Fora do contexto de negócio',
  'Ofensivo ou assédio',
  'Golpe ou fraude',
  'Informação enganosa',
] as const;

/** Denuncia post/comentário/usuário. Dedupe no back (re-denunciar não duplica). */
export function useReportContent() {
  return useMutation({
    mutationFn: ({ targetType, targetId, reason }: { targetType: ReportTargetType; targetId: string; reason: string }) =>
      api.post('/web/moderation/report', { targetType, targetId, reason }),
  });
}

export interface ModerationReport {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  status: string;
  createdAt: string;
  reporterName: string | null;
  targetPreview: string | null;
  offenderId: string | null;
  offenderName: string | null;
  offenderHandle: string | null;
  reportCount: number;
  postStatus: string | null;
}

interface RawReportRow {
  id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter_name: string | null;
  target_preview: string | null;
  offender_id: string | null;
  offender_name: string | null;
  offender_handle: string | null;
  report_count: number;
  post_status: string | null;
}

/** Fila de denúncias (SÓ admin — o back devolve 403 pros demais). Poll 30s. */
export function useReports(status: 'OPEN' | 'RESOLVED' | 'DISMISSED' = 'OPEN') {
  const isAdmin = useAuth((s) => s.user?.role === 'ADMIN');
  return useQuery({
    queryKey: ['moderation-reports', status],
    enabled: isAdmin,
    staleTime: 0,
    refetchInterval: 30_000,
    queryFn: async (): Promise<ModerationReport[]> => {
      const rows = await api.get<RawReportRow[]>(`/web/moderation/reports?status=${status}&limit=50`);
      return (rows ?? []).map((r) => ({
        id: r.id,
        targetType: r.target_type,
        targetId: r.target_id,
        reason: r.reason,
        status: r.status,
        createdAt: r.created_at,
        reporterName: r.reporter_name,
        targetPreview: r.target_preview,
        offenderId: r.offender_id,
        offenderName: r.offender_name,
        offenderHandle: r.offender_handle,
        reportCount: r.report_count ?? 1,
        postStatus: r.post_status,
      }));
    },
  });
}

export type ResolveAction = 'REMOVE' | 'SUSPEND' | 'BAN';

/** Resolve a denúncia aplicando a ação no alvo (ou descarta). */
export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, action }: { reportId: string; action: ResolveAction | 'DISMISS' }) =>
      api.post(`/web/moderation/reports/${reportId}/resolve`,
        action === 'DISMISS'
          ? { status: 'DISMISSED' }
          : { status: 'RESOLVED', action }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['moderation-reports'] });
      // conteúdo removido some das listas
      void qc.invalidateQueries({ queryKey: ['feed'] });
      void qc.invalidateQueries({ queryKey: ['comments'] });
    },
  });
}
