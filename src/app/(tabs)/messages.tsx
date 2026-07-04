import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { PRESSED_OPACITY } from '../../theme/tokens';
import { timeAgo } from '../../lib/time';

type Seg = 'chats' | 'groups';

// Conversas mockadas (módulo de mensagens 1:1 ainda não tem backend).
const CONVERSATIONS = [
  { id: 'cv1', name: 'Ana Ribeiro', last: 'Perfeito, fechamos então!', at: '2026-06-29T10:00:00.000Z' },
  { id: 'cv2', name: 'Carlos Pena', last: 'Te mando a proposta hoje à tarde.', at: '2026-06-29T08:20:00.000Z' },
  { id: 'cv3', name: 'Marina Souza', last: 'Boa! Bora marcar um café.', at: '2026-06-28T17:05:00.000Z' },
];

function Segment({ value, onChange }: { value: Seg; onChange: (s: Seg) => void }) {
  const items: { key: Seg; label: string }[] = [
    { key: 'chats', label: 'Mensagens' },
    { key: 'groups', label: 'Grupos' },
  ];
  return (
    <View className="flex-row border-b border-surface-border">
      {items.map((it) => {
        const active = value === it.key;
        return (
          <Pressable key={it.key} onPress={() => onChange(it.key)} className={['flex-1 items-center py-3 border-b-2', active ? 'border-brand-500' : 'border-transparent'].join(' ')}>
            <Text className={active ? 'text-ink-900 font-semibold' : 'text-ink-500'}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function Messages() {
  const [seg, setSeg] = useState<Seg>('chats');

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-4 py-3">
        <Text className="text-2xl font-extrabold text-ink-900">Mensagens</Text>
      </View>
      <Segment value={seg} onChange={setSeg} />

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
      ) : (
        <View className="pt-24">
          {/* grupos de CHAT (estilo WhatsApp) — Fase B do plano-grupos-comunidades.md */}
          <EmptyState
            icon="groups"
            title="Grupos de conversa em breve"
            subtitle="Converse em grupo com outros empresários — estamos construindo. Comunidades por tema já estão na aba Comunidades."
          />
        </View>
      )}
    </SafeAreaView>
  );
}
