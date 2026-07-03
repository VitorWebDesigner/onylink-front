import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
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
import { useFollowFlow } from '../../components/follow/FollowFlowProvider';
import { useAuth } from '../../store/auth';
import { useToggleInsight, useToggleLike, useToggleRepost, useToggleShare, useToggleTopCommentReaction } from '../../features/feed/hooks';

/** Tela do grupo: identidade + entrar/sair + publicar + feed do grupo (real). */
export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const me = useAuth((s) => s.user);
  const followFlow = useFollowFlow();
  const { data: group, isLoading } = useGroup(id);
  const { data: posts, isLoading: loadingPosts } = useGroupPosts(id);
  const toggleJoin = useToggleJoin();
  const toggleInsight = useToggleInsight();
  const toggleLike = useToggleLike();
  const toggleRepost = useToggleRepost();
  const toggleShare = useToggleShare();
  const toggleTopComment = useToggleTopCommentReaction();

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border">
        <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP}>
          <Icon name="back" size={24} color={colors.ink[900]} />
        </Pressable>
        <Text className="text-ink-900 font-semibold text-base" numberOfLines={1}>{group?.name ?? 'Grupo'}</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.brand[500]} /></View>
      ) : !group ? (
        <View className="flex-1 items-center justify-center">
          <EmptyState icon="groups" title="Grupo não encontrado" />
        </View>
      ) : (
        <FlatList
          data={posts ?? []}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              isAuthor={item.authorId === me?.id}
              onToggleInsight={(p) => toggleInsight.mutate({ postId: p.id, insighted: p.insighted })}
              onToggleLike={(p) => toggleLike.mutate({ postId: p.id, liked: p.liked })}
              onToggleRepost={(p) => { toggleRepost.mutate({ postId: p.id, reposted: p.reposted }); if (!p.reposted) toast.success('Repostado!'); }}
              onToggleShare={(p) => toggleShare.mutate({ postId: p.id, shared: p.shared })}
              onCommentReact={(postId, commentId, kind, active) => toggleTopComment.mutate({ postId, commentId, kind, active })}
              onToggleFollow={(p) => { if (p.authorId) followFlow.start({ id: p.authorId, name: p.authorName, avatarPath: p.authorAvatar, followed: p.authorFollowed }); }}
              onOpen={(p) => router.push({ pathname: '/post/[id]', params: { id: p.id } })}
              onOpenAuthor={(p) => { if (p.authorId) router.push({ pathname: '/user/[id]', params: { id: p.authorId } }); }}
              onComment={(p) => router.push({ pathname: '/post/[id]', params: { id: p.id, focus: '1' } })}
              onOpenUser={(userId) => router.push({ pathname: '/user/[id]', params: { id: userId } })}
            />
          )}
          ListHeaderComponent={
            <View className="gap-4 px-4 pb-2 pt-2">
              <View className="items-center gap-3">
                {group.coverPath ? (
                  <Image source={{ uri: group.coverPath }} style={{ width: 72, height: 72, borderRadius: 36 }} contentFit="cover" />
                ) : (
                  <View className="w-[72px] h-[72px] rounded-full bg-accent-50 items-center justify-center">
                    {group.icon ? (
                      <Icon name={group.icon as IconName} size={32} color={colors.brand[500]} />
                    ) : (
                      <Text className="text-brand-500 font-bold text-2xl">{group.name.trim()[0]?.toUpperCase() ?? '?'}</Text>
                    )}
                  </View>
                )}
                <View className="items-center gap-1">
                  <Text className="text-ink-900 font-extrabold text-xl text-center">{group.name}</Text>
                  <Text className="text-ink-500 text-[13px]">
                    {[group.segment, group.city].filter(Boolean).join(' · ')}{group.segment || group.city ? ' · ' : ''}{group.memberCount.toLocaleString('pt-BR')} membros
                  </Text>
                </View>
                {group.description ? <Text className="text-ink-700 leading-5 text-center px-2">{group.description}</Text> : null}
                <View className="w-full pt-1 gap-3">
                  <Button
                    title={group.joined ? 'Sair do grupo' : 'Entrar no grupo'}
                    variant={group.joined ? 'secondary' : 'accent'}
                    onPress={() => toggleJoin.mutate({ id: group.id, joined: group.joined })}
                  />
                  {group.joined ? (
                    <Button
                      title="Publicar no grupo"
                      variant="primary"
                      onPress={() => router.push({ pathname: '/compose', params: { groupId: group.id, groupName: group.name } })}
                    />
                  ) : null}
                </View>
              </View>
              <Text className="text-ink-900 font-semibold text-base">Publicações do grupo</Text>
            </View>
          }
          ListEmptyComponent={
            loadingPosts ? (
              <View className="py-10 items-center"><ActivityIndicator color={colors.brand[500]} /></View>
            ) : (
              <View className="pt-6">
                <EmptyState icon="comment" title="Sem publicações ainda" subtitle="Seja o primeiro a publicar neste grupo." />
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}
