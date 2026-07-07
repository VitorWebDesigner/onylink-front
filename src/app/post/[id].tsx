import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PostCard } from '../../components/PostCard';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { CommentsSection } from '../../components/CommentsSection';
import { CommentComposer } from '../../components/CommentComposer';
import { type CommentNode } from '../../components/CommentThread';
import { useToast } from '../../components/feedback/toast';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { compactNumber } from '../../lib/format';
import { useAuth } from '../../store/auth';
import {
  usePost, useRecordView, useTogglePostSubscription,
  useToggleInsight, useToggleLike, useToggleRepost, useToggleShare,
} from '../../features/feed/hooks';
import { useFollowFlow } from '../../components/follow/FollowFlowProvider';
import { useKeyboardPadding } from '../../lib/keyboard';
import { useDialog } from '../../components/feedback/dialog';
import { PostMenuSheet } from '../../components/moderation/PostMenuSheet';
import { ReportReasons, useSendReport } from '../../components/moderation/ReportSheet';
import { afterSheetClose, BottomSheet } from '../../components/BottomSheet';
import { useAddComment, useComments, useDeleteComment, useToggleCommentInsight, useToggleCommentLike, useToggleCommentRepost, useToggleCommentShare } from '../../features/comments/hooks';

export default function PostDetail() {
  const { id, focus } = useLocalSearchParams<{ id: string; focus?: string }>();
  const router = useRouter();
  const toast = useToast();
  const user = useAuth((s) => s.user);
  // busca standalone (semente de qualquer lista) — post de COMUNIDADE não está no feed geral
  const { data: postData, isLoading: loadingPost, error: postError } = usePost(id);
  const toggleInsight = useToggleInsight();
  const toggleLike = useToggleLike();
  const toggleRepost = useToggleRepost();
  const toggleShare = useToggleShare();
  const recordView = useRecordView();
  const toggleSub = useTogglePostSubscription();
  const followFlow = useFollowFlow();
  const { data: comments } = useComments(id);
  const addComment = useAddComment(id);
  const likeComment = useToggleCommentLike(id);
  const insightComment = useToggleCommentInsight(id);
  const repostComment = useToggleCommentRepost(id);
  const shareComment = useToggleCommentShare(id);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<CommentNode | null>(null);
  const kbPad = useKeyboardPadding(); // sobe o composer nos DOIS SOs (Android edge-to-edge não redimensiona)
  const dialog = useDialog();
  const deleteComment = useDeleteComment(id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentMenu, setCommentMenu] = useState<CommentNode | null>(null);
  const [commentStep, setCommentStep] = useState<'menu' | 'report'>('menu');
  const sendReport = useSendReport();
  const closeCommentMenu = () => { setCommentMenu(null); setCommentStep('menu'); };

  const post = postData ?? null;
  const count = comments?.length ?? 0;
  const isAuthor = !!post?.authorId && post.authorId === user?.id;

  // registra 1 view ao abrir o post
  useEffect(() => {
    recordView.mutate(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function send() {
    const v = text.trim();
    if (!v) return;
    addComment.mutate({ content: v, parentId: replyTo?.id }, { onSuccess: () => toast.success(replyTo ? 'Resposta publicada!' : 'Comentário publicado!') });
    setText('');
    setReplyTo(null);
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      {/* Header: voltar · (OnyLink + views ao meio) · seguir + 3-pontos + sino */}
      <View className="flex-row items-center px-3 py-2 border-b border-surface-border">
        <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP} className="pr-1">
          <Icon name="back" size={24} color={colors.ink[900]} />
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-ink-900 font-extrabold text-base tracking-tight">OnyLink</Text>
          {post ? <Text className="text-ink-400 text-[11px] -mt-0.5">{compactNumber(post.viewCount)} visualizações</Text> : null}
        </View>
        <View className="flex-row items-center gap-2">
          {/* ordem: sino (notificação) → 3-pontos no círculo */}
          <Pressable
            onPress={() => { if (post) { toggleSub.mutate({ postId: post.id, subscribed: post.subscribed }); toast.info(post.subscribed ? 'Notificações desativadas.' : 'Você será notificado sobre este post.'); } }}
            hitSlop={HIT_SLOP}
            style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
          >
            <Icon name="bell" set={post?.subscribed ? 'bold' : 'light'} size={23} color={post?.subscribed ? colors.brand[500] : colors.ink[900]} />
          </Pressable>
          <Pressable onPress={() => setMenuOpen(true)} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="w-8 h-8 rounded-full border border-surface-border items-center justify-center">
            <Icon name="more" size={16} color={colors.ink[900]} />
          </Pressable>
        </View>
      </View>

      {!post ? (
        <View className="flex-1 items-center justify-center">
          {loadingPost ? (
            <ActivityIndicator color={colors.brand[500]} />
          ) : (
            <EmptyState
              icon="document"
              title="Publicação não encontrada"
              subtitle={postError?.message?.includes('membro') ? 'Só membros da comunidade veem esta publicação.' : undefined}
            />
          )}
        </View>
      ) : (
        <View className="flex-1" style={{ paddingBottom: kbPad }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 16 }}>
            <PostCard
              post={post}
              detail
              hideTopComment
              hideMenu
              isAuthor={isAuthor}
              onOpenAuthor={(p) => { if (p.authorId) router.push({ pathname: '/user/[id]', params: { id: p.authorId } }); }}
              onToggleFollow={(p) => { if (p.authorId) followFlow.start({ id: p.authorId, name: p.authorName, avatarPath: p.authorAvatar, followed: p.authorFollowed }); }}
              onToggleInsight={(p) => toggleInsight.mutate({ postId: p.id, insighted: p.insighted })}
              onToggleLike={(p) => toggleLike.mutate({ postId: p.id, liked: p.liked })}
              onToggleRepost={(p) => { toggleRepost.mutate({ postId: p.id, reposted: p.reposted }); if (!p.reposted) toast.success('Repostado!'); }}
              onToggleShare={(p) => toggleShare.mutate({ postId: p.id, shared: p.shared })}
            />
            <View className="px-4 pt-4">
              <Text className="text-ink-900 font-semibold text-base mb-4">Comentários {count ? `(${count})` : ''}</Text>
              <CommentsSection
                comments={comments ?? []}
                onToggleLike={(c) => likeComment.mutate({ commentId: c.id, active: c.liked })}
                onToggleInsight={(c) => insightComment.mutate({ commentId: c.id, active: c.insighted })}
                onToggleRepost={(c) => { repostComment.mutate({ commentId: c.id, active: c.reposted }); if (!c.reposted) toast.success('Comentário repostado!'); }}
                onToggleShare={(c) => shareComment.mutate({ commentId: c.id, active: c.shared })}
                onReply={(c) => setReplyTo(c)}
                onOpenUser={(userId) => router.push({ pathname: '/user/[id]', params: { id: userId } })}
                onMenu={(c) => setCommentMenu(c)}
              />
            </View>
          </ScrollView>

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
            autoFocus={focus === '1'}
          />
        </View>
      )}

      {/* 3-pontos do header: denunciar/excluir a publicação */}
      <PostMenuSheet post={menuOpen ? post : null} onClose={() => setMenuOpen(false)} onDeleted={() => router.back()} />

      {/* 3-pontos do COMENTÁRIO: denunciar = passo no MESMO sheet / excluir (o meu) */}
      <BottomSheet visible={!!commentMenu} onClose={closeCommentMenu}>
        {commentStep === 'report' && commentMenu ? (
          <ReportReasons
            targetLabel="o comentário"
            onPick={(reason) => { const cid = commentMenu.id; closeCommentMenu(); void sendReport('COMMENT', cid, reason); }}
          />
        ) : (
          <View className="pb-2">
            {commentMenu && commentMenu.authorId !== user?.id ? (
              <Pressable
                onPress={() => setCommentStep('report')}
                style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
                className="flex-row items-center gap-3 px-4 py-4 border-b border-surface-border"
              >
                <Icon name="error" set="light" size={20} color={colors.ink[700]} />
                <Text className="text-ink-900 text-[15px]">Denunciar comentário</Text>
              </Pressable>
            ) : null}
            {commentMenu && commentMenu.authorId === user?.id ? (
              <Pressable
                onPress={() => {
                  const cid = commentMenu.id;
                  closeCommentMenu();
                  void (async () => {
                    await afterSheetClose();
                    const ok = await dialog.confirm({
                      title: 'Excluir comentário?',
                      message: 'Ele some da conversa para todo mundo.',
                      confirmText: 'Excluir',
                      cancelText: 'Cancelar',
                      destructive: true,
                    });
                    if (ok) deleteComment.mutate(cid, { onSuccess: () => toast.success('Comentário excluído.') });
                  })();
                }}
                style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
                className="flex-row items-center gap-3 px-4 py-4 border-b border-surface-border"
              >
                <Icon name="trash" set="light" size={20} color={colors.danger} />
                <Text className="text-danger font-semibold text-[15px]">Excluir comentário</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}
