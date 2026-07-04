import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { PostCard } from '../../components/PostCard';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { CommunityCircle } from '../../components/community/CommunitiesList';
import { CountBadge } from '../../components/CountBadge';
import type { Group } from '../../features/groups/types';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { useFeaturePost, useGroup, useGroupPosts, useToggleJoin } from '../../features/groups/hooks';
import { useToast } from '../../components/feedback/toast';
import { useFollowFlow } from '../../components/follow/FollowFlowProvider';
import { useAuth } from '../../store/auth';
import { syncListLiveCounts, useToggleInsight, useToggleLike, useToggleRepost, useToggleShare, useToggleTopCommentReaction } from '../../features/feed/hooks';
import type { FeedPost } from '../../features/feed/types';

/**
 * Tela da COMUNIDADE (feed). Header estilo WhatsApp: foto + nome TOCÁVEIS →
 * "Dados da comunidade" (onde vivem sair/fixar/editar/membros/solicitações).
 * Aqui: só o feed + ➕ publicar (membro).
 */
export default function CommunityFeed() {
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
  const feature = useFeaturePost(id);
  const toggleInsight = useToggleInsight();
  const toggleLike = useToggleLike();
  const toggleRepost = useToggleRepost();
  const toggleShare = useToggleShare();
  const toggleTopComment = useToggleTopCommentReaction();
  const [adminTarget, setAdminTarget] = useState<FeedPost | null>(null);
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();

  // reações de OUTROS sobem ao vivo no feed da comunidade (mesmo polling de 7s
  // do feed geral) enquanto a tela está em foco
  useFocusEffect(
    useCallback(() => {
      if (!isMember) return;
      const intv = setInterval(() => { void syncListLiveCounts(qc, ['group-posts', id]); }, 7000);
      return () => clearInterval(intv);
    }, [isMember, id, qc]),
  );

  // abrir o feed marca "visto" no back — zera a bolinha de não visto na hora,
  // sem esperar o próximo refetch/polling da lista
  useEffect(() => {
    if (!isMember || !posts) return;
    qc.setQueriesData<Group[]>({ queryKey: ['groups'] }, (old) =>
      old?.map((g) => (g.id === id ? { ...g, unreadPosts: 0 } : g)),
    );
  }, [isMember, posts, id, qc]);

  const openDetails = () => router.push({ pathname: '/group/details', params: { id } });

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* header: voltar · foto+nome (→ dados) · ➕ publicar */}
      <View className="flex-row items-center gap-3 px-4 py-2.5 border-b border-surface-border">
        <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP}>
          <Icon name="back" size={24} color={colors.ink[900]} />
        </Pressable>
        {group ? (
          <Pressable onPress={openDetails} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-1 flex-row items-center gap-2.5">
            <CommunityCircle g={group} size={36} />
            <View className="flex-1">
              <Text className="text-ink-900 font-semibold text-[15px]" numberOfLines={1}>{group.name}</Text>
              <Text className="text-ink-400 text-xs" numberOfLines={1}>
                {group.memberCount.toLocaleString('pt-BR')} membros{group.isPrivate ? ' · Privada' : ''} · toque p/ dados
              </Text>
            </View>
          </Pressable>
        ) : (
          <Text className="text-ink-900 font-semibold text-base flex-1">Comunidade</Text>
        )}
        {/* solicitações pendentes (admin) — badge no sino leva direto aos dados */}
        {group && group.pendingRequests > 0 ? (
          <Pressable onPress={openDetails} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
            <View>
              <Icon name="bell" set="light" size={24} color={colors.ink[900]} />
              <View className="absolute -top-1.5 -right-2">
                <CountBadge count={group.pendingRequests} size={16} />
              </View>
            </View>
          </Pressable>
        ) : null}
        {isMember ? (
          <Pressable
            onPress={() => router.push({ pathname: '/compose', params: { groupId: group!.id, groupName: group!.name } })}
            hitSlop={HIT_SLOP}
            style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
          >
            <Icon name="plus" set="light" size={26} color={colors.brand[500]} />
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.brand[500]} /></View>
      ) : !group ? (
        <View className="flex-1 items-center justify-center">
          <EmptyState icon="groups" title="Comunidade não encontrada" />
        </View>
      ) : !isMember ? (
        /* não-membro: identidade + entrar/solicitar (conteúdo é exclusivo) */
        <View className="flex-1 items-center justify-center px-6 gap-4">
          <CommunityCircle g={group} size={80} />
          <View className="items-center gap-1">
            <Text className="text-ink-900 font-extrabold text-xl text-center">{group.name}</Text>
            <Text className="text-ink-500 text-[13px] text-center">
              {[group.segment, group.city].filter(Boolean).join(' · ')}{group.segment || group.city ? ' · ' : ''}{group.memberCount.toLocaleString('pt-BR')} membros{group.isPrivate ? ' · Privada' : ''}
            </Text>
          </View>
          {group.description ? <Text className="text-ink-700 leading-5 text-center">{group.description}</Text> : null}
          <Text className="text-ink-500 text-sm text-center">
            {group.isPrivate ? 'Conteúdo exclusivo — solicite a entrada e aguarde a aprovação do admin.' : 'Conteúdo exclusivo para membros.'}
          </Text>
          <View className="w-full">
            <Button
              title={group.requested ? 'Pedido enviado — cancelar' : group.isPrivate ? 'Solicitar entrada' : 'Entrar na comunidade'}
              variant={group.requested ? 'secondary' : 'accent'}
              onPress={() => toggleJoin.mutate({ id: group.id, joined: false, isPrivate: group.isPrivate, requested: group.requested })}
            />
          </View>
        </View>
      ) : (
        <FlatList
          data={posts ?? []}
          keyExtractor={(p) => p.id}
          // Android com navegação por BOTÕES: sem isso a barra de reações do
          // último post fica escondida sob a navbar (edge-to-edge, SDK 54)
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          // posts novos chegam pelo refetch de 15s — âncora impede a lista de
          // pular sob o dedo quando itens entram no topo
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
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
          ListEmptyComponent={
            loadingPosts ? (
              <View className="py-10 items-center"><ActivityIndicator color={colors.brand[500]} /></View>
            ) : (
              <View className="pt-16">
                <EmptyState icon="comment" title="Sem publicações ainda" subtitle="Toque no + para publicar a primeira." />
              </View>
            )
          }
        />
      )}

      {/* menu do ADMIN no post: repostar/remover do feed geral */}
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
