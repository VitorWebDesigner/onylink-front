import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CommentThread, type CommentNode } from './CommentThread';
import { PRESSED_OPACITY } from '../theme/tokens';

interface Props {
  comments: CommentNode[];
  onToggleLike: (c: CommentNode) => void;
  onToggleInsight: (c: CommentNode) => void;
  onToggleRepost: (c: CommentNode) => void;
  onToggleShare: (c: CommentNode) => void;
  onReply: (c: CommentNode) => void;
}

// Comentário PRIMÁRIO sempre aparece; só paginamos se houver MUITOS primários.
// (A ocultação por "muitas respostas" é por-comentário, dentro do CommentThread.)
const INITIAL_ROOTS = 8;
const ROOT_BATCH = 8;

/**
 * Seção de comentários. Os primários (top-level) são mostrados direto (até
 * INITIAL_ROOTS); se houver mais, um "Ver mais" revela em lotes. Respostas muito
 * numerosas de um comentário colapsam dentro do próprio comentário (CommentThread).
 */
export function CommentsSection({ comments, onToggleLike, onToggleInsight, onToggleRepost, onToggleShare, onReply }: Props) {
  const byId = new Map(comments.map((c) => [c.id, c]));
  const roots = comments.filter((c) => !c.parentId || !byId.has(c.parentId));
  const [shown, setShown] = useState(INITIAL_ROOTS);

  if (!roots.length) return <Text className="text-ink-500">Seja o primeiro a comentar.</Text>;

  const remaining = roots.length - shown;
  return (
    <View>
      <CommentThread
        comments={comments}
        maxRoots={shown}
        onToggleLike={onToggleLike}
        onToggleInsight={onToggleInsight}
        onToggleRepost={onToggleRepost}
        onToggleShare={onToggleShare}
        onReply={onReply}
      />
      {remaining > 0 ? (
        <Pressable
          onPress={() => setShown((s) => s + ROOT_BATCH)}
          style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
          className="pt-4 mt-4 border-t border-surface-border"
        >
          <Text className="text-brand-500 font-semibold text-sm">Ver mais {remaining} comentário{remaining > 1 ? 's' : ''}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
