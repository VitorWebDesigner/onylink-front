import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Icon, type IconName } from '../../components/Icon';
import { EmptyState } from '../../components/EmptyState';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { timeAgo } from '../../lib/time';
import { useGroups, useToggleJoin } from '../../features/groups/hooks';
import { useMe } from '../../features/users/hooks';
import type { Group } from '../../features/groups/types';

/** Círculo do grupo: capa, ícone (mock) ou inicial. */
function GroupCircle({ g, size = 48 }: { g: Group; size?: number }) {
  if (g.coverPath) {
    return <Image source={{ uri: g.coverPath }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2 }} className="bg-accent-50 items-center justify-center">
      {g.icon ? (
        <Icon name={g.icon as IconName} size={size / 2} color={colors.brand[500]} />
      ) : (
        <Text className="text-brand-500 font-bold" style={{ fontSize: size * 0.4 }}>{g.name.trim()[0]?.toUpperCase() ?? '?'}</Text>
      )}
    </View>
  );
}

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
  const router = useRouter();
  const [seg, setSeg] = useState<Seg>('chats');
  const { data: groups } = useGroups();
  const { data: me } = useMe();
  const toggleJoin = useToggleJoin();

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-4 py-3 flex-row items-center justify-between">
        <Text className="text-2xl font-extrabold text-ink-900">Mensagens</Text>
        {/* criar grupo: ADMIN ou conta profissional (gate espelhado no back) */}
        {seg === 'groups' && me?.professional ? (
          <Pressable onPress={() => router.push('/group/new')} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
            <Icon name="plus" set="light" size={26} color={colors.brand[500]} />
          </Pressable>
        ) : null}
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
        <FlatList
          data={groups ?? []}
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/group/[id]', params: { id: item.id } })}
              style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
              className="flex-row items-center gap-3 px-4 py-4 border-b border-surface-border"
            >
              <GroupCircle g={item} />
              <View className="flex-1">
                <Text className="text-ink-900 font-semibold" numberOfLines={1}>{item.name}</Text>
                <Text className="text-ink-500 text-[13px]" numberOfLines={1}>
                  {[item.segment, item.city].filter(Boolean).join(' · ')}{item.segment || item.city ? ' · ' : ''}{item.memberCount.toLocaleString('pt-BR')} membros
                </Text>
              </View>
              <Button title={item.joined ? 'Sair' : 'Entrar'} variant={item.joined ? 'secondary' : 'accent'} size="sm" onPress={() => toggleJoin.mutate({ id: item.id, joined: item.joined })} />
            </Pressable>
          )}
          ListEmptyComponent={<View className="pt-24"><EmptyState icon="groups" title="Sem grupos ainda" /></View>}
        />
      )}
    </SafeAreaView>
  );
}
