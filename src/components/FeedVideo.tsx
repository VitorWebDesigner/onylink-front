import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { VideoView } from 'expo-video';
import { Icon } from './Icon';
import { HIT_SLOP } from '../theme/tokens';
import { absoluteMediaUrl, bunnyHeaders } from '../lib/media';
import { useSharedVideoPlayer, useVideoOwnership } from '../lib/videoPlayers';
import { compactNumber } from '../lib/format';
import { useMediaUi } from '../store/mediaUi';
import type { MediaItem } from '../features/feed/types';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

interface Props {
  item: MediaItem;
  active: boolean; // post visível no feed → toca; senão pausa
  onOpen?: () => void; // 1 toque → tela cheia
  onDoubleTap?: () => void; // 2 toques → reagir
  viewCount?: number; // visualizações do post → chip no canto
}

/**
 * Vídeo inline no feed: autoplay MUDO + loop quando o post está visível; botão de
 * som pra ligar o áudio sem abrir tela cheia; proporção adapta ao vídeo (horizontal
 * ou vertical) sem cortar (contentFit contain, aspecto clampado 0.6–1.91).
 *
 * O player é COMPARTILHADO por URL com a tela cheia. Como um player só renderiza numa
 * VideoView por vez, usamos POSSE (`useVideoOwnership`): esta VideoView só é montada
 * quando é a "dona" do url; senão mostra o POSTER (thumbnail). E mesmo ao reassumir a
 * posse (ex.: ao sair da tela cheia), o poster fica por cima por um instante cobrindo
 * o re-attach da superfície nativa → NUNCA aparece um flash preto.
 */
export function FeedVideo({ item, active, onOpen, onDoubleTap, viewCount }: Props) {
  const url = absoluteMediaUrl(item.url);
  const muted = useMediaUi((s) => s.muted);
  const toggleMuted = useMediaUi((s) => s.toggleMuted);
  const isOwner = useVideoOwnership(url); // esta é a VideoView que renderiza o player?
  const [aspect, setAspect] = useState(1);
  const [videoShown, setVideoShown] = useState(false); // vídeo pronto na tela (poster já pode sair)
  const lastTap = useRef(0);
  const activeRef = useRef(active);
  activeRef.current = active;

  // player COMPARTILHADO por URL → a tela cheia reaproveita ESTA mesma instância (já
  // tocando, já no ponto), sem recarregar/rebuffer ao expandir.
  const player = useSharedVideoPlayer(url);

  // poster (thumbnail) cobre até o vídeo estar de fato exibindo. Sai só ~180ms depois
  // de reassumir a posse (tempo do re-attach nativo) → sem flash preto; volta na hora
  // que perde a posse (tela cheia/detalhe assume).
  useEffect(() => {
    if (!isOwner) { setVideoShown(false); return; }
    const t = setTimeout(() => setVideoShown(true), 180);
    return () => clearTimeout(t);
  }, [isOwner]);

  // proporção sem cortar (semeada já do player, pois o `sourceLoad` NÃO re-dispara se o
  // player compartilhado já estava carregado) + autoplay assim que fica pronto.
  useEffect(() => {
    const seed = () => { const s = player.videoTrack?.size ?? player.availableVideoTracks?.[0]?.size; if (s?.width && s?.height) setAspect(clamp(s.width / s.height, 0.6, 1.91)); };
    try { seed(); } catch { /* noop */ }
    const dim = player.addListener('sourceLoad', (payload) => {
      const size = payload.availableVideoTracks?.[0]?.size;
      if (size?.width && size?.height) setAspect(clamp(size.width / size.height, 0.6, 1.91));
    });
    const st = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay' && activeRef.current) { try { player.play(); } catch { /* noop */ } }
    });
    return () => { dim.remove(); st.remove(); };
  }, [player]);

  useEffect(() => {
    try { if (active) player.play(); else player.pause(); } catch { /* noop */ }
  }, [active, player]);

  useEffect(() => {
    // try/catch: player compartilhado pode ter sido liberado pelo grace do
    // registry — setar prop em player released crasha no Android
    try { player.muted = muted; } catch { /* noop */ }
  }, [muted, player]);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 260) { lastTap.current = 0; onDoubleTap?.(); }
    // abre a tela cheia (o player é o MESMO → continua exatamente do ponto atual)
    else { lastTap.current = now; setTimeout(() => { if (lastTap.current === now) onOpen?.(); }, 260); }
  };

  const showControls = isOwner && videoShown;

  return (
    <Pressable onPress={handleTap} style={{ width: '100%', aspectRatio: aspect }} className="bg-black rounded-2xl overflow-hidden border border-surface-border">
      {/* VideoView só quando é a dona do player (senão duas views no mesmo player = preto). */}
      {isOwner ? (
        <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls={false} fullscreenOptions={{ enable: false }} allowsPictureInPicture={false} allowsVideoFrameAnalysis={false} />
      ) : null}
      {/* poster por cima até o vídeo estar exibindo → cobre o re-attach (zero preto).
          sem thumbnail (raro) → preenche navy, NUNCA preto. */}
      {!videoShown ? (
        item.thumbnail ? (
          <Image pointerEvents="none" source={{ uri: item.thumbnail, headers: bunnyHeaders(item.thumbnail) }} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="contain" cachePolicy="memory-disk" transition={0} />
        ) : (
          <View pointerEvents="none" style={{ position: 'absolute', width: '100%', height: '100%' }} className="bg-brand-500" />
        )
      ) : null}
      {/* visualizações — chip no canto inferior esquerdo */}
      {showControls && viewCount != null ? (
        <View className="absolute bottom-2.5 left-2.5 flex-row items-center gap-1 rounded-full px-2 py-1" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <Icon name="eye" set="light" size={14} color="#FFFFFF" />
          <Text className="text-white text-[11px] font-semibold">{compactNumber(viewCount)}</Text>
        </View>
      ) : null}
      {showControls ? (
        <Pressable
          onPress={toggleMuted}
          hitSlop={HIT_SLOP}
          className="absolute bottom-2.5 right-2.5 w-9 h-9 rounded-full items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        >
          <Icon name={muted ? 'volumeOff' : 'volumeOn'} size={18} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </Pressable>
  );
}
