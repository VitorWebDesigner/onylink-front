import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { AnimatedReaction } from './AnimatedReaction';
import { colors } from '../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../theme/tokens';
import { timeAgo } from '../lib/time';

/** Forma normalizada de um comentário (post ou oportunidade) — item 4. Mini-post: 5 ações. */
export interface CommentNode {
  id: string;
  authorId?: string | null;
  authorName: string;
  authorAvatar?: string | null;
  authorRoleTitle?: string | null;
  content: string;
  createdAt: string;
  parentId: string | null;
  likeCount: number;
  insightCount: number;
  replyCount: number;
  repostCount: number;
  shareCount: number;
  liked: boolean;
  insighted: boolean;
  reposted: boolean;
  shared: boolean;
}

interface Props {
  comments: CommentNode[];
  onToggleLike: (c: CommentNode) => void;
  onToggleInsight: (c: CommentNode) => void;
  onToggleRepost: (c: CommentNode) => void;
  onToggleShare: (c: CommentNode) => void;
  onReply: (c: CommentNode) => void;
  /** Tocar no avatar/nome do comentarista → perfil dele. */
  onOpenUser?: (userId: string) => void;
  /** Toque nos 3-pontos do comentário (denunciar/excluir). */
  onMenu?: (c: CommentNode) => void;
  /** Limita quantos comentários de topo renderizam (revelação progressiva). */
  maxRoots?: number;
}

const LINE = '#D6D8DD'; // linha de thread (discreta) — entre border e ink-400
const AV_CENTER = 16; // avatar sm = 32 → centro vertical/horizontal 16
const RADIUS = 9;     // raio da curva da linha de thread
const REPLY_PT = 12;  // espaço acima de cada resposta (= pt-3), que a linha precisa cobrir

/** Corpo de um comentário: header, texto e barra COMPLETA (insight · curtir · comentar · repostar · enviar). */
function CommentBody({ c, onToggleLike, onToggleInsight, onToggleRepost, onToggleShare, onReply, onOpenUser, onMenu }: { c: CommentNode } & Pick<Props, 'onToggleLike' | 'onToggleInsight' | 'onToggleRepost' | 'onToggleShare' | 'onReply' | 'onOpenUser' | 'onMenu'>) {
  return (
    <View className="flex-1 gap-0.5">
      <View className="flex-row items-center gap-2">
        <Pressable onPress={onOpenUser && c.authorId ? () => onOpenUser(c.authorId!) : undefined} hitSlop={6} className="shrink" style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
          <Text className="text-ink-900 font-semibold text-sm" numberOfLines={1}>{c.authorName}</Text>
        </Pressable>
        <Text className="text-ink-400 text-micro">{timeAgo(c.createdAt)}</Text>
        <View className="flex-1" />
        <Pressable onPress={onMenu ? () => onMenu(c) : undefined} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="w-6 h-6 rounded-full border border-surface-border items-center justify-center">
          <Icon name="more" size={13} color={colors.ink[400]} />
        </Pressable>
      </View>
      {c.authorRoleTitle ? <Text className="text-ink-400 text-xs -mt-0.5" numberOfLines={1}>{c.authorRoleTitle}</Text> : null}
      <Text className="text-ink-700 leading-5">{c.content}</Text>
      <View className="flex-row items-center gap-5 pt-1">
        <AnimatedReaction icon="insight" active={c.insighted} activeColor={colors.action.insight} count={c.insightCount} onPress={() => onToggleInsight(c)} size={17} fontSize={12} gap={4} />
        <AnimatedReaction icon="heart" active={c.liked} activeColor={colors.action.like} count={c.likeCount} onPress={() => onToggleLike(c)} size={17} fontSize={12} gap={4} />
        <AnimatedReaction icon="comment" active={false} activeColor={colors.action.comment} count={c.replyCount} onPress={() => onReply(c)} size={17} fontSize={12} gap={4} />
        <AnimatedReaction icon="repost" active={c.reposted} activeColor={colors.action.repost} count={c.repostCount} onPress={() => onToggleRepost(c)} size={17} fontSize={12} gap={4} />
        <AnimatedReaction icon="send" active={c.shared} activeColor={colors.action.send} count={c.shareCount} onPress={() => onToggleShare(c)} size={17} fontSize={12} gap={4} />
      </View>
    </View>
  );
}

/**
 * Conector de thread: linha vertical reta que faz UMA curva (quarto de círculo)
 * entrando no avatar da resposta. A reta termina EXATAMENTE onde a curva começa
 * (raio = altura da curva) → sem sobra pontuda. Numa resposta intermediária a reta
 * continua até a próxima; na última, para na curva.
 */
function Connector({ isLast }: { isLast: boolean }) {
  return (
    <View style={{ width: 28 }}>
      {/* reta vertical: cobre o pt-3 (top:-REPLY_PT). Última = só até a curva; demais = contínua. */}
      <View
        style={{
          position: 'absolute',
          left: AV_CENTER - 1,
          top: -REPLY_PT,
          width: 2,
          backgroundColor: LINE,
          ...(isLast ? { height: REPLY_PT + AV_CENTER - RADIUS } : { bottom: 0 }),
        }}
      />
      {/* curva (quarto de círculo) ligando a reta ao avatar */}
      <View
        style={{
          position: 'absolute',
          left: AV_CENTER - 1,
          top: AV_CENTER - RADIUS,
          width: RADIUS + 2,
          height: RADIUS,
          borderLeftWidth: 2,
          borderBottomWidth: 2,
          borderColor: LINE,
          borderBottomLeftRadius: RADIUS,
        }}
      />
    </View>
  );
}

