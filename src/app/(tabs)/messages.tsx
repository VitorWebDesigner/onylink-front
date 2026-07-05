import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { CommunitiesList } from '../../components/community/CommunitiesList';
import { CountBadge } from '../../components/CountBadge';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { timeAgo } from '../../lib/time';
import { useAuth } from '../../store/auth';
import { useMe } from '../../features/users/hooks';
import { useConversations, useMessagesBadges } from '../../features/messages/hooks';
import { conversationPhoto, conversationTitle, type Conversation } from '../../features/messages/types';

type Seg = 'chats' | 'groups' | 'communities';

function Segment({ value, onChange, badges }: { value: Seg; onChange: (s: Seg) => void; badges: Record<Seg, number> }) {
  const items: { key: Seg; label: string }[] = [
    { key: 'chats', label: 'Conversas' },
    { key: 'groups', label: 'Grupos' },
    { key: 'communities', label: 'Comunidades' },
  ];
  return (
    <View className="flex-row border-b border-surface-border">
      {items.map((it) => {
        const active = value === it.key;
        return (
          <Pressable key={it.key} onPress={() => onChange(it.key)} className={['flex-1 items-center py-3 border-b-2', active ? 'border-brand-500' : 'border-transparent'].join(' ')}>
            <View className="flex-row items-center gap-1.5">
              <Text className={active ? 'text-ink-900 font-semibold' : 'text-ink-500'}>{it.label}</Text>
              {/* soma do NÃO VISTO/NÃO RESOLVIDO da aba */}
              <CountBadge count={badges[it.key]} size={16} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Row de conversa/grupo de chat (padrão WhatsApp: foto · nome · última msg · hora · badge). */
function ConversationRow({ c, meId, onPress }: { c: Conversation; meId?: string; onPress: () => void }) {
  const last = c.lastContent
    ? `${c.lastSenderId === meId ? 'Você: ' : ''}${c.lastContent}`
    : c.isGroup ? 'Grupo criado — diga olá!' : 'Comece a conversa';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-row items-center gap-3 px-4 py-3.5 border-b border-surface-border">
      <Avatar name={conversationTitle(c)} uri={conversationPhoto(c)} size="lg" />
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          {c.pinned ? (
            <View style={{ opacity: 0.45 }}><Icon name="bookmark" set="bold" size={12} color={colors.ink[900]} /></View>
          ) : null}
          <Text className="text-ink-900 font-semibold shrink" numberOfLines={1}>{conversationTitle(c)}</Text>
        </View>
        <Text className="text-ink-500 text-[13px]" numberOfLines={1}>{last}</Text>
      </View>
      <View className="items-end gap-1">
        {c.lastCreatedAt ? <Text className="text-ink-400 text-micro">{timeAgo(c.lastCreatedAt)}</Text> : null}
        <CountBadge count={c.unreadCount} />
      </View>
    </Pressable>
  );
}

export default function Messages() {
  const router = useRouter();
  const [seg, setSeg] = useState<Seg>('chats');
  const me = useAuth((s) => s.user);
  const { data: meProfile } = useMe();
  const badges = useMessagesBadges();
  const { data: convs, isLoading } = useConversations();

  const chats = (convs ?? []).filter((c) => !c.isGroup);
  const groups = (convs ?? []).filter((c) => c.isGroup);

  const list = (data: Conversation[], empty: { title: string; subtitle?: string }) =>
    isLoading ? (
      <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.brand[500]} /></View>
    ) : (
      <FlatList
        data={data}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <ConversationRow c={item} meId={me?.id} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })} />
        )}
        ListEmptyComponent={
          <View className="pt-24">
            <EmptyState icon={seg === 'chats' ? 'chat' : 'groups'} title={empty.title} subtitle={empty.subtitle} />
          </View>
        }
      />
    );

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-4 py-3 flex-row items-center justify-between">
        <Text className="text-2xl font-extrabold text-ink-900">Mensagens</Text>
        {/* ➕ do contexto: grupo de chat (todos) · comunidade (conta profissional) */}
        {seg === 'groups' ? (
          <Pressable onPress={() => router.push('/chat/new')} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
            <Icon name="plus" set="light" size={26} color={colors.brand[500]} />
          </Pressable>
        ) : seg === 'communities' && meProfile?.professional ? (
          <Pressable onPress={() => router.push('/group/new')} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
            <Icon name="plus" set="light" size={26} color={colors.brand[500]} />
          </Pressable>
        ) : null}
      </View>
      <Segment value={seg} onChange={setSeg} badges={{ chats: badges.chats, groups: badges.groups, communities: badges.communities }} />

      {seg === 'chats' ? (
        list(chats, { title: 'Nenhuma conversa ainda', subtitle: 'Toque em Mensagem no perfil de alguém para começar.' })
      ) : seg === 'groups' ? (
        list(groups, { title: 'Nenhum grupo de conversa', subtitle: 'Toque no + para criar um grupo com quem você segue.' })
      ) : (
        <CommunitiesList />
      )}
    </SafeAreaView>
  );
}
