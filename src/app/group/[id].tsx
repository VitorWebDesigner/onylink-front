import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PostCard } from '../../components/PostCard';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Icon, type IconName } from '../../components/Icon';
import { colors } from '../../theme/colors';
import { HIT_SLOP } from '../../theme/tokens';
import { useGroup, useGroupPosts, useToggleJoin } from '../../features/groups/hooks';
import { useToast } from '../../components/feedback/toast';
import { useToggleInsight, useToggleLike, useToggleRepost, useToggleShare } from '../../features/feed/hooks';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const group = useGroup(id);
  const { data: posts } = useGroupPosts(id);
  const toggleJoin = useToggleJoin();
  const toggleInsight = useToggleInsight();
  const toggleLike = useToggleLike();
  const toggleRepost = useToggleRepost();
  const toggleShare = useToggleShare();

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border">
        <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP}>
          <Icon name="back" size={24} color={colors.ink[900]} />
        </Pressable>
        <Text className="text-ink-900 font-semibold text-base" numberOfLines={1}>{group?.name ?? 'Grupo'}</Text>
      </View>

      {!group ? (
        <View className="flex-1 items-center justify-center">
          <EmptyState icon="groups" title="Grupo não encontrado" />
        </View>
      ) : (
        <FlatList
          data={posts ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onToggleInsight={(p) => toggleInsight.mutate({ postId: p.id, insighted: p.insighted })}
              onToggleLike={(p) => toggleLike.mutate({ postId: p.id, liked: p.liked })}
              onOpen={(p) => router.push({ pathname: '/post/[id]', params: { id: p.id } })}
              onToggleRepost={(p) => { toggleRepost.mutate({ postId: p.id, reposted: p.reposted }); if (!p.reposted) toast.success('Repostado!'); }}
              onToggleShare={(p) => toggleShare.mutate({ postId: p.id, shared: p.shared })}
            />
          )}
          ListHeaderComponent={
            <View className="gap-4 pb-2">
              <View className="items-center gap-3 pt-2">
                <View className="w-16 h-16 rounded-full bg-accent-50 items-center justify-center">
                  <Icon name={group.icon as IconName} size={30} color={colors.brand[500]} />
                </View>
                <View className="items-center gap-1">
                  <Text className="text-ink-900 font-extrabold text-xl text-center">{group.name}</Text>
                  <Text className="text-ink-500 text-[13px]">
                    {group.segment}{group.city ? ` · ${group.city}` : ''} · {group.membersCount.toLocaleString('pt-BR')} membros
                  </Text>
                </View>
                <Text className="text-ink-700 leading-5 text-center px-2">{group.description}</Text>
                <View className="w-full pt-1">
                  <Button
                    title={group.joined ? 'Sair do grupo' : 'Entrar no grupo'}
                    variant={group.joined ? 'secondary' : 'accent'}
                    onPress={() => toggleJoin.mutate({ id: group.id, joined: group.joined })}
                  />
                </View>
              </View>
              <Text className="text-ink-900 font-semibold text-base">Publicações do grupo</Text>
            </View>
          }
          ListEmptyComponent={
            <View className="pt-10">
              <EmptyState icon="comment" title="Sem publicações ainda" subtitle="Seja o primeiro a publicar neste grupo." />
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