type Handlers = Pick<Props, 'onToggleLike' | 'onToggleInsight' | 'onToggleRepost' | 'onToggleShare' | 'onReply' | 'onOpenUser' | 'onMenu'>;

// Respostas de UM comentário colapsam só se houver MAIS que isso (tolerante — o
// comentário primário sempre aparece; escondemos apenas excesso de respostas).
const REPLY_COLLAPSE = 2;

/**
 * Um comentário e suas respostas DIRETAS, recursivamente. A linha de thread liga
 * o avatar deste comentário ao avatar de cada resposta direta dele. Se um
 * comentário tiver MUITAS respostas (> REPLY_COLLAPSE), elas ficam ocultas atrás
 * de "Ver N respostas" (o primário continua visível).
 */
function CommentBranch({ node, childrenOf, countDesc, depth, h }: { node: CommentNode; childrenOf: (id: string) => CommentNode[]; countDesc: (id: string) => number; depth: number; h: Handlers }) {
  const kids = depth < 12 ? childrenOf(node.id) : [];
  const collapsible = kids.length > REPLY_COLLAPSE;
  const [expanded, setExpanded] = useState(false);
  const showKids = !collapsible || expanded;
  const total = countDesc(node.id);

  return (
    <View>
      <View className="flex-row gap-3">
        <View className="relative">
          <Pressable onPress={h.onOpenUser && node.authorId ? () => h.onOpenUser!(node.authorId!) : undefined} hitSlop={6} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
            <Avatar name={node.authorName} uri={node.authorAvatar} size="sm" />
          </Pressable>
          {/* toco que desce do avatar deste comentário até a 1ª resposta (ou o "Ver respostas") */}
          {kids.length ? <View style={{ position: 'absolute', left: AV_CENTER - 1, top: 32, width: 2, bottom: 0, backgroundColor: LINE }} /> : null}
        </View>
        <CommentBody c={node} onToggleLike={h.onToggleLike} onToggleInsight={h.onToggleInsight} onToggleRepost={h.onToggleRepost} onToggleShare={h.onToggleShare} onReply={h.onReply} onOpenUser={h.onOpenUser} onMenu={h.onMenu} />
      </View>

      {showKids ? (
        kids.map((k, i) => (
          <View key={k.id} className="flex-row pt-3">
            <Connector isLast={i === kids.length - 1} />
            <View className="flex-1">
              <CommentBranch node={k} childrenOf={childrenOf} countDesc={countDesc} depth={depth + 1} h={h} />
            </View>
          </View>
        ))
      ) : (
        <View className="flex-row pt-3">
          <Connector isLast />
          <Pressable onPress={() => setExpanded(true)} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-1 flex-row items-center gap-2">
            {/* fotos de quem respondeu (pilha sobreposta) antes do texto */}
            <View className="flex-row">
              {kids.slice(0, 3).map((k, i) => (
                <View key={k.id} style={{ marginLeft: i === 0 ? 0 : -8 }} className="rounded-full border-2 border-surface">
                  <Avatar name={k.authorName} uri={k.authorAvatar} size="xs" />
                </View>
              ))}
            </View>
            <Text className="text-brand-500 text-[13px] font-semibold">Ver {total} resposta{total > 1 ? 's' : ''}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/**
 * Lista de comentários com threading (item 4/6). Recebe os comentários CHAPADOS e
 * os aninha por `parent_id` de forma RECURSIVA — a linha de thread liga cada
 * resposta ao avatar do comentário que ela respondeu (não ao de topo).
 */
export function CommentThread({ comments, onToggleLike, onToggleInsight, onToggleRepost, onToggleShare, onReply, onOpenUser, onMenu, maxRoots }: Props) {
  const byId = new Map(comments.map((c) => [c.id, c]));
  const childrenByParent = new Map<string, CommentNode[]>();
  for (const c of comments) {
    if (c.parentId && byId.has(c.parentId)) {
      const arr = childrenByParent.get(c.parentId);
      if (arr) arr.push(c);
      else childrenByParent.set(c.parentId, [c]);
    }
  }
  const childrenOf = (id: string) => childrenByParent.get(id) ?? [];
  const countDesc = (id: string): number => {
    const kids = childrenByParent.get(id) ?? [];
    return kids.reduce((n, k) => n + 1 + countDesc(k.id), 0);
  };
  const allRoots = comments.filter((c) => !c.parentId || !byId.has(c.parentId));
  const roots = maxRoots != null ? allRoots.slice(0, maxRoots) : allRoots;
  const h: Handlers = { onToggleLike, onToggleInsight, onToggleRepost, onToggleShare, onReply, onOpenUser, onMenu };

  return (
    <View className="gap-4">
      {roots.map((root) => (
        <CommentBranch key={root.id} node={root} childrenOf={childrenOf} countDesc={countDesc} depth={0} h={h} />
      ))}
    </View>
  );
}
