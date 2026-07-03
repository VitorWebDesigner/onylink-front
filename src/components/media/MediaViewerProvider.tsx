import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Dimensions, FlatList, Modal, PanResponder, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Icon } from '../Icon';
import { AnimatedReaction } from '../AnimatedReaction';
import { FullscreenVideo } from './FullscreenVideo';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { useReactionPicker } from '../reactions/ReactionPickerProvider';
import { CommentsSheet } from '../comments/CommentsSheet';
import { useRecordView } from '../../features/feed/hooks';
import { absoluteMediaUrl, bunnyHeaders } from '../../lib/media';
import type { FeedPost, MediaItem } from '../../features/feed/types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Elementos flutuantes do chrome — fundo escuro OPACO + borda sutil, bem visíveis.
const CHIP: ViewStyle = { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' };
const PILL: ViewStyle = { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' };
const BAR: ViewStyle = { backgroundColor: 'rgba(18,20,28,0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 12 };

export interface ViewerOpts {
  media: MediaItem[];
  index?: number;
  post: FeedPost;
  onInsight: () => void;
  onLike: () => void;
  onRepost: () => void;
  onShare: () => void;
  onComment: () => void;
  /** Seguir/deixar de seguir o autor (canto inferior esq. no vídeo em tela cheia). */
  onFollow?: () => void;
  /** Tocar no avatar/nome do autor → perfil (o viewer fecha antes de navegar). */
  onAuthor?: () => void;
  /** Post do próprio usuário → esconde "Seguir". */
  isAuthor?: boolean;
}

const Ctx = createContext<{ open: (o: ViewerOpts) => void } | null>(null);
export function useMediaViewer() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useMediaViewer precisa de <MediaViewerProvider>');
  return c;
}

interface RState { insighted: boolean; liked: boolean; reposted: boolean; shared: boolean; insightCount: number; likeCount: number; repostCount: number; shareCount: number; commentCount: number }

/** Slide de vídeo (HLS via expo-video); toca play/pause conforme visível. */
function VideoSlide({ item, active, onTap }: { item: MediaItem; active: boolean; onTap: () => void }) {
  const player = useVideoPlayer(absoluteMediaUrl(item.url), (p) => { p.loop = true; p.muted = false; });
  useEffect(() => {
    try { if (active) player.play(); else player.pause(); } catch { /* player pode não estar pronto */ }
  }, [active, player]);
  return (
    <Pressable onPress={onTap} style={{ width: SCREEN_W, height: SCREEN_H, alignItems: 'center', justifyContent: 'center' }}>
      <VideoView player={player} style={{ width: SCREEN_W, height: SCREEN_H }} contentFit="contain" nativeControls={false} fullscreenOptions={{ enable: false }} allowsPictureInPicture={false} allowsVideoFrameAnalysis={false} />
    </Pressable>
  );
}

export function MediaViewerProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const picker = useReactionPicker();
  const recordView = useRecordView();
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [opts, setOpts] = useState<ViewerOpts | null>(null);
  const [index, setIndex] = useState(0);
  const [chrome, setChrome] = useState(true);
  const [r, setR] = useState<RState | null>(null);
  const chromeAnim = useRef(new Animated.Value(1)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  const listRef = useRef<FlatList<MediaItem>>(null);

  const close = useCallback(() => { setOpts(null); setR(null); setCommentsPostId(null); }, []);

  // Arrastar ↑/↓ na imagem → sai da tela cheia (imagem acompanha o dedo, fundo esmaece).
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 14 && Math.abs(g.dy) > Math.abs(g.dx) * 1.3,
      onPanResponderMove: (_e, g) => dragY.setValue(g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_e, g) => {
        if (Math.abs(g.dy) > 120 || Math.abs(g.vy) > 0.6) {
          Animated.timing(dragY, { toValue: g.dy < 0 ? -SCREEN_H : SCREEN_H, duration: 200, useNativeDriver: true }).start(() => close());
        } else {
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    }),
  ).current;

  const open = useCallback((o: ViewerOpts) => {
    setOpts(o);
    setIndex(o.index ?? 0);
    setChrome(true);
    chromeAnim.setValue(1);
    dragY.setValue(0);
    setR({
      insighted: o.post.insighted, liked: o.post.liked, reposted: o.post.reposted, shared: o.post.shared,
      insightCount: o.post.insightCount, likeCount: o.post.likeCount, repostCount: o.post.repostCount,
      shareCount: o.post.shareCount, commentCount: o.post.commentCount,
    });
    // expandir um VÍDEO conta como view do post (dedupe por usuário no backend). A posse
    // da VideoView (useVideoOwnership) faz o feed ceder o player sozinho — sem flag aqui.
    if (o.media.length === 1 && o.media[0]!.type === 'VIDEO') recordView.mutate(o.post.id);
  }, [chromeAnim, dragY, recordView]);

  const toggleChrome = useCallback(() => {
    setChrome((c) => {
      Animated.timing(chromeAnim, { toValue: c ? 0 : 1, duration: 180, useNativeDriver: true }).start();
      return !c;
    });
  }, [chromeAnim]);

  // reações otimistas locais + dispara o handler (que atualiza o cache do feed)
  const react = useCallback((kind: 'insight' | 'like' | 'repost' | 'share') => {
    if (!opts || !r) return;
    const fn = { insight: opts.onInsight, like: opts.onLike, repost: opts.onRepost, share: opts.onShare }[kind];
    fn();
    setR((s) => {
      if (!s) return s;
      const flip = (active: boolean, count: number) => ({ active: !active, count: count + (active ? -1 : 1) });
      if (kind === 'insight') { const x = flip(s.insighted, s.insightCount); return { ...s, insighted: x.active, insightCount: x.count }; }
      if (kind === 'like') { const x = flip(s.liked, s.likeCount); return { ...s, liked: x.active, likeCount: x.count }; }
      if (kind === 'repost') { const x = flip(s.reposted, s.repostCount); return { ...s, reposted: x.active, repostCount: x.count }; }
      const x = flip(s.shared, s.shareCount); return { ...s, shared: x.active, shareCount: x.count };
    });
  }, [opts, r]);

  const onTapSlide = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 260) {
      lastTap.current = 0;
      if (opts && r) picker.show({ onInsight: () => react('insight'), onLike: () => react('like'), insighted: r.insighted, liked: r.liked });
    } else {
      lastTap.current = now;
      setTimeout(() => { if (lastTap.current === now) toggleChrome(); }, 260);
    }
  }, [opts, r, picker, react, toggleChrome]);

  const api = useMemo(() => ({ open }), [open]);

  // vídeo único → player dedicado em tela cheia (controles + barra lateral + infos)
  const isSingleVideo = !!opts && opts.media.length === 1 && opts.media[0]!.type === 'VIDEO';

  return (
    <Ctx.Provider value={api}>
      {children}
      <Modal visible={!!opts} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
        <View style={{ flex: 1 }}>
          {/* fundo preto que ESMAECE conforme arrasta pra sair */}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: dragY.interpolate({ inputRange: [-SCREEN_H, 0, SCREEN_H], outputRange: [0.15, 1, 0.15], extrapolate: 'clamp' }) }]} />
          {opts && isSingleVideo ? (
            <Animated.View style={{ flex: 1, transform: [{ translateY: dragY }] }} {...pan.panHandlers}>
              {r ? (
                <FullscreenVideo
                  item={opts.media[0]!}
                  post={opts.post}
                  r={r}
                  insetTop={insets.top}
                  insetBottom={insets.bottom}
                  onReact={react}
                  onComment={() => setCommentsPostId(opts.post.id)}
                  onFollow={opts.onFollow}
                  onAuthor={opts.onAuthor ? () => { close(); opts.onAuthor!(); } : undefined}
                  isAuthor={opts.isAuthor}
                  onClose={close}
                />
              ) : null}
            </Animated.View>
          ) : opts ? (
            <Animated.View style={{ flex: 1, transform: [{ translateY: dragY }] }} {...pan.panHandlers}>
              <FlatList
                ref={listRef}
                data={opts.media}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={opts.index ?? 0}
                getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
                keyExtractor={(_, i) => String(i)}
                onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
                renderItem={({ item, index: i }) =>
                  item.type === 'VIDEO' ? (
                    <VideoSlide item={item} active={i === index} onTap={onTapSlide} />
                  ) : (
                    <Pressable onPress={onTapSlide} style={{ width: SCREEN_W, height: SCREEN_H, alignItems: 'center', justifyContent: 'center' }}>
                      <Image source={{ uri: item.url, headers: bunnyHeaders(item.url) }} style={{ width: SCREEN_W, height: SCREEN_H }} contentFit="contain" cachePolicy="memory-disk" transition={120} />
                    </Pressable>
                  )
                }
              />
            </Animated.View>
          ) : null}

          {/* Degradê preto do topo p/ baixo — contraste dos botões do header (não tela toda) */}
          {!isSingleVideo ? (
          <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 100, opacity: chromeAnim }}>
            <LinearGradient colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)']} style={{ flex: 1 }} />
          </Animated.View>
          ) : null}

          {/* HEADER — chips FLUTUANTES opacos (fecha · contador · opções) */}
          {!isSingleVideo ? (
          <Animated.View pointerEvents={chrome ? 'auto' : 'none'} style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top + 8, paddingHorizontal: 14, opacity: chromeAnim }}>
            <View className="flex-row items-center">
              <Pressable onPress={close} hitSlop={HIT_SLOP} style={({ pressed }) => [CHIP, { opacity: pressed ? PRESSED_OPACITY : 1 }]}>
                <Icon name="close" size={24} color="#FFFFFF" />
              </Pressable>
              <View className="flex-1" />
              {opts && opts.media.length > 1 ? (
                <View style={PILL}>
                  <Text className="text-white text-sm font-bold">{index + 1}/{opts.media.length}</Text>
                </View>
              ) : null}
              <View className="flex-1" />
              <Pressable hitSlop={HIT_SLOP} style={({ pressed }) => [CHIP, { opacity: pressed ? PRESSED_OPACITY : 1 }]}>
                <Icon name="more" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </Animated.View>
          ) : null}

          {/* BASE — barra de reações FLUTUANTE (pill opaco, ícones brancos) */}
          {!isSingleVideo ? (
          <Animated.View pointerEvents={chrome ? 'auto' : 'none'} style={{ position: 'absolute', bottom: insets.bottom + 18, left: 0, right: 0, alignItems: 'center', opacity: chromeAnim }}>
            {r ? (
              <View className="flex-row items-center gap-6 rounded-full px-5 py-3" style={BAR}>
                <AnimatedReaction icon="insight" active={r.insighted} activeColor={colors.action.insight} inactiveColor="#FFFFFF" count={r.insightCount} size={24} fontSize={14} onPress={() => react('insight')} />
                <AnimatedReaction icon="heart" active={r.liked} activeColor={colors.action.like} inactiveColor="#FFFFFF" count={r.likeCount} size={24} fontSize={14} onPress={() => react('like')} />
                <AnimatedReaction icon="comment" active={false} activeColor="#FFFFFF" inactiveColor="#FFFFFF" count={r.commentCount} size={24} fontSize={14} onPress={() => { close(); opts?.onComment(); }} />
                <AnimatedReaction icon="repost" active={r.reposted} activeColor="#FFFFFF" inactiveColor="#FFFFFF" count={r.repostCount} size={24} fontSize={14} onPress={() => react('repost')} />
                <AnimatedReaction icon="send" active={r.shared} activeColor="#FFFFFF" inactiveColor="#FFFFFF" count={r.shareCount} size={24} fontSize={14} onPress={() => react('share')} />
              </View>
            ) : null}
          </Animated.View>
          ) : null}

          {/* Comentários — overlay DENTRO deste Modal (fica por cima do vídeo). */}
          {commentsPostId ? <CommentsSheet postId={commentsPostId} onClose={() => setCommentsPostId(null)} /> : null}
        </View>
      </Modal>
    </Ctx.Provider>
  );
}
