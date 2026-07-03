import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Icon } from '../Icon';
import { colors } from '../../theme/colors';
import { PRESSED_OPACITY } from '../../theme/tokens';
import { timeAgo } from '../../lib/time';
import { compactNumber } from '../../lib/format';
import type { FeedPost } from '../../features/feed/types';

function Count({ icon, value, filled }: { icon: 'insight' | 'heart' | 'comment' | 'eye'; value: number; filled?: boolean }) {
  if (!value) return null;
  return (
    <View className="flex-row items-center gap-1">
      <Icon name={icon} set={filled ? 'bold' : 'light'} size={13} color={colors.ink[400]} />
      <Text className="text-ink-400 text-xs">{compactNumber(value)}</Text>
    </View>
  );
}

/**
 * Linha COMPACTA de publicação (aba Publicações do perfil — estilo X compacto):
 * texto à esquerda (3 linhas) + thumb da 1ª mídia à direita → posts com e sem
 * mídia ficam no MESMO padrão visual e a rolagem encurta. Toque abre o post;
 * toque longo abre o menu (fixar, no próprio perfil).
 */
export function CompactPostRow({ post, onPress, onLongPress }: {
  post: FeedPost;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const m = post.media[0];
  const thumb = m ? (m.type === 'VIDEO' ? m.thumbnail : m.url) : null;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
      className="flex-row gap-3 px-4 py-3 border-b border-surface-border"
    >
      <View className="flex-1 gap-1">
        {post.pinned ? (
          <View className="flex-row items-center gap-1">
            <Icon name="bookmark" set="bold" size={11} color={colors.ink[400]} />
            <Text className="text-ink-400 text-[11px] font-semibold">Fixado</Text>
          </View>
        ) : null}
        <Text className="text-ink-700 leading-5" numberOfLines={3}>{post.content?.trim() || `#${post.category}`}</Text>
        <Text className="text-ink-400 text-xs">{timeAgo(post.createdAt)} · <Text className="text-brand-500 font-semibold">#{post.category}</Text></Text>
        <View className="flex-row items-center gap-4 pt-0.5">
          <Count icon="insight" value={post.insightCount} />
          <Count icon="heart" value={post.likeCount} />
          <Count icon="comment" value={post.commentCount} />
          <Count icon="eye" value={post.viewCount} />
        </View>
      </View>

      {thumb ? (
        <View className="w-16 h-20 rounded-lg overflow-hidden bg-surface-muted">
          <Image source={{ uri: thumb }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          {m?.type === 'VIDEO' ? (
            <View style={{ position: 'absolute', right: 4, bottom: 4 }}>
              <Icon name="play" size={12} color="#FFFFFF" />
            </View>
          ) : null}
          {post.media.length > 1 ? (
            <View style={{ position: 'absolute', top: 4, right: 4 }}>
              <View className="rounded-full px-1.5 py-0.5" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
                <Text className="text-white text-[10px] font-bold">+{post.media.length - 1}</Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
