import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Button } from '../Button';
import { Icon, type IconName } from '../Icon';
import { EmptyState } from '../EmptyState';
import { colors } from '../../theme/colors';
import { PRESSED_OPACITY } from '../../theme/tokens';
import { useGroups, useToggleJoin } from '../../features/groups/hooks';
import type { Group } from '../../features/groups/types';

/** Círculo da comunidade: foto, ícone (mock) ou inicial. */
export function CommunityCircle({ g, size = 48 }: { g: Group; size?: number }) {
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

type Filter = 'mine' | 'discover';

/** Lista de COMUNIDADES (aba dentro de Mensagens): Minhas | Descobrir, fixadas 1º. */
export function CommunitiesList() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('mine');
  const { data: groups } = useGroups({ mine: filter === 'mine' });
  const toggleJoin = useToggleJoin();

  const joinLabel = (g: Group) => (g.joined ? 'Sair' : g.requested ? 'Pendente' : g.isPrivate ? 'Solicitar' : 'Entrar');

  return (
    <View className="flex-1">
      {/* filtro Minhas | Descobrir (chips) */}
      <View className="flex-row gap-2 px-4 py-3">
        {([['mine', 'Minhas'], ['discover', 'Descobrir']] as [Filter, string][]).map(([key, label]) => {
          const active = filter === key;
          return (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
              className={['px-4 h-8 rounded-pill items-center justify-center border', active ? 'bg-accent-500 border-accent-500' : 'bg-surface-muted border-surface-border'].join(' ')}
            >
              <Text className={active ? 'text-brand-500 font-semibold text-sm' : 'text-ink-500 text-sm'}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={groups ?? []}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/group/[id]', params: { id: item.id } })}
            style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
            className="flex-row items-center gap-3 px-4 py-4 border-b border-surface-border"
          >
            <CommunityCircle g={item} />
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                {item.pinned ? <Icon name="bookmark" set="bold" size={12} color={colors.ink[400]} /> : null}
                <Text className="text-ink-900 font-semibold shrink" numberOfLines={1}>{item.name}</Text>
              </View>
              <Text className="text-ink-500 text-[13px]" numberOfLines={1}>
                {[item.segment, item.city].filter(Boolean).join(' · ')}{item.segment || item.city ? ' · ' : ''}{item.memberCount.toLocaleString('pt-BR')} membros{item.isPrivate ? ' · Privada' : ''}
              </Text>
            </View>
            <Button
              title={joinLabel(item)}
              variant={item.joined || item.requested ? 'secondary' : 'accent'}
              size="sm"
              onPress={() => toggleJoin.mutate({ id: item.id, joined: item.joined, isPrivate: item.isPrivate, requested: item.requested })}
            />
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="pt-20">
            <EmptyState
              icon="groups"
              title={filter === 'mine' ? 'Você ainda não participa de comunidades' : 'Nenhuma comunidade ainda'}
              subtitle={filter === 'mine' ? 'Toque em Descobrir e entre nas que fazem sentido pro seu negócio.' : undefined}
            />
          </View>
        }
      />
    </View>
  );
}
