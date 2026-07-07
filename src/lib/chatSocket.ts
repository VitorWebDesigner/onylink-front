import { AppState } from 'react-native';
import { create } from 'zustand';
import { config } from './config';
import { tokenStore } from './storage';
import { queryClient } from './queryClient';
import type { ChatMessage } from '../features/messages/types';

/**
 * WebSocket do CHAT (Fase C): mensagem/lida chegam EMPURRADAS pelo back —
 * o polling dos hooks vira fallback (relaxa quando `connected`).
 * Conexão: ws(s)://api/ws?token=<accessToken>; reconexão com backoff e
 * re-liga ao voltar pro foreground. Ligado/desligado pelo AuthGate.
 */
interface SocketState { connected: boolean }
export const useChatSocket = create<SocketState>(() => ({ connected: false }));

let ws: WebSocket | null = null;
let enabled = false;
let retry = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

interface RawWsMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  created_at: string;
}

function toMsg(r: RawWsMessage): ChatMessage {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    senderId: r.sender_id,
    senderName: r.sender_name,
    senderAvatar: r.sender_avatar,
    content: r.content,
    createdAt: r.created_at,
  };
}

type ChatCache = { items: ChatMessage[]; othersReadAt: string | null };

function onEvent(raw: string, myId: string | null) {
  let e: { type?: string; conversationId?: string; message?: RawWsMessage; at?: string };
  try { e = JSON.parse(raw); } catch { return; }

  if (e.type === 'message:new' && e.conversationId && e.message) {
    const msg = toMsg(e.message);
    // minha própria mensagem volta pelo WS (outros aparelhos) — aqui o otimista
    // + onSettled já cuidam; aplicar duplicaria a bolha pendente
    if (msg.senderId !== myId) {
      queryClient.setQueryData<ChatCache>(['chat-messages', e.conversationId], (old) =>
        old && !old.items.some((m) => m.id === msg.id) ? { ...old, items: [msg, ...old.items] } : old,
      );
      // se a conversa está ABERTA, o refetch marca lida no back (→ ✓✓ do
      // remetente acende ao vivo); só re-busca queries ativas, custo zero
      void queryClient.invalidateQueries({ queryKey: ['chat-messages', e.conversationId] });
    }
    // lista: última msg + unread na hora (refetch confirma em seguida)
    void queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }

  if (e.type === 'conversation:read' && e.conversationId && e.at) {
    queryClient.setQueryData<ChatCache>(['chat-messages', e.conversationId], (old) =>
      old ? { ...old, othersReadAt: e.at! } : old,
    );
  }
}

async function open(myId: string | null) {
  if (!enabled || ws) return;
  const token = await tokenStore.getAccess();
  if (!token || !enabled) return;
  const url = `${config.apiUrl.replace(/^http/, 'ws')}/ws?token=${encodeURIComponent(token)}`;
  try {
    const socket = new WebSocket(url);
    ws = socket;
    socket.onopen = () => { retry = 0; useChatSocket.setState({ connected: true }); };
    socket.onmessage = (ev) => onEvent(String(ev.data), myId);
    socket.onerror = () => undefined;
    socket.onclose = () => {
      if (ws === socket) ws = null;
      useChatSocket.setState({ connected: false });
      scheduleReconnect(myId);
    };
  } catch {
    scheduleReconnect(myId);
  }
}

function scheduleReconnect(myId: string | null) {
  if (!enabled || timer) return;
  const delay = Math.min(15_000, 1_000 * 2 ** retry);
  retry += 1;
  timer = setTimeout(() => { timer = null; void open(myId); }, delay);
}

let appStateSub: { remove: () => void } | null = null;

/** Liga o socket (chamar quando a sessão autentica). */
export function startChatSocket(myId: string): void {
  enabled = true;
  retry = 0;
  void open(myId);
  appStateSub?.remove();
  appStateSub = AppState.addEventListener('change', (s) => {
    if (s === 'active' && enabled && !ws) { retry = 0; void open(myId); }
  });
}

/** Desliga (logout). */
export function stopChatSocket(): void {
  enabled = false;
  if (timer) { clearTimeout(timer); timer = null; }
  appStateSub?.remove();
  appStateSub = null;
  try { ws?.close(); } catch { /* noop */ }
  ws = null;
  useChatSocket.setState({ connected: false });
}
