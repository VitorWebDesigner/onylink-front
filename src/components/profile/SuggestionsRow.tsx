import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '../Avatar';
import { Button } from '../Button';
import { PRESSED_OPACITY } from '../../theme/tokens';
import { useFollowSuggestions, useFollowUser } from '../../features/connections/hooks';

/**
 * "Sugestões para você" no perfil público (estilo Threads, sem cara de card —
 * itens soltos). Semente = o dono do perfil aberto (mesmo segmento/cidade).
 * Seguir aplica direto (otimista local), sem abrir o follow-flow.
 */
export function SuggestionsRow({ seedId, excludeId }: { seedId: string; excludeId?: string }) {
  const router = useRouter();
  const { data } = useFollowSuggestions(seedId, true);
  const follow = useFollowUser();
  const [followed, setFollowed] = useState<Record<string, boolean>>({});

  const items = (data ?? []).filter((s) => s.id !== excludeId);
  if (!items.length) return null;

  return (
    <View className="pt-5">
      <Text className="text-ink-700 font-semibold text-sm px-4 pb-3">Sugestões para você</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 20 }}>
        {items.map((s) => {
          const isFollowed = !!followed[s.id];
          return (
            <View key={s.id} className="items-center gap-1.5" style={{ width: 116 }}>
              <Pressable
                onPress={() => router.push({ pathname: '/user/[id]', params: { id: s.id } })}
                style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
                className="items-center gap-1.5"
              >
                <Avatar name={s.name} uri={s.avatarPath} size="xxl" />
                <View className="items-center">
                  <Text className="text-ink-900 font-semibold text-[13px]" numberOfLines={1}>{s.name}</Text>
                  <Text className="text-ink-400 text-xs" numberOfLines={1}>@{s.handle}</Text>
                </View>
              </Pressable>
              <View style={{ width: 104 }}>
                <Button
                  title={isFollowed ? 'Seguindo' : 'Seguir'}
                  size="sm"
                  variant={isFollowed ? 'secondary' : 'primary'}
                  onPress={() => {
                    setFollowed((f) => ({ ...f, [s.id]: !isFollowed }));
                    follow.mutate({ userId: s.id, followed: isFollowed });
                  }}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
