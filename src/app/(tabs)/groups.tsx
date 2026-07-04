import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Icon, type IconName } from '../../components/Icon';
import { EmptyState } from '../../components/EmptyState';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { useGroups, useToggleJoin } from '../../features/groups/hooks';
import { useMe } from '../../features/users/hooks';
import type { Group } from '../../features/groups/types';

type Seg = 'mine' | 'discover';

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

/** Aba COMUNIDADES: minhas | descobrir; fixadas primeiro; criar (conta profissional). */
export default function Communities() {
  const router = useRouter();
  const [seg, setSeg] = useState<Seg>('mine');
  const { data: groups } = useGroups({ mine: seg === 'mine' });
  const { data: me } = useMe();
  const toggleJoin = useToggleJoin();

  const joinLabel = (g: Group) => (g.joined ? 'Sair' : g.requested ? 'Pendente' : g.isPrivate ? 'Solicitar' : 'Entrar');

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-4 py-3 flex-row items-center justify-between">
        <Text className="text-2xl font-extrabold text-ink-900">Comunidades</Text>
        {me?.professional ? (
          <Pressable onPress={() => router.push('/group/new')} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
            <Icon name="plus" set="light" size={26} color={colors.brand[500]} />
          </Pressable>
        ) : null}
      </View>

      {/* segments */}
      <View className="flex-row border-b border-surface-border">
        {([['mine', 'Minhas'], ['discover', 'Descobrir']] as [Seg, string][]).map(([key, label]) => {
          const active = seg === key;
          return (
            <Pressable key={key} onPress={() => setSeg(key)} className={['flex-1 items-center py-3 border-b-2', active ? 'border-brand-500' : 'border-transparent'].join(' ')}>
              <Text className={active ? 'text-ink-900 font-semibold' : 'text-ink-500'}>{label}</Text>
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
                {item.isPrivate ? <Icon name="verified" set="light" size={13} color={colors.ink[400]} /> : null}
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
          <View className="pt-24">
            <EmptyState
              icon="groups"
              title={seg === 'mine' ? 'Você ainda não participa de comunidades' : 'Nenhuma comunidade ainda'}
              subtitle={seg === 'mine' ? 'Explore a aba Descobrir e entre nas que fazem sentido pro seu negócio.' : undefined}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}
