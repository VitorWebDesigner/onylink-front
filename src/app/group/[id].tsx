import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PostCard } from '../../components/PostCard';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Icon, type IconName } from '../../components/Icon';
import { MembersSheet } from '../../components/community/MembersSheet';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { useFeaturePost, useGroup, useGroupPosts, useTogglePinGroup, useToggleJoin } from '../../features/groups/hooks';
import { useToast } from '../../components/feedback/toast';
import { useFollowFlow } from '../../components/follow/FollowFlowProvider';
import { useAuth } from '../../store/auth';
import { useToggleInsight, useToggleLike, useToggleRepost, useToggleShare, useToggleTopCommentReaction } from '../../features/feed/hooks';
import type { FeedPost } from '../../features/feed/types';

/** Comunidade: identidade + entrar/solicitar + membros + feed (só membros) + admin. */
export default function CommunityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const me = useAuth((s) => s.user);
  const followFlow = useFollowFlow();
  const { data: group, isLoading } = useGroup(id);
  const isMember = !!group?.joined;
  const isAdmin = group?.myRole === 'ADMIN';
  const { data: posts, isLoading: loadingPosts } = useGroupPosts(id, isMember);
  const toggleJoin = useToggleJoin();
  const togglePin = useTogglePinGroup();
  const feature = useFeaturePost(id);
  const toggleInsight = useToggleInsight();
  const toggleLike = useToggleLike();
  const toggleRepost = useToggleRepost();
  const toggleShare = useToggleShare();
  const toggleTopComment = useToggleTopCommentReaction();
  const [membersOpen, setMembersOpen] = useState(false);
  const [adminTarget, setAdminTarget] = useState<FeedPost | null>(null); // menu do admin no post

  const joinTitle = group?.joined ? 'Sair da comunidade' : group?.requested ? 'Pedido enviado — cancelar' : group?.isPrivate ? 'Solicitar entrada' : 'Entrar na comunidade';

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border">
        <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP}>
          <Icon name="back" size={24} color={colors.ink[900]} />
        </Pressable>
        <Text className="text-ink-900 font-semibold text-base flex-1" numberOfLines={1}>{group?.name ?? 'Comunidade'}</Text>
        {group?.joined ? (
          <Pressable
            onPress={() => togglePin.mutate({ id: group.id, pinned: group.pinned }, { onError: (e) => toast.error(e instanceof Error ? e.message : 'Não foi possível fixar.') })}
            hitSlop={HIT_SLOP}
            style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
          >
            <Icon name="bookmark" set={group.pinned ? 'bold' : 'light'} size={22} color={group.pinned ? colors.brand[500] : colors.ink[900]} />
          </Pressable>
        ) : null}
        {isAdmin ? (
          <Pressable onPress={() => router.push({ pathname: '/group/edit', params: { id } })} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
            <Icon name="edit" set="light" size={22} color={colors.ink[900]} />
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.brand[500]} /></View>
      ) : !group ? (
        <View className="flex-1 items-center justify-center">
          <EmptyState icon="groups" title="Comunidade não encontrada" />
        </View>
      ) : (
        <FlatList
          data={isMember ? posts ?? [] : []}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              isAuthor={item.authorId === me?.id}
              onMenu={isAdmin ? (po) => setAdminTarget(po) : undefined}
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
                  <View className="flex-row items-center gap-1.5">
                    {group.isPrivate ? <Icon name="verified" set="light" size={16} color={colors.ink[500]} /> : null}
                    <Text className="text-ink-900 font-extrabold text-xl text-center">{group.name}</Text>
                  </View>
                  {/* membros TOCÁVEL → sheet (decisão §5 item 4) */}
                  <Pressable onPress={() => setMembersOpen(true)} hitSlop={6} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
                    <Text className="text-ink-500 text-[13px]">
                      {[group.segment, group.city].filter(Boolean).join(' · ')}{group.segment || group.city ? ' · ' : ''}
                      <Text className="text-brand-500 font-semibold">{group.memberCount.toLocaleString('pt-BR')} membros</Text>
                      {group.isPrivate ? ' · Privada' : ''}
                    </Text>
                  </Pressable>
                </View>
                {group.description ? <Text className="text-ink-700 leading-5 text-center px-2">{group.description}</Text> : null}
                <View className="w-full pt-1 gap-3">
                  <Button
                    title={joinTitle}
                    variant={group.joined || group.requested ? 'secondary' : 'accent'}
                    onPress={() => toggleJoin.mutate({ id: group.id, joined: group.joined, isPrivate: group.isPrivate, requested: group.requested })}
                  />
                  {isMember ? (
                    <Button
                      title="Publicar na comunidade"
                      variant="primary"
                      onPress={() => router.push({ pathname: '/compose', params: { groupId: group.id, groupName: group.name } })}
                    />
                  ) : null}
                </View>
              </View>
              {isMember ? <Text className="text-ink-900 font-semibold text-base">Publicações</Text> : null}
            </View>
          }
          ListEmptyComponent={
            !isMember ? (
              <View className="pt-6 px-6">
                <EmptyState
                  icon="groups"
                  title="Conteúdo exclusivo para membros"
                  subtitle={group.isPrivate ? 'Solicite a entrada — o admin precisa aprovar.' : 'Entre na comunidade para ver e criar publicações.'}
                />
              </View>
            ) : loadingPosts ? (
              <View className="py-10 items-center"><ActivityIndicator color={colors.brand[500]} /></View>
            ) : (
              <View className="pt-6">
                <EmptyState icon="comment" title="Sem publicações ainda" subtitle="Seja o primeiro a publicar nesta comunidade." />
              </View>
            )
          }
        />
      )}

      {/* membros / pedidos */}
      {group ? (
        <MembersSheet groupId={group.id} isAdmin={!!isAdmin} isPrivate={group.isPrivate} visible={membersOpen} onClose={() => setMembersOpen(false)} />
      ) : null}

      {/* menu do ADMIN no post: repostar/remover do feed geral (decisão §5.1) */}
      <BottomSheet visible={!!adminTarget} onClose={() => setAdminTarget(null)}>
        <View className="pb-2">
          <Pressable
            onPress={() => {
              if (adminTarget) {
                const currentlyFeatured = !!adminTarget.featuredByName;
                feature.mutate(
                  { postId: adminTarget.id, featured: currentlyFeatured },
                  { onError: (e) => toast.error(e instanceof Error ? e.message : 'Não foi possível atualizar.') },
                );
                toast.success(currentlyFeatured ? 'Removido do feed geral.' : 'Repostado no feed geral!');
              }
              setAdminTarget(null);
            }}
            style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
            className="flex-row items-center gap-3 px-4 py-4"
          >
            <Icon name="repost" set="light" size={22} color={colors.ink[900]} />
            <Text className="text-ink-900 font-semibold text-[15px]">
              {adminTarget?.featuredByName ? 'Remover do feed geral' : 'Repostar no feed geral'}
            </Text>
          </Pressable>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
