import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { config } from '../../lib/config';
import { useAuth } from '../../store/auth';

export type NotificationKind =
  | 'LIKE' | 'INSIGHT' | 'REPOST'
  | 'COMMENT' | 'REPLY' | 'SUBSCRIBED'
  | 'FOLLOW' | 'APPLICATION'
  | 'CONNECTION' | 'CONNECTION_ACCEPTED' | 'MESSAGE' | 'POST_APPROVED' | 'POST_REJECTED';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  postId: string | null;
  commentId: string | null;
  opportunityId: string | null;
  preview: string | null;
  read: boolean;
  createdAt: string;
  actorId: string | null;
  actorName: string | null;
  actorHandle: string | null;
  actorAvatar: string | null;
}

interface RawNotification {
  id: string;
  type: NotificationKind;
  payload: { postId?: string; commentId?: string; opportunityId?: string; preview?: string } | null;
  read_at: string | null;
  created_at: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_handle: string | null;
  actor_avatar: string | null;
}

const toNotification = (r: RawNotification): AppNotification => ({
  id: r.id,
  kind: r.type,
  postId: r.payload?.postId ?? null,
  commentId: r.payload?.commentId ?? null,
  opportunityId: r.payload?.opportunityId ?? null,
  preview: r.payload?.preview ?? null,
  read: !!r.read_at,
  createdAt: r.created_at,
  actorId: r.actor_id,
  actorName: r.actor_name,
  actorHandle: r.actor_handle,
  actorAvatar: r.actor_avatar,
});

/** Lista de notificações (sino). Backend: GET /web/notifications. */
export function useNotifications() {
  const authed = useAuth((s) => s.status === 'authenticated');
  return useQuery({
    queryKey: ['notifications'],
    enabled: authed && !config.mock.notifications,
    staleTime: 0,
    queryFn: async (): Promise<AppNotification[]> => {
      const rows = await api.get<RawNotification[]>('/web/notifications?limit=50&offset=0');
      return (rows ?? []).map(toNotification);
    },
  });
}

/** Contador do badge do sino — atualiza a cada 30s enquanto o app está em foco. */
export function useUnreadCount() {
  const authed = useAuth((s) => s.status === 'authenticated');
  return useQuery({
    queryKey: ['notifications-unread'],
    enabled: authed && !config.mock.notifications,
    refetchInterval: 30_000,
    queryFn: async (): Promise<number> => {
      const r = await api.get<{ count: number }>('/web/notifications/unread-count');
      return r?.count ?? 0;
    },
  });
}

/** Marca tudo como lido (ao abrir a tela). Zera o badge sem refazer a lista. */
export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/web/notifications/read-all'),
    onSuccess: () => {
      qc.setQueryData(['notifications-unread'], 0);
    },
  });
}
