import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions, type ListRenderItem } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { PostCard } from '../PostCard';
import { CompactPostRow } from './CompactPostRow';
import { OpportunityCard } from '../OpportunityCard';
import { Icon } from '../Icon';
import { useFollowFlow } from '../follow/FollowFlowProvider';
import { useToast } from '../feedback/toast';
import { colors } from '../../theme/colors';
import { PRESSED_OPACITY } from '../../theme/tokens';
import { timeAgo } from '../../lib/time';
import { useAuth } from '../../store/auth';
import { useToggleInsight, useToggleLike, useToggleRepost, useToggleShare, useToggleTopCommentReaction } from '../../features/feed/hooks';
import { useUserComments, useUserMedia, useUserPosts, useUserReposts, type UserCommentRow, type UserMediaItem } from '../../features/users/hooks';
import { useUserOpportunities } from '../../features/opportunities/hooks';
import type { FeedPost } from '../../features/feed/types';
import type { Opportunity } from '../../features/opportunities/types';

export type ProfileTab = 'posts' | 'replies' | 'media' | 'reposts' | 'opportunities';

const TABS: { key: ProfileTab; label: string }[] = [
  { key: 'posts', label: 'Publicações' },
  { key: 'replies', label: 'Respostas' },
  { key: 'media', label: 'Mídia' },
  { key: 'reposts', label: 'Reposts' },
  { key: 'opportunities', label: 'Oportunidades' },
];

