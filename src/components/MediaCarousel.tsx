import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { Icon } from './Icon';
import { FeedVideo } from './FeedVideo';
import { colors } from '../theme/colors';
import { bunnyHeaders } from '../lib/media';
import type { MediaItem } from '../features/feed/types';

const ASPECT = 4 / 5; // proporção padrão (retrato leve)
const PEEK = 26; // quanto o vizinho da direita "espia"
const GAP = 10; // espaço entre os blocos

interface Props {
  onPressImage?: (index: number) => void; // 1 toque → tela cheia
  media: MediaItem[];
  onDoubleTap?: () => void; // 2 toques → reagir
  active?: boolean; // post visível no feed → vídeo único faz autoplay
  viewCount?: number; // visualizações (chip no vídeo do feed)
}

/** Bolinha de página com animação suave (largura + cor) ao virar. */
function Dot({ active }: { active: boolean }) {
  const a = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: active ? 1 : 0, duration: 220, useNativeDriver: false }).start();
  }, [active, a]);
  return (
    <Animated.View
      style={{
        height: 6,
        borderRadius: 3,
        width: a.interpolate({ inputRange: [0, 1], outputRange: [6, 18] }),
        backgroundColor: a.interpolate({ inputRange: [0, 1], outputRange: [colors.surface.border, colors.brand[500]] }),
      }}
    />
  );
}

/** Conteúdo da mídia (imagem cacheada + overlay de play em vídeo). */
function Media({ m }: { m: MediaItem }) {
  return (
    <>
      <Image source={{ uri: m.thumbnail ?? m.url, headers: bunnyHeaders(m.thumbnail ?? m.url) }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" transition={120} />
      {m.type === 'VIDEO' ? (
        <View className="absolute inset-0 items-center justify-center">
          <View className="w-14 h-14 rounded-full bg-black/45 items-center justify-center">
            <Icon name="forward" set="bold" size={28} color="#FFFFFF" />
          </View>
        </View>
      ) : null}
    </>
  );
}

/**
 * Mídia do post. Imagem única = bloco de largura cheia. Várias = carrossel LIVRE:
 * cada imagem é um bloco próprio (arredondado), com um pouquinho do vizinho à
 * mostra dos dois lados; o scroll é livre e faz snap na imagem onde o usuário
 * parar (snapToInterval — não força "uma página por swipe"). `expo-image` cacheia.
 */
export function MediaCarousel({ media, onPressImage, onDoubleTap, active, viewCount }: Props) {
  const { width: SCREEN_W } = useWindowDimensions(); // reage a rotação/split-screen
  const [box, setBox] = useState({ left: 0, w: 0 }); // posição NA TELA (p/ full-bleed)
  const [page, setPage] = useState(0);
  const lastTap = useRef(0);
  const boxRef = useRef<View>(null);
  if (!media.length) return null;

  const handleTap = (index: number) => {
    const now = Date.now();
    if (now - lastTap.current < 260) {
      lastTap.current = 0;
      onDoubleTap?.();
    } else {
      lastTap.current = now;
      setTimeout(() => { if (lastTap.current === now) onPressImage?.(index); }, 260);
    }
  };

  if (media.length === 1) {
    const only = media[0]!;
    // vídeo único: player inline com autoplay mudo e proporção adaptativa
    if (only.type === 'VIDEO') {
      return <FeedVideo item={only} active={!!active} onOpen={() => onPressImage?.(0)} onDoubleTap={onDoubleTap} viewCount={viewCount} />;
    }
    return (
      <Pressable onPress={() => handleTap(0)} style={{ aspectRatio: ASPECT }} className="rounded-2xl overflow-hidden border border-surface-border bg-surface-muted">
        <Media m={only} />
      </Pressable>
    );
  }

  // 1ª imagem ALINHADA à legenda (`paddingLeft = box.left`); a ScrollView é FULL-BLEED
  // (largura da tela via `marginLeft: -box.left`), então ao arrastar as imagens PASSAM
  // pelo espaço vazio à esquerda (bleed até a borda da tela), sem cortar no alinhamento
  // da legenda. `snapToInterval` leva cada imagem pro início (à esquerda). Peek à direita.
  const card = box.w > 0 ? box.w - PEEK : 0;
  const rightPad = Math.max(0, SCREEN_W - box.left - box.w); // margem direita original do conteúdo
  return (
    <View ref={boxRef} onLayout={() => boxRef.current?.measureInWindow((x, _y, width) => { if (width) setBox({ left: x, w: width }); })}>
      {box.w > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={card + GAP}
          style={{ width: SCREEN_W, marginLeft: -box.left }}
          contentContainerStyle={{ paddingLeft: box.left, paddingRight: rightPad }}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / (card + GAP)))}
        >
          {media.map((m, i) => (
            <Pressable
              key={i}
              onPress={() => handleTap(i)}
              style={{ width: card, aspectRatio: ASPECT, marginRight: i < media.length - 1 ? GAP : 0 }}
              className="rounded-2xl overflow-hidden border border-surface-border bg-surface-muted"
            >
              <Media m={m} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <View className="flex-row justify-center gap-1.5 mt-2">
        {media.map((_, i) => <Dot key={i} active={i === page} />)}
      </View>
    </View>
  );
}
