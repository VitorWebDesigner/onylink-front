import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { useKeyboardPadding } from '../../lib/keyboard';
import { useAuth } from '../../store/auth';
import { useConversation, useMessages, useSendMessage } from '../../features/messages/hooks';
import { conversationPhoto, conversationTitle, type ChatMessage } from '../../features/messages/types';

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Bolha de mensagem (minha = navy à direita; do outro = cinza à esquerda). */
function Bubble({ m, mine, isGroup, othersReadAt }: { m: ChatMessage; mine: boolean; isGroup: boolean; othersReadAt: string | null }) {
  const read = mine && !isGroup && !!othersReadAt && new Date(othersReadAt) >= new Date(m.createdAt) && !m.pending;
  return (
    <View className={['px-4 py-0.5', mine ? 'items-end' : 'items-start'].join(' ')}>
      <View
        className={['rounded-2xl px-3.5 py-2.5 max-w-[80%]', mine ? 'bg-brand-500 rounded-br-md' : 'bg-surface-muted rounded-bl-md'].join(' ')}
        style={m.pending ? { opacity: 0.55 } : undefined}
      >
        {/* em grupo, mensagens dos outros mostram quem falou */}
        {isGroup && !mine ? <Text className="text-brand-500 text-[11px] font-bold mb-0.5">{m.senderName}</Text> : null}
        <Text className={mine ? 'text-white leading-5' : 'text-ink-900 leading-5'}>{m.content}</Text>
        <View className="flex-row items-center justify-end gap-1 mt-0.5">
          <Text className={['text-[10px]', mine ? 'text-white/60' : 'text-ink-400'].join(' ')}>{fmtTime(m.createdAt)}</Text>
          {mine && !isGroup ? (
            <Text className={['text-[10px] font-bold', read ? 'text-accent-500' : 'text-white/60'].join(' ')}>{m.pending ? '…' : '✓✓'}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** Tela de CHAT (1:1 e grupo) — Fase B. Tempo real v1 = polling 4s (useMessages). */
export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const me = useAuth((s) => s.user);
  const { data: conv } = useConversation(id);
  const { data, isLoading } = useMessages(id);
  const sendMessage = useSendMessage(id);
  const [text, setText] = useState('');
  const kbPad = useKeyboardPadding(); // KAV é BANIDO (§13) — padding manual nos 2 SOs

  const openDetails = () => router.push({ pathname: '/chat/details', params: { id } });

  function send() {
    const v = text.trim();
    if (!v || sendMessage.isPending) return;
    sendMessage.mutate(v);
    setText('');
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      {/* header estilo WhatsApp: voltar · foto+nome tocáveis → dados */}
      <View className="flex-row items-center gap-3 px-4 py-2.5 border-b border-surface-border">
        <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP}>
          <Icon name="back" size={24} color={colors.ink[900]} />
        </Pressable>
        {conv ? (
          <Pressable onPress={openDetails} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-1 flex-row items-center gap-2.5">
            <Avatar name={conversationTitle(conv)} uri={conversationPhoto(conv)} size="sm" />
            <View className="flex-1">
              <Text className="text-ink-900 font-semibold text-[15px]" numberOfLines={1}>{conversationTitle(conv)}</Text>
              <Text className="text-ink-400 text-xs" numberOfLines={1}>
                {conv.isGroup ? `${conv.memberCount.toLocaleString('pt-BR')} participantes · toque p/ dados` : conv.peerHandle ? `@${conv.peerHandle}` : 'toque p/ dados'}
              </Text>
            </View>
          </Pressable>
        ) : (
          <Text className="text-ink-900 font-semibold text-base flex-1">Conversa</Text>
        )}
      </View>

      <View className="flex-1" style={{ paddingBottom: kbPad }}>
        {isLoading ? (
          <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.brand[500]} /></View>
        ) : (
          <FlatList
            data={data?.items ?? []}
            keyExtractor={(m) => m.id}
            inverted
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingVertical: 12, gap: 4 }}
            renderItem={({ item }) => (
              <Bubble m={item} mine={item.senderId === me?.id} isGroup={!!conv?.isGroup} othersReadAt={data?.othersReadAt ?? null} />
            )}
            ListEmptyComponent={
              <View className="py-16 items-center" style={{ transform: [{ scaleY: -1 }] }}>
                <Text className="text-ink-500 text-center px-8">
                  {conv?.isGroup ? 'Grupo criado. Mande a primeira mensagem!' : 'Comece a conversa — networking bom começa com um oi.'}
                </Text>
              </View>
            }
          />
        )}

        {/* composer pill (padrão CommentComposer, enxuto) */}
        <View className="flex-row items-end gap-2 px-3 pb-2 pt-1">
          <View className="flex-1 rounded-pill bg-surface-muted border border-surface-border px-4 py-2.5">
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Mensagem…"
              placeholderTextColor={colors.ink[400]}
              multiline
              className="text-ink-900 text-[15px] max-h-28 p-0"
            />
          </View>
          <Pressable
            onPress={send}
            disabled={!text.trim()}
            style={({ pressed }) => ({ opacity: !text.trim() ? 0.4 : pressed ? PRESSED_OPACITY : 1 })}
            className="w-11 h-11 rounded-full bg-brand-500 items-center justify-center"
          >
            <Icon name="send" set="light" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