/** Barra de abas do perfil (estilo Threads/X): texto + sublinhado no ativo. */
export function ProfileTabsBar({ tab, onChange }: { tab: ProfileTab; onChange: (t: ProfileTab) => void }) {
  return (
    <View className="border-b border-surface-border mt-5">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable key={t.key} onPress={() => onChange(t.key)} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="px-3 pb-2.5 pt-1">
              <Text className={active ? 'text-ink-900 font-bold text-sm' : 'text-ink-400 font-semibold text-sm'}>{t.label}</Text>
              {active ? <View className="absolute left-3 right-3 bottom-0 h-[2px] rounded-full bg-brand-500" /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const GRID_GAP = 2;

/**
 * Dados + renderItem da aba ativa do perfil. Uma FlatList única na tela hospeda
 * o conteúdo (header do perfil = ListHeaderComponent); troque `key={tab}` na
 * FlatList ao alternar (a aba Mídia usa numColumns=3).
 */
export function useProfileTabList(userId: string, tab: ProfileTab, opts?: { onPostMenu?: (p: FeedPost) => void }) {
  const router = useRouter();
  const toast = useToast();
  const followFlow = useFollowFlow();
  const me = useAuth((s) => s.user);
  const { width: screenW } = useWindowDimensions();
  const toggleInsight = useToggleInsight();
  const toggleLike = useToggleLike();
  const toggleRepost = useToggleRepost();
  const toggleShare = useToggleShare();
  const toggleTopComment = useToggleTopCommentReaction();

  const posts = useUserPosts(userId);
  const replies = useUserComments(userId, tab === 'replies');
  const media = useUserMedia(userId, tab === 'media');
  const reposts = useUserReposts(userId, tab === 'reposts');
  const opps = useUserOpportunities(userId, tab === 'opportunities');

  const cell = Math.floor((screenW - GRID_GAP * 2) / 3);

  const renderPost: ListRenderItem<FeedPost> = ({ item }) => (
    <PostCard
      post={item}
      isAuthor={item.authorId === me?.id}
      onMenu={opts?.onPostMenu}
      onToggleInsight={(po) => toggleInsight.mutate({ postId: po.id, insighted: po.insighted })}
      onToggleLike={(po) => toggleLike.mutate({ postId: po.id, liked: po.liked })}
      onToggleRepost={(po) => { toggleRepost.mutate({ postId: po.id, reposted: po.reposted }); if (!po.reposted) toast.success('Repostado!'); }}
      onToggleShare={(po) => toggleShare.mutate({ postId: po.id, shared: po.shared })}
      onCommentReact={(postId, commentId, kind, active) => toggleTopComment.mutate({ postId, commentId, kind, active })}
      onToggleFollow={(po) => { if (po.authorId) followFlow.start({ id: po.authorId, name: po.authorName, avatarPath: po.authorAvatar, followed: po.authorFollowed }); }}
      onOpen={(po) => router.push({ pathname: '/post/[id]', params: { id: po.id } })}
      onOpenAuthor={(po) => { if (po.authorId) router.push({ pathname: '/user/[id]', params: { id: po.authorId } }); }}
    />
  );

  // aba Publicações = linha COMPACTA (texto + thumb): posts com e sem mídia no mesmo
  // padrão visual, rolagem curta. Toque longo = menu (fixar) no próprio perfil.
  const renderCompact: ListRenderItem<FeedPost> = ({ item }) => (
    <CompactPostRow
      post={item}
      onPress={() => router.push({ pathname: '/post/[id]', params: { id: item.id } })}
      onLongPress={opts?.onPostMenu && item.authorId === me?.id ? () => opts.onPostMenu!(item) : undefined}
    />
  );

  const renderReply: ListRenderItem<UserCommentRow> = ({ item }) => (
    <Pressable
      onPress={() => router.push({ pathname: '/post/[id]', params: { id: item.postId } })}
      style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
      className="px-4 py-3 border-b border-surface-border gap-1"
    >
      <Text className="text-ink-400 text-xs" numberOfLines={1}>
        Em resposta a <Text className="font-semibold text-ink-500">{item.postAuthorName}</Text>
        {item.postContent ? ` · ${item.postContent}` : ''}
      </Text>
      <Text className="text-ink-700 leading-5">{item.content}</Text>
      <View className="flex-row items-center gap-4 pt-0.5">
        <Text className="text-ink-400 text-xs">{timeAgo(item.createdAt)}</Text>
        {item.insightCount ? <Text className="text-ink-400 text-xs">💡 {item.insightCount}</Text> : null}
        {item.likeCount ? <Text className="text-ink-400 text-xs">♥ {item.likeCount}</Text> : null}
        {item.replyCount ? <Text className="text-ink-400 text-xs">{item.replyCount} respostas</Text> : null}
      </View>
    </Pressable>
  );

  const renderMedia: ListRenderItem<UserMediaItem> = ({ item, index }) => (
    <Pressable
      onPress={() => router.push({ pathname: '/post/[id]', params: { id: item.postId } })}
      style={({ pressed }) => ({ width: cell, height: cell, marginLeft: index % 3 === 0 ? 0 : GRID_GAP, marginBottom: GRID_GAP, opacity: pressed ? 0.92 : 1 })}
    >
      <Image source={{ uri: item.type === 'VIDEO' ? item.thumbnail : item.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      {item.type === 'VIDEO' ? (
        <View style={{ position: 'absolute', top: 6, right: 6 }}>
          <Icon name="play" size={16} color="#FFFFFF" />
        </View>
      ) : null}
    </Pressable>
  );

  const renderOpp: ListRenderItem<Opportunity> = ({ item }) => (
    <OpportunityCard opportunity={item} onOpen={(o) => router.push({ pathname: '/opportunity/[id]', params: { id: o.id } })} />
  );

  return useMemo(() => {
    switch (tab) {
      case 'replies':
        return { data: replies.data ?? [], renderItem: renderReply as ListRenderItem<unknown>, keyExtractor: (i: unknown) => (i as UserCommentRow).id, numColumns: 1, loading: replies.isLoading, empty: 'Nenhuma resposta ainda' };
      case 'media':
        return { data: media.data ?? [], renderItem: renderMedia as ListRenderItem<unknown>, keyExtractor: (i: unknown) => `${(i as UserMediaItem).postId}-${(i as UserMediaItem).url}`, numColumns: 3, loading: media.isLoading, empty: 'Nenhuma mídia ainda' };
      case 'reposts':
        return { data: reposts.data ?? [], renderItem: renderPost as ListRenderItem<unknown>, keyExtractor: (i: unknown) => (i as FeedPost).id, numColumns: 1, loading: reposts.isLoading, empty: 'Nenhum repost ainda' };
      case 'opportunities':
        return { data: opps.data ?? [], renderItem: renderOpp as ListRenderItem<unknown>, keyExtractor: (i: unknown) => (i as Opportunity).id, numColumns: 1, loading: opps.isLoading, empty: 'Nenhuma oportunidade ainda' };
      default:
        return { data: posts.data ?? [], renderItem: renderCompact as ListRenderItem<unknown>, keyExtractor: (i: unknown) => (i as FeedPost).id, numColumns: 1, loading: posts.isLoading, empty: 'Nenhuma publicação ainda' };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, posts.data, replies.data, media.data, reposts.data, opps.data, posts.isLoading, replies.isLoading, media.isLoading, reposts.isLoading, opps.isLoading, cell]);
}
