import { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { runOnJS, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommentsSection } from '../CommentsSection';
import { CommentComposer } from '../CommentComposer';
import type { CommentNode } from '../CommentThread';
import { Icon } from '../Icon';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { useToast } from '../feedback/toast';
import { useAuth } from '../../store/auth';
import { useKeyboardPadding } from '../../lib/keyboard';
import {
  useAddComment, useComments,
  useToggleCommentInsight, useToggleCommentLike, useToggleCommentRepost, useToggleCommentShare,
} from '../../features/comments/hooks';

const SCREEN_H = Dimensions.get('window').height;
const SPRING = { damping: 22, stiffness: 220, mass: 0.6 } as const;

/**
 * Bottom sheet de comentários (item 7). NÃO é um Modal próprio — é um overlay
 * (absoluteFill) renderizado DENTRO do Modal que já está aberto (o vídeo em tela
 * cheia); Modal aninhado ficava atrás. Arrastar pra baixo fecha — gesto via
 * **react-native-gesture-handler** (mesma sensação do modal do compose). Como vive
 * dentro de um `Modal` do RN, precisa do próprio `GestureHandlerRootView`. A zona de
 * arrasto é o **cabeçalho** (tracinho/título) → não briga com o scroll da lista.
 */
export function CommentsSheet({ postId, onClose }: { postId: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const user = useAuth((s) => s.user);
  const { data: comments } = useComments(postId);
  const addComment = useAddComment(postId);
  const likeComment = useToggleCommentLike(postId);
  const insightComment = useToggleCommentInsight(postId);
  const repostComment = useToggleCommentRepost(postId);
  const shareComment = useToggleCommentShare(postId);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<CommentNode | null>(null);
  const kbPad = useKeyboardPadding(); // composer acima do teclado nos DOIS SOs

  const count = comments?.length ?? 0;
  const height = SCREEN_H - insets.top - 40;

  const translateY = useSharedValue(height);
  const backdrop = useSharedValue(0);
  const scrollOffset = useSharedValue(0); // 0 = lista no topo → libera arrastar o sheet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scrollRef = useAnimatedRef<any>();
  const onScroll = useAnimatedScrollHandler((e) => { scrollOffset.value = e.contentOffset.y; });

  // abre UMA vez (no render fica re-disparando e brigaria com o arrasto)
  useEffect(() => {
    translateY.value = withSpring(0, SPRING);
    backdrop.value = withTiming(1, { duration: 180 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    backdrop.value = withTiming(0, { duration: 160 });
    translateY.value = withTiming(height, { duration: 200 }, (fin) => { if (fin) runOnJS(onClose)(); });
  };

  // arrasta o corpo TODO; só move o sheet quando a lista está no topo e o gesto é p/
  // baixo (senão deixa rolar — simultâneo). Solta → fecha (limite/flick) ou volta.
  const pan = Gesture.Pan()
    .activeOffsetY(10)
    .simultaneousWithExternalGesture(scrollRef)
    .onUpdate((e) => {
      if (scrollOffset.value <= 0 && e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const shouldClose = translateY.value > 100 || (e.velocityY > 700 && translateY.value > 20);
      if (shouldClose) {
        translateY.value = withTiming(height, { duration: 200 }, (fin) => { if (fin) runOnJS(onClose)(); });
      } else {
        translateY.value = withSpring(0, SPRING);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  function send() {
    const v = text.trim();
    if (!v) return;
    addComment.mutate({ content: v, parentId: replyTo?.id }, { onSuccess: () => toast.success(replyTo ? 'Resposta publicada!' : 'Comentário publicado!') });
    setText('');
    setReplyTo(null);
  }

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
        {/* fundo escuro — fade + toque fecha */}
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        </Animated.View>

        {/* pan no CORPO TODO (simultâneo ao scroll da lista) */}
        <GestureDetector gesture={pan}>
        <Animated.View style={[{ height, backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }, sheetStyle]}>
          {/* cabeçalho: tracinho + título + fechar */}
          <View className="items-center pt-2.5 pb-1">
            <View className="w-10 h-1.5 rounded-full" style={{ backgroundColor: '#C7C9CE' }} />
          </View>
          <View className="flex-row items-center px-4 pb-3 border-b border-surface-border">
            <Text className="text-ink-900 font-semibold text-base flex-1">Comentários{count ? ` (${count})` : ''}</Text>
            <Pressable onPress={dismiss} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
              <Icon name="close" size={22} color={colors.ink[500]} />
            </Pressable>
          </View>

          <View className="flex-1" style={{ paddingBottom: kbPad }}>
            <Animated.ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={16} bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 8 }}>
              <CommentsSection
                comments={comments ?? []}
                onToggleLike={(c) => likeComment.mutate({ commentId: c.id, active: c.liked })}
                onToggleInsight={(c) => insightComment.mutate({ commentId: c.id, active: c.insighted })}
                onToggleRepost={(c) => { repostComment.mutate({ commentId: c.id, active: c.reposted }); if (!c.reposted) toast.success('Comentário repostado!'); }}
                onToggleShare={(c) => shareComment.mutate({ commentId: c.id, active: c.shared })}
                onReply={(c) => setReplyTo(c)}
              />
            </Animated.ScrollView>

            <CommentComposer
              value={text}
              onChangeText={setText}
              onSend={send}
              pending={addComment.isPending}
              avatarName={user?.name}
              placeholder="Adicione um comentário..."
              replyingToName={replyTo?.authorName ?? null}
              onCancelReply={() => setReplyTo(null)}
              onAttach={() => toast.info('Mídia no comentário em breve.')}
              autoFocus
            />
          </View>
        </Animated.View>
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
}
