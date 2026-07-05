/** Chat (Fase B — plano-grupos-comunidades.md): 1:1 e grupo estilo WhatsApp. */

export interface Conversation {
  id: string;
  isGroup: boolean;
  /** Nome do grupo (1:1 usa o nome do peer). */
  name: string | null;
  description: string | null;
  photoPath: string | null;
  memberCount: number;
  createdBy: string | null;
  myRole: string | null; // ADMIN | MEMBER (grupo)
  /** Outro participante (só 1:1). */
  peerId: string | null;
  peerName: string | null;
  peerHandle: string | null;
  peerAvatar: string | null;
  lastContent: string | null;
  lastSenderId: string | null;
  lastCreatedAt: string | null;
  unreadCount: number;
  pinned: boolean;
  createdAt: string;
}

export interface ChatMember {
  id: string;
  name: string;
  handle: string;
  avatarPath: string | null;
  roleTitle: string | null;
  role: string; // ADMIN | MEMBER
  followed: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  content: string;
  createdAt: string;
  /** Só no otimista local (enviando…). */
  pending?: boolean;
}

export interface RawConversationRow {
  id: string;
  is_group: boolean;
  name: string | null;
  description: string | null;
  photo_path: string | null;
  member_count: number;
  created_by: string | null;
  my_role: string | null;
  peer_id: string | null;
  peer_name: string | null;
  peer_handle: string | null;
  peer_avatar: string | null;
  last_content: string | null;
  last_sender_id: string | null;
  last_created_at: string | null;
  unread_count: number;
  pinned: boolean;
  created_at: string;
}

export const toConversation = (r: RawConversationRow): Conversation => ({
  id: r.id,
  isGroup: Boolean(r.is_group),
  name: r.name,
  description: r.description,
  photoPath: r.photo_path,
  memberCount: r.member_count ?? 0,
  createdBy: r.created_by,
  myRole: r.my_role,
  peerId: r.peer_id,
  peerName: r.peer_name,
  peerHandle: r.peer_handle,
  peerAvatar: r.peer_avatar,
  lastContent: r.last_content,
  lastSenderId: r.last_sender_id,
  lastCreatedAt: r.last_created_at,
  unreadCount: r.unread_count ?? 0,
  pinned: Boolean(r.pinned),
  createdAt: r.created_at,
});

/** Título/foto exibidos: grupo usa os próprios; 1:1 usa o peer. */
export const conversationTitle = (c: Conversation) => (c.isGroup ? (c.name ?? 'Grupo') : (c.peerName ?? 'Conversa'));
export const conversationPhoto = (c: Conversation) => (c.isGroup ? c.photoPath : c.peerAvatar);
