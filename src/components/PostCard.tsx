import { Pressable, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { AnimatedReaction } from './AnimatedReaction';
import { MediaCarousel } from './MediaCarousel';
import { HashtagText } from './HashtagText';
import { useMediaViewer } from './media/MediaViewerProvider';
import { useReactionPicker } from './reactions/ReactionPickerProvider';
import { useMediaUi } from '../store/mediaUi';
import { colors } from '../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../theme/tokens';
import { timeAgo } from '../lib/time';
import { useAuth } from '../store/auth';
import { canRepostPost, type FeedPost } from '../features/feed/types';
import type { CommentReactionKind } from '../features/comments/hooks';

const THREAD_LINE = '#D6D8DD'; // linha de thread discreta (item 6)
const MD_CENTER = 20; // avatar md = 40 → centro 20 (por onde desce a linha)

interface Props {
  post: FeedPost;
  onToggleInsight?: (post: FeedPost) => void;
  onToggleLike?: (post: FeedPost) => void;
  onToggleRepost?: (post: FeedPost) => void;
  onToggleShare?: (post: FeedPost) => void;
  onOpen?: (post: FeedPost) => void;
  /** Tocar no AVATAR ou NOME do autor → perfil dele (sem isso, cai no onOpen). */
  onOpenAuthor?: (post: FeedPost) => void;
  /** Tocar no ícone de COMENTAR → abrir já com o composer focado (sem isso, cai no onOpen). */
  onComment?: (post: FeedPost) => void;
  /** Perfil de um usuário QUALQUER do card (ex.: autor do comentário-destaque). */
  onOpenUser?: (userId: string) => void;
  /** Tocar no banner "Repostado da comunidade X" → abre a comunidade. */
  onOpenCommunity?: (communityId: string) => void;
  /** Reação no comentário-destaque inline (curtir/insight/repost/enviar). */
  onCommentReact?: (postId: string, commentId: string, kind: CommentReactionKind, active: boolean) => void;
  /** Esconde o comentário-destaque inline (ex.: na tela de detalhe, onde ele já é listado). */
  hideTopComment?: boolean;
  /** Seguir/deixar de seguir o autor — botão ocupa o lugar da tag no header do card. */
  onToggleFollow?: (post: FeedPost) => void;
  /** Post do próprio usuário → não mostra "Seguir". */
  isAuthor?: boolean;
  /** Esconde os 3-pontos do card (na tela de detalhe eles ficam no header de cima). */
  hideMenu?: boolean;
  /** Toque nos 3-pontos (ex.: fixar/desafixar no próprio perfil). */
  onMenu?: (post: FeedPost) => void;
  /** Layout de DETALHE: sem indentação — conteúdo/mídia/reações alinhados à esquerda
   *  (largura cheia); nome+tempo centralizados ao lado da foto. */
  detail?: boolean;
}

/** 3-pontos dentro de círculo (proporção dos outros ícones). */
function MoreCircle({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="w-8 h-8 rounded-full border border-surface-border items-center justify-center">
      <Icon name="more" size={16} color={colors.ink[500]} />
    </Pressable>
  );
}

/**
 * Pílula compacta Seguir/Seguindo (ocupa o lugar da antiga tag de categoria).
 * Largura FIXA (minWidth) + texto centralizado → alternar os dois estados não
 * mexe no layout do post de forma alguma.
 */
function FollowPill({ followed, onPress }: { followed: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1, minWidth: 88 })}
      className={followed ? 'rounded-full border border-surface-border py-1 px-3 items-center justify-center' : 'rounded-full bg-brand-500 py-1 px-3 items-center justify-center'}
    >
      <Text className={followed ? 'text-ink-700 text-xs font-bold' : 'text-white text-xs font-bold'}>{followed ? 'Seguindo' : 'Seguir'}</Text>
    </Pressable>
  );
}

/**
 * Post estilo Threads: avatar à esquerda, ações à esquerda com contador + cor por
 * ação. Quando há comentário-destaque (item 6), ele vira uma SEGUNDA linha ligada
 * ao post por uma linha de thread que vai do **avatar do postador ao avatar de
 * quem comentou** — cada um com sua própria barra de reações embaixo.
 */
