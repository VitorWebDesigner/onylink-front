import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { AnimatedReaction } from '../../components/AnimatedReaction';
import { EmptyState } from '../../components/EmptyState';
import { CommentsSection } from '../../components/CommentsSection';
import { type CommentNode } from '../../components/CommentThread';
import { CommentComposer } from '../../components/CommentComposer';
import { useToast } from '../../components/feedback/toast';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { compactNumber } from '../../lib/format';
import { timeAgo } from '../../lib/time';
import {
  useAddOppComment, useOppComments, useOpportunity, useRecordOppView, useToggleOppSubscription,
  useToggleOppCommentInsight, useToggleOppCommentLike, useToggleOppCommentRepost, useToggleOppCommentShare,
  useToggleOppInsight, useToggleOppLike,
} from '../../features/opportunities/hooks';
import { KIND_META } from '../../features/opportunities/types';
import { useAuth } from '../../store/auth';
import { useKeyboardPadding } from '../../lib/keyboard';

export default function OpportunityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const user = useAuth((s) => s.user);
  const { data: o } = useOpportunity(id);
  const { data: comments } = useOppComments(id);
  const addComment = useAddOppComment(id);
  const toggleLike = useToggleOppLike();
  const toggleInsight = useToggleOppInsight();
  const likeComment = useToggleOppCommentLike(id);
  const insightComment = useToggleOppCommentInsight(id);
  const repostComment = useToggleOppCommentRepost(id);
  const shareComment = useToggleOppCommentShare(id);
  const recordView = useRecordOppView();
  const toggleSub = useToggleOppSubscription();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<CommentNode | null>(null);
  const kbPad = useKeyboardPadding(); // composer acima do teclado nos DOIS SOs

  const count = comments?.length ?? 0;

  useEffect(() => {
    recordView.mutate(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function send() {
    const v = text.trim();
    if (!v) return;
    addComment.mutate({ content: v, parentId: replyTo?.id });
    setText('');
    setReplyTo(null);
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      {/* Header idêntico ao do post: voltar · OnyLink+views · sino · 3-pontos no círculo */}
      <View className="flex-row items-center px-3 py-2 border-b border-surface-border">
        <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP} className="pr-1">
          <Icon name="back" size={24} color={colors.ink[900]} />
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-ink-900 font-extrabold text-base tracking-tight">OnyLink</Text>
          {o ? <Text className="text-ink-400 text-[11px] -mt-0.5">{compactNumber(o.viewCount)} visualizações</Text> : null}
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => { if (o) { toggleSub.mutate({ id: o.id, subscribed: o.subscribed }); toast.info(o.subscribed ? 'Notificações desativadas.' : 'Você será notificado sobre esta oportunidade.'); } }}
            hitSlop={HIT_SLOP}
            style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
          >
            <Icon name="bell" set={o?.subscribed ? 'bold' : 'light'} size={23} color={o?.subscribed ? colors.brand[500] : colors.ink[900]} />
          </Pressable>
          <Pressable hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="w-8 h-8 rounded-full border border-surface-border items-center justify-center">
            <Icon name="more" size={16} color={colors.ink[900]} />
          </Pressable>
        </View>
      </View>

      {!o ? (
        <View className="flex-1 items-center justify-center"><EmptyState icon="work" title="Oportunidade não encontrada" /></View>
      ) : (
        <View className="flex-1" style={{ paddingBottom: kbPad }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
            <View className="gap-3 pb-4 border-b border-surface-border mb-4">
              <View className="flex-row items-center justify-between">
                <Badge label={KIND_META[o.kind].label} icon={KIND_META[o.kind].icon} tone="accent" />
                <Text className="text-ink-400 text-micro">{timeAgo(o.createdAt)}</Text>
              </View>
              <Text className="text-ink-900 font-extrabold text-xl leading-6">{o.title}</Text>
              <Pressable
                onPress={o.authorId ? () => router.push({ pathname: '/user/[id]', params: { id: o.authorId! } }) : undefined}
                style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
                className="flex-row items-center gap-2 self-start"
              >
                <Avatar name={o.authorName} size="sm" />
                <View>
                  <Text className="text-ink-900 font-semibold text-sm">{o.authorName}</Text>
                  {[o.city, o.segment].filter(Boolean).length ? (
                    <Text className="text-ink-500 text-[13px]">{[o.city, o.segment].filter(Boolean).join(' · ')}</Text>
                  ) : null}
                </View>
              </Pressable>
              {o.description ? <Text className="text-ink-700 leading-6">{o.description}</Text> : null}

              <View className="flex-row items-center gap-6 py-1">
                <AnimatedReaction icon="insight" active={o.insighted} activeColor={colors.action.insight} count={o.insightCount} onPress={() => toggleInsight.mutate({ id: o.id, insighted: o.insighted })} />
                <AnimatedReaction icon="heart" active={o.liked} activeColor={colors.action.like} count={o.likeCount} onPress={() => toggleLike.mutate({ id: o.id, liked: o.liked })} />
                <AnimatedReaction icon="comment" active={false} activeColor={colors.action.comment} count={count} onPress={() => {}} />
                <Pressable onPress={() => toast.success('Oportunidade repostada no seu perfil.')} hitSlop={HIT_SLOP}>
                  <Icon name="repost" set="light" size={20} color={colors.ink[500]} />
                </Pressable>
                <Pressable onPress={() => toast.info('Enviar para um amigo em breve.')} hitSlop={HIT_SLOP}>
                  <Icon name="send" set="light" size={20} color={colors.ink[500]} />
                </Pressable>
              </View>

              {o.authorId && user?.id === o.authorId ? (
                <Button title={`Ver candidaturas${o.applicationCount ? ` (${o.applicationCount})` : ''}`} variant="primary" onPress={() => router.push({ pathname: '/opportunity/applications/[id]', params: { id: o.id } })} />
              ) : o.applied ? (
                <Button title="Candidatura enviada ✓" variant="secondary" disabled onPress={() => {}} />
              ) : (
                <Button title="Candidatar-se" variant="accent" onPress={() => router.push({ pathname: '/opportunity/apply/[id]', params: { id: o.id } })} />
              )}
            </View>

            <Text className="text-ink-900 font-semibold text-base mb-4">Comentários {count ? `(${count})` : ''}</Text>
            <CommentsSection
              comments={comments ?? []}
              onToggleLike={(c) => likeComment.mutate({ commentId: c.id, active: c.liked })}
              onToggleInsight={(c) => insightComment.mutate({ commentId: c.id, active: c.insighted })}
              onToggleRepost={(c) => { repostComment.mutate({ commentId: c.id, active: c.reposted }); if (!c.reposted) toast.success('Comentário repostado!'); }}
              onToggleShare={(c) => shareComment.mutate({ commentId: c.id, active: c.shared })}
              onReply={(c) => setReplyTo(c)}
              onOpenUser={(userId) => router.push({ pathname: '/user/[id]', params: { id: userId } })}
            />
          </ScrollView>

          <CommentComposer
            value={text}
            onChangeText={setText}
            onSend={send}
            pending={addComment.isPending}
            avatarName={user?.name}
            placeholder="Comente ou ofereça ajuda..."
            replyingToName={replyTo?.authorName ?? null}
            onCancelReply={() => setReplyTo(null)}
            onAttach={() => toast.info('Mídia no comentário em breve.')}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
