import { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View, type ViewToken } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PostCard } from '../../components/PostCard';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { TextLink } from '../../components/TextLink';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/feedback/toast';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { handleOf } from '../../lib/format';
import { useAuth } from '../../store/auth';
import { syncFeedLiveCounts, useFeed, useToggleInsight, useToggleLike, useToggleRepost, useToggleShare, useToggleTopCommentReaction } from '../../features/feed/hooks';
import { useUnreadCount } from '../../features/notifications/hooks';
import { useFollowFlow } from '../../components/follow/FollowFlowProvider';
import { useMediaUi } from '../../store/mediaUi';
import type { FeedPost } from '../../features/feed/types';

const LIVE_POLL_MS = 7000; // intervalo do polling de reações ao vivo (item 2)

export default function Feed() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch, isRefetching } = useFeed();
  const { data: unread } = useUnreadCount();
  const toggleInsight = useToggleInsight();
  const toggleLike = useToggleLike();
  const toggleRepost = useToggleRepost();
  const toggleShare = useToggleShare();
  const toggleTopComment = useToggleTopCommentReaction();
  const followFlow = useFollowFlow();
  const setActivePostId = useMediaUi((s) => s.setActivePostId);
  const listRef = useRef<FlatList<FeedPost>>(null);

  // Qual post está visível → só ELE faz autoplay (nunca 2 ao mesmo tempo). Threshold
  // 50% + escolhe o item do MEIO dos visíveis (não o primeiro/topo): assim o vídeo
  // que está entrando/centralizando toca ANTES de estar inteiro na tela, e o de cima
  // (saindo) para na hora.
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const vis = viewableItems.filter((v) => v.isViewable);
    const pick = vis[Math.floor(vis.length / 2)]?.item as FeedPost | undefined;
    setActivePostId(pick?.id ?? null);
  }).current;

  // Header contrai/expande 1:1 com o scroll (segue o dedo). Dirigido por REANIMATED
  // (thread nativa) — o onScroll é só um callback JS que escreve num shared value,
  // sem Animated.event(useNativeDriver:false), que no iOS conflitava com o
  // RefreshControl (contentInset preso → o prompt ficava "afastado" após atualizar).
  const scrollY = useSharedValue(0);
  const onScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    scrollY.value = e.nativeEvent.contentOffset.y;
  }, [scrollY]);
  const headerStyle = useAnimatedStyle(() => ({ paddingVertical: interpolate(scrollY.value, [0, 60], [20, 8], Extrapolation.CLAMP) }));
  const logoStyle = useAnimatedStyle(() => ({ fontSize: interpolate(scrollY.value, [0, 60], [24, 18], Extrapolation.CLAMP) }));

  // Tap na logo (item 6): atualiza o feed e volta ao topo.
  const refreshFromLogo = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    void refetch();
  }, [refetch]);

  // Reações de outros usuários sobem ao vivo enquanto o feed está em foco (item 2).
  useFocusEffect(
    useCallback(() => {
      const intv = setInterval(() => { void syncFeedLiveCounts(qc); }, LIVE_POLL_MS);
      return () => clearInterval(intv);
    }, [qc]),
  );

  // Prompt de compose (item 4): ListHeaderComponent → ROLA junto com o feed (só a top
  // bar fica fixa). MEMOIZADO → identidade estável: não remonta o header da FlatList a
  // cada refetch (o remount durante o refresh causava salto/gap).
  const composePrompt = useMemo(() => (
    <Pressable
      onPress={() => router.push('/compose')}
      style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
      className="flex-row items-center gap-3 px-4 py-6 border-b border-surface-border"
    >
      <Avatar name={user?.name} size="md" />
      <View className="flex-1">
        <Text className="text-ink-900 font-semibold text-sm">{handleOf(user)}</Text>
        <Text className="text-ink-400 text-base leading-5">Compartilhe uma ideia ou aprendizado de negócio…</Text>
      </View>
    </Pressable>
  ), [user, router]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Top bar FIXA que contrai/expande com o scroll: hambúrguer · "OnyLink" (tap = atualiza) · lupa + sino */}
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }, headerStyle]}>
        <View className="flex-1 flex-row">
          <Pressable onPress={() => {}} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
            <Icon name="menu" size={26} color={colors.ink[900]} />
          </Pressable>
        </View>
        <Pressable onPress={refreshFromLogo} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
          <Animated.Text style={[{ fontWeight: '800', color: colors.ink[900], letterSpacing: -0.5 }, logoStyle]}>OnyLink</Animated.Text>
        </Pressable>
        <View className="flex-1 flex-row items-center justify-end gap-4">
          <Pressable onPress={() => router.push('/search')} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
            <Icon name="search" set="light" size={24} color={colors.ink[900]} />
          </Pressable>
          <Pressable onPress={() => router.push('/notifications')} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
            <View>
              <Icon name="bell" set="light" size={24} color={colors.ink[900]} />
              {unread ? (
                <View className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] rounded-full bg-danger items-center justify-center px-1">
                  <Text className="text-white text-[10px] font-bold">{unread > 99 ? '99+' : unread}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        </View>
      </Animated.View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8 gap-3">
          <Text className="text-ink-500 text-center">Não foi possível carregar o feed.</Text>
          <TextLink onPress={() => refetch()}>Tentar novamente</TextLink>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={data ?? []}
          keyExtractor={(p) => p.id}
          ListHeaderComponent={composePrompt}
          onScroll={onScroll}
          scrollEventThrottle={16}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableChanged}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand[500]} />}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onToggleInsight={(p: FeedPost) => toggleInsight.mutate({ postId: p.id, insighted: p.insighted })}
              onToggleLike={(p: FeedPost) => toggleLike.mutate({ postId: p.id, liked: p.liked })}
              onToggleRepost={(p) => { toggleRepost.mutate({ postId: p.id, reposted: p.reposted }); if (!p.reposted) toast.success('Repostado!'); }}
              onToggleShare={(p) => toggleShare.mutate({ postId: p.id, shared: p.shared })}
              onCommentReact={(postId, commentId, kind, active) => toggleTopComment.mutate({ postId, commentId, kind, active })}
              onToggleFollow={(p) => { if (p.authorId) followFlow.start({ id: p.authorId, name: p.authorName, avatarPath: p.authorAvatar, followed: p.authorFollowed }); }}
              isAuthor={item.authorId === user?.id}
              onOpen={(p) => router.push({ pathname: '/post/[id]', params: { id: p.id } })}
              onOpenAuthor={(p) => { if (p.authorId) router.push({ pathname: '/user/[id]', params: { id: p.authorId } }); }}
            />
          )}
          ListEmptyComponent={
            <View className="pt-24">
              <EmptyState icon="paper" title="Feed vazio por enquanto" subtitle="Seja o primeiro a publicar algo de valor para a comunidade." />
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