export function PostCard({ post, onToggleInsight, onToggleLike, onToggleRepost, onToggleShare, onOpen, onOpenAuthor, onComment, onOpenUser, onOpenCommunity, onCommentReact, hideTopComment, onToggleFollow, isAuthor, hideMenu, onMenu, detail }: Props) {
  const tc = hideTopComment ? null : post.topComment;
  const openAuthor = onOpenAuthor ?? onOpen; // avatar/nome → perfil (fallback: abre o post)
  const comment = onComment ?? onOpen; // comentar → abre focado (fallback: abre o post)
  const showFollow = !!onToggleFollow && !isAuthor;
  const mediaViewer = useMediaViewer();
  const reactionPicker = useReactionPicker();
  const me = useAuth((s) => s.user);
  // post de comunidade não destacado: repostar só aparece pro DONO da comunidade
  const canRepost = canRepostPost(post, me?.id);
  const activePostId = useMediaUi((s) => s.activePostId);
  const videoActive = !!detail || activePostId === post.id; // detalhe sempre toca; feed só o visível

  const openViewer = (index: number) =>
    mediaViewer.open({
      media: post.media,
      index,
      post,
      onInsight: () => onToggleInsight?.(post),
      onLike: () => onToggleLike?.(post),
      onRepost: () => onToggleRepost?.(post),
      onShare: () => onToggleShare?.(post),
      onComment: () => onOpen?.(post),
      onFollow: onToggleFollow ? () => onToggleFollow(post) : undefined,
      onAuthor: onOpenAuthor ? () => onOpenAuthor(post) : undefined,
      isAuthor,
    });
  const doubleTapReact = () =>
    reactionPicker.show({ onInsight: () => onToggleInsight?.(post), onLike: () => onToggleLike?.(post), insighted: post.insighted, liked: post.liked });

  const actionsRow = (
    <View className="flex-row items-center gap-6 pt-1.5">
      <AnimatedReaction icon="insight" active={post.insighted} activeColor={colors.action.insight} count={post.insightCount} onPress={onToggleInsight ? () => onToggleInsight(post) : undefined} />
      <AnimatedReaction icon="heart" active={post.liked} activeColor={colors.action.like} count={post.likeCount} onPress={onToggleLike ? () => onToggleLike(post) : undefined} />
      <AnimatedReaction icon="comment" active={post.commentCount > 0} activeColor={colors.action.comment} count={post.commentCount} onPress={comment ? () => comment(post) : undefined} />
      {canRepost ? (
        <AnimatedReaction icon="repost" active={post.reposted} activeColor={colors.action.repost} count={post.repostCount} onPress={onToggleRepost ? () => onToggleRepost(post) : undefined} />
      ) : null}
      <AnimatedReaction icon="send" active={post.shared} activeColor={colors.action.send} count={post.shareCount} onPress={onToggleShare ? () => onToggleShare(post) : undefined} />
    </View>
  );
  // categoria = hashtag na descrição, logo abaixo do texto
  const categoryTag = <Text className="text-brand-500 font-semibold text-[13px] mt-1">#{post.category}</Text>;
  const mediaBlock = post.media.length ? (
    <View className="mt-2">
      <MediaCarousel media={post.media} onPressImage={openViewer} onDoubleTap={doubleTapReact} active={videoActive} viewCount={detail ? undefined : post.viewCount} />
    </View>
  ) : null;

  // ── LAYOUT DE DETALHE (tela de comentários): largura cheia, sem indentação ──
  if (detail) {
    return (
      <View className="px-4 py-3 border-b border-surface-border bg-surface">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={openAuthor ? () => openAuthor(post) : undefined} hitSlop={6} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
            <Avatar name={post.authorName} uri={post.authorAvatar} size="md" />
          </Pressable>
          <Pressable onPress={openAuthor ? () => openAuthor(post) : undefined} hitSlop={6} className="flex-1" style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
            <Text className="text-ink-900 font-semibold text-sm" numberOfLines={1}>{post.authorName}</Text>
            <Text className="text-ink-400 text-[13px]">{timeAgo(post.createdAt)}</Text>
          </Pressable>
          {showFollow ? <FollowPill followed={post.authorFollowed} onPress={() => onToggleFollow!(post)} /> : null}
          {!hideMenu ? <MoreCircle onPress={onMenu ? () => onMenu(post) : undefined} /> : null}
        </View>
        {post.authorRoleTitle ? <Text className="text-ink-400 text-xs mt-1" numberOfLines={1}>{post.authorRoleTitle}</Text> : null}
        {post.content ? <HashtagText text={post.content} className="text-ink-700 leading-5 mt-2" /> : null}
        {categoryTag}
        {mediaBlock}
        {actionsRow}
      </View>
    );
  }

  return (
    <View className="px-4 py-3 border-b border-surface-border bg-surface">
      {/* post de COMUNIDADE repostado no feed pelo admin — créditos (decisão §5.1) */}
      {post.featuredByName && post.communityName ? (
        <Pressable
          onPress={onOpenCommunity && post.communityId ? () => onOpenCommunity(post.communityId!) : undefined}
          hitSlop={6}
          style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
          className="flex-row items-center gap-1.5 pb-2 pl-[52px]"
        >
          <Icon name="repost" set="light" size={13} color={colors.ink[400]} />
          <Text className="text-ink-400 text-xs" numberOfLines={1}>
            <Text className="font-semibold text-ink-500">{post.featuredByName}</Text> repostou da comunidade{' '}
            <Text className="font-semibold text-brand-500">{post.communityName}</Text>
          </Text>
        </Pressable>
      ) : null}
      {/* indicador de post fixado (perfil) */}
      {post.pinned ? (
        <View className="flex-row items-center gap-1.5 pb-1.5 pl-[52px]">
          <Icon name="bookmark" set="bold" size={12} color={colors.ink[400]} />
          <Text className="text-ink-400 text-xs font-semibold">Fixado</Text>
        </View>
      ) : null}
      {/* ── POST ── */}
      <View className="flex-row gap-3">
        {/* avatar → perfil do autor; o espaço vazio abaixo (linha de thread) abre o post */}
        <Pressable onPress={onOpen ? () => onOpen(post) : undefined} style={{ width: 40 }} className="relative">
          <Pressable onPress={openAuthor ? () => openAuthor(post) : undefined} hitSlop={6} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
            <Avatar name={post.authorName} uri={post.authorAvatar} size="md" />
          </Pressable>
          {/* linha desce do avatar do postador até o fim do post (segue no comentário) */}
          {tc ? <View style={{ position: 'absolute', left: MD_CENTER - 1, top: 40, width: 2, bottom: 0, backgroundColor: THREAD_LINE }} /> : null}
        </Pressable>

        <View className="flex-1 gap-1">
          {/* header + texto abrem o post; a MÍDIA fica FORA daqui p/ ter swipe/toque próprios */}
          <Pressable onPress={onOpen ? () => onOpen(post) : undefined} style={({ pressed }) => ({ opacity: pressed && onOpen ? 0.96 : 1 })}>
            <View className="flex-row items-center gap-2">
              <Pressable onPress={openAuthor ? () => openAuthor(post) : undefined} hitSlop={6} className="shrink" style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
                <Text className="text-ink-900 font-semibold text-sm" numberOfLines={1}>{post.authorName}</Text>
              </Pressable>
              <Text className="text-ink-400 text-[13px]">· {timeAgo(post.createdAt)}</Text>
              <View className="flex-1" />
              {/* botão Seguir ocupa o antigo lugar da tag */}
              {showFollow ? <FollowPill followed={post.authorFollowed} onPress={() => onToggleFollow!(post)} /> : null}
              {!hideMenu ? <MoreCircle onPress={onMenu ? () => onMenu(post) : undefined} /> : null}
            </View>
            {post.authorRoleTitle ? <Text className="text-ink-400 text-xs -mt-0.5" numberOfLines={1}>{post.authorRoleTitle}</Text> : null}
            {post.content ? <HashtagText text={post.content} className="text-ink-700 leading-5 mt-1" /> : null}
            {categoryTag}
          </Pressable>

          {/* mídia (imagem única ou carrossel) — toque abre tela cheia, duplo-toque reage */}
          {mediaBlock}
          {actionsRow}
        </View>
      </View>

      {/* ── COMENTÁRIO-DESTAQUE (ligado por linha avatar→avatar) ── */}
      {tc ? (
        <View className="flex-row gap-3 mt-3">
          <View style={{ width: 40, alignItems: 'center' }} className="relative">
            {/* ponte da linha: do fim do post até o topo deste avatar */}
            <View style={{ position: 'absolute', left: MD_CENTER - 1, top: -12, width: 2, height: 12, backgroundColor: THREAD_LINE }} />
            {/* avatar do comentarista → perfil dele */}
            <Pressable onPress={onOpenUser && tc.authorId ? () => onOpenUser(tc.authorId!) : undefined} hitSlop={6} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
              <Avatar name={tc.authorName} size="sm" />
            </Pressable>
          </View>

          <Pressable onPress={onOpen ? () => onOpen(post) : undefined} style={({ pressed }) => ({ opacity: pressed && onOpen ? 0.96 : 1 })} className="flex-1">
            <Pressable onPress={onOpenUser && tc.authorId ? () => onOpenUser(tc.authorId!) : undefined} hitSlop={6} className="self-start" style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
              <Text className="text-ink-900 font-semibold text-sm" numberOfLines={1}>{tc.authorName}</Text>
            </Pressable>
            <Text className="text-ink-700 leading-5 mt-0.5">{tc.content}</Text>
            <View className="flex-row items-center gap-6 pt-1.5">
              <AnimatedReaction icon="insight" active={tc.insighted} activeColor={colors.action.insight} count={tc.insightCount} size={18} fontSize={13} onPress={onCommentReact ? () => onCommentReact(post.id, tc.id, 'insight', tc.insighted) : undefined} />
              <AnimatedReaction icon="heart" active={tc.liked} activeColor={colors.action.like} count={tc.likeCount} size={18} fontSize={13} onPress={onCommentReact ? () => onCommentReact(post.id, tc.id, 'like', tc.liked) : undefined} />
              <AnimatedReaction icon="comment" active={false} activeColor={colors.action.comment} count={0} size={18} fontSize={13} onPress={onOpen ? () => onOpen(post) : undefined} />
              <AnimatedReaction icon="repost" active={tc.reposted} activeColor={colors.action.repost} count={tc.repostCount} size={18} fontSize={13} onPress={onCommentReact ? () => onCommentReact(post.id, tc.id, 'repost', tc.reposted) : undefined} />
              <AnimatedReaction icon="send" active={tc.shared} activeColor={colors.action.send} count={tc.shareCount} size={18} fontSize={13} onPress={onCommentReact ? () => onCommentReact(post.id, tc.id, 'share', tc.shared) : undefined} />
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
