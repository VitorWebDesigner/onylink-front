import { Pressable, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { Icon } from './Icon';
import { AnimatedReaction } from './AnimatedReaction';
import { colors } from '../theme/colors';
import { HIT_SLOP } from '../theme/tokens';
import { timeAgo } from '../lib/time';
import { KIND_META, type Opportunity } from '../features/opportunities/types';

interface Props {
  opportunity: Opportunity;
  onOpen?: (o: Opportunity) => void;
  /** Tocar no avatar/nome do autor → perfil dele. */
  onOpenAuthor?: (o: Opportunity) => void;
  onToggleInsight?: (o: Opportunity) => void;
  onToggleLike?: (o: Opportunity) => void;
  onRepost?: (o: Opportunity) => void;
  onSend?: (o: Opportunity) => void;
}

/** Card de oportunidade — mesmas ações de um post (reais) + clicável para o detalhe. */
export function OpportunityCard({ opportunity: o, onOpen, onOpenAuthor, onToggleInsight, onToggleLike, onRepost, onSend }: Props) {
  const meta = KIND_META[o.kind];
  const where = [o.city, o.segment].filter(Boolean).join(' · ');
  const openAuthor = onOpenAuthor && o.authorId ? () => onOpenAuthor(o) : undefined;
  return (
    <Pressable
      onPress={() => onOpen?.(o)}
      style={({ pressed }) => ({ opacity: pressed && onOpen ? 0.96 : 1 })}
      className="flex-row gap-3 px-4 py-3 border-b border-surface-border bg-surface"
    >
      <Pressable onPress={openAuthor} hitSlop={6} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
        <Avatar name={o.authorName} size="md" />
      </Pressable>
      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-1.5">
          <Pressable onPress={openAuthor} hitSlop={6} className="shrink" style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
            <Text className="text-ink-900 font-semibold text-sm" numberOfLines={1}>{o.authorName}</Text>
          </Pressable>
          <Text className="text-ink-400 text-[13px]">· {timeAgo(o.createdAt)}</Text>
          <View className="flex-1" />
          <Badge label={meta.label} icon={meta.icon} tone="accent" />
          <Pressable onPress={() => {}} hitSlop={HIT_SLOP} className="w-8 h-8 rounded-full border border-surface-border items-center justify-center">
            <Icon name="more" size={16} color={colors.ink[500]} />
          </Pressable>
        </View>
        <Text className="text-ink-900 font-semibold leading-5">{o.title}</Text>
        {o.description ? <Text className="text-ink-700 leading-5" numberOfLines={3}>{o.description}</Text> : null}
        {where ? <Text className="text-ink-400 text-[13px]">{where}</Text> : null}

        <View className="flex-row items-center gap-6 pt-1">
          <AnimatedReaction icon="insight" active={o.insighted} activeColor={colors.action.insight} count={o.insightCount} onPress={onToggleInsight ? () => onToggleInsight(o) : undefined} />
          <AnimatedReaction icon="heart" active={o.liked} activeColor={colors.action.like} count={o.likeCount} onPress={onToggleLike ? () => onToggleLike(o) : undefined} />
          <AnimatedReaction icon="comment" active={false} activeColor={colors.action.comment} count={o.commentCount} onPress={onOpen ? () => onOpen(o) : undefined} />
          <AnimatedReaction icon="repost" active={false} activeColor={colors.action.repost} count={0} onPress={onRepost ? () => onRepost(o) : undefined} />
          <AnimatedReaction icon="send" active={false} activeColor={colors.action.send} count={0} onPress={onSend ? () => onSend(o) : undefined} />
        </View>
      </View>
    </Pressable>
  );
}
