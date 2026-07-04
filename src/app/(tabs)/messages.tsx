import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
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
import { useMe } from '../../features/users/hooks';
import { useMessagesBadges } from '../../features/groups/hooks';

type Seg = 'chats' | 'groups' | 'communities';

// Conversas mockadas (módulo de mensagens 1:1 = Fase B do plano-grupos-comunidades).
const CONVERSATIONS = [
  { id: 'cv1', name: 'Ana Ribeiro', last: 'Perfeito, fechamos então!', at: '2026-06-29T10:00:00.000Z' },
  { id: 'cv2', name: 'Carlos Pena', last: 'Te mando a proposta hoje à tarde.', at: '2026-06-29T08:20:00.000Z' },
  { id: 'cv3', name: 'Marina Souza', last: 'Boa! Bora marcar um café.', at: '2026-06-28T17:05:00.000Z' },
];

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
              {/* soma do NÃO VISTO/NÃO RESOLVIDO da aba (posts novos + pedidos) */}
              <CountBadge count={badges[it.key]} size={16} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function Messages() {
  const router = useRouter();
  const [seg, setSeg] = useState<Seg>('chats');
  const { data: me } = useMe();
  const badges = useMessagesBadges();

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-4 py-3 flex-row items-center justify-between">
        <Text className="text-2xl font-extrabold text-ink-900">Mensagens</Text>
        {/* criar comunidade (conta profissional) */}
        {seg === 'communities' && me?.professional ? (
          <Pressable onPress={() => router.push('/group/new')} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
            <Icon name="plus" set="light" size={26} color={colors.brand[500]} />
          </Pressable>
        ) : null}
      </View>
      <Segment value={seg} onChange={setSeg} badges={{ chats: badges.chats, groups: badges.groups, communities: badges.communities }} />

      {seg === 'chats' ? (
        <FlatList
          data={CONVERSATIONS}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {}}
              style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
              className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border"
            >
              <Avatar name={item.name} size="lg" />
              <View className="flex-1">
                <Text className="text-ink-900 font-semibold text-sm">{item.name}</Text>
                <Text className="text-ink-500 text-[13px]" numberOfLines={1}>{item.last}</Text>
              </View>
              <Text className="text-ink-400 text-micro">{timeAgo(item.at)}</Text>
            </Pressable>
          )}
        />
      ) : seg === 'groups' ? (
        <View className="pt-24">
          {/* grupos de CHAT (estilo WhatsApp) — Fase B do plano-grupos-comunidades.md */}
          <EmptyState
            icon="groups"
            title="Grupos de conversa em breve"
            subtitle="Converse em grupo com outros empresários — estamos construindo."
          />
        </View>
      ) : (
        <CommunitiesList />
      )}
    </SafeAreaView>
  );
}
