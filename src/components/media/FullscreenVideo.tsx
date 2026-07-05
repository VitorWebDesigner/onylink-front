import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { VideoView } from 'expo-video';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Avatar } from '../Avatar';
import { Icon } from '../Icon';
import { AnimatedReaction } from '../AnimatedReaction';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { absoluteMediaUrl, bunnyHeaders } from '../../lib/media';
import { useSharedVideoPlayer, useVideoOwnership } from '../../lib/videoPlayers';
import { compactNumber } from '../../lib/format';
import { useMediaUi } from '../../store/mediaUi';
import { useAuth } from '../../store/auth';
import { canRepostPost, type FeedPost, type MediaItem } from '../../features/feed/types';

const safeTime = (fn: () => number) => { try { return fn(); } catch { return 0; } };

const CHIP: ViewStyle = { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' };
const SPEEDS = [1, 1.5, 2] as const;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function mmss(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

interface RState { insighted: boolean; liked: boolean; reposted: boolean; shared: boolean; insightCount: number; likeCount: number; repostCount: number; shareCount: number; commentCount: number }

interface Props {
  item: MediaItem;
  post: FeedPost;
  r: RState;
  insetTop: number;
  insetBottom: number;
  onReact: (kind: 'insight' | 'like' | 'repost' | 'share') => void;
  onComment: () => void;
  onFollow?: () => void;
  /** Tocar no avatar/nome do autor → perfil (quem fecha o viewer é o provider). */
  onAuthor?: () => void;
  isAuthor?: boolean;
  onClose: () => void;
}

/**
 * Player de vídeo em tela cheia (estilo Reels/Instagram):
 *  - controles: play/pause, linha do tempo (arrastar p/ buscar), mute, velocidade (1×/1,5×/2×);
 *  - toque-e-segura em QUALQUER lado → 2× enquanto segura (solta volta à velocidade escolhida);
 *  - toque simples = play/pause · toque duplo = reagir (curtir);
 *  - barra de AÇÕES vai pra LATERAL DIREITA (vertical); infos do autor + views no canto inf. esquerdo.
 *
 * A **linha do tempo** usa gesture-handler + reanimated: a posição vem de `e.x`
 * (relativo à barra, confiável — `locationX` do PanResponder pulava de nó e bugava),
 * e o preenchimento roda na thread nativa (shared value) → sem re-render a cada frame,
 * e onde o dedo solta é EXATAMENTE onde o vídeo busca.
 */
export function FullscreenVideo({ item, post, r, insetTop, insetBottom, onReact, onComment, onFollow, onAuthor, isAuthor, onClose }: Props) {
  // player COMPARTILHADO com o feed → MESMA instância, já bufferizada e no ponto certo.
  const url = absoluteMediaUrl(item.url);
  const player = useSharedVideoPlayer(url);
  const isOwner = useVideoOwnership(url); // tela cheia monta por último → vira dona (feed cede)

  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [current, setCurrent] = useState(() => safeTime(() => player.currentTime ?? 0));
  const [duration, setDuration] = useState(() => safeTime(() => player.duration ?? 0));
  const [holding, setHolding] = useState(false); // segurando p/ 2×
  const [followed, setFollowed] = useState(post.authorFollowed);
  const me = useAuth((s) => s.user);
  // post de comunidade não destacado: repostar só pro DONO da comunidade
  const canRepost = canRepostPost(post, me?.id);

  const draggingRef = useRef(false);
  const holdingRef = useRef(false);
  const speedRef = useRef(1); // velocidade "base" escolhida (fora do hold)
  const lastTap = useRef(0);
  const durationRef = useRef(safeTime(() => player.duration ?? 0)); // duração p/ o seek final (JS)
  const seekingRef = useRef(false); // logo após um seek: fixa a barra no alvo até o player alcançar
  const seekTargetFracRef = useRef(0);
  const prevFracRef = useRef(0); // última fração aplicada (detecta rewind/loop p/ dar snap)
  const seekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // valores na thread nativa p/ a timeline (fill/thumb) + math do gesto
  const progress = useSharedValue(0); // 0..1
  const barW = useSharedValue(0); // largura da barra (p/ frac = x / barW)
  const durationSV = useSharedValue(0);
  const lastSecSV = useSharedValue(-1);

  // Ao montar: posiciona a barra no ponto ATUAL do player (instantâneo, SEM seek/reload),
  // garante que está tocando e LIGA o som (o feed toca mudo). Ao fechar, devolve o player
  // pro feed (mudo conforme o estado global, velocidade 1×).
  useEffect(() => {
    const d = safeTime(() => player.duration ?? 0);
    const c = safeTime(() => player.currentTime ?? 0);
    if (d > 0) { durationRef.current = d; durationSV.value = d; setDuration(d); const f = clamp01(c / d); progress.value = f; prevFracRef.current = f; setCurrent(c); }
    try { player.muted = false; player.play(); } catch { /* noop */ }
    // ao fechar: devolve o player pro feed MUDO (estado global), 1× e TOCANDO (se o
    // usuário pausou na tela cheia, o feed não pode ficar congelado).
    return () => { try { player.muted = useMediaUi.getState().muted; player.playbackRate = 1; player.play(); } catch { /* noop */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  // sincroniza tempo/duração/estado a partir do player (só quando NÃO está arrastando)
  useEffect(() => {
    const setDur = (d: number) => { if (d && isFinite(d)) { durationRef.current = d; durationSV.value = d; setDuration(d); } };
    const t = player.addListener('timeUpdate', (p) => {
      setDur(player.duration);
      if (draggingRef.current) return;
      const d = durationRef.current;
      const ct = p.currentTime ?? 0;
      const frac = d > 0 ? clamp01(ct / d) : 0;
      // após um seek, o player (HLS) pode reportar a posição ANTIGA por 1+ amostras;
      // ignora essas até chegar perto do alvo → a barra não "volta" (rubber-band).
      if (seekingRef.current) {
        if (Math.abs(frac - seekTargetFracRef.current) < 0.04) {
          seekingRef.current = false;
          if (seekTimer.current) { clearTimeout(seekTimer.current); seekTimer.current = null; }
        } else {
          return;
        }
      }
      setCurrent(ct);
      // loop/rewind (salto grande p/ trás) → snap; senão desliza suave entre amostras
      progress.value = frac < prevFracRef.current - 0.2 ? frac : withTiming(frac, { duration: 250, easing: Easing.linear });
      prevFracRef.current = frac;
    });
    const pl = player.addListener('playingChange', (p) => setPlaying(!!p.isPlaying));
    const sl = player.addListener('sourceLoad', () => setDur(player.duration));
    return () => { t.remove(); pl.remove(); sl.remove(); };
  }, [player, progress, durationSV]);

  // limpa o timer de segurança do seek ao desmontar
  useEffect(() => () => { if (seekTimer.current) clearTimeout(seekTimer.current); }, []);

  useEffect(() => { try { player.muted = muted; } catch { /* player released */ } }, [muted, player]);

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]!;
    setSpeed(next);
    speedRef.current = next;
    if (!holdingRef.current) { try { player.playbackRate = next; } catch { /* noop */ } }
  };

  const togglePlay = () => { try { if (player.playing) player.pause(); else player.play(); } catch { /* noop */ } };

  // gestos na área do vídeo: segurar → 2×; toque simples = play/pause; duplo = reagir
  const onLongPress = () => { holdingRef.current = true; setHolding(true); try { player.playbackRate = 2; } catch { /* noop */ } };
  const onPressOut = () => {
    if (!holdingRef.current) return;
    holdingRef.current = false; setHolding(false);
    try { player.playbackRate = speedRef.current; } catch { /* noop */ }
  };
  const onPress = () => {
    const now = Date.now();
    if (now - lastTap.current < 260) { lastTap.current = 0; onReact('like'); }
    else { lastTap.current = now; setTimeout(() => { if (lastTap.current === now) togglePlay(); }, 260); }
  };

  // ── linha do tempo (gesture-handler): x relativo à barra → frac confiável ──
  const startDrag = () => { draggingRef.current = true; };
  const previewSec = (s: number) => setCurrent(s); // texto do tempo enquanto arrasta (throttle por segundo)
  // aplica o seek na posição final. Roda no onFinalize → SEMPRE dispara (tap, drag e
  // cancel), então o tap busca de verdade e o draggingRef nunca fica preso.
  const applySeekEnd = (f: number) => {
    draggingRef.current = false;
    const d = durationRef.current;
    if (d <= 0) return; // duração ainda desconhecida → não busca (evita ir pro 0)
    const target = f * d;
    try { player.currentTime = target; } catch { /* noop */ }
    setCurrent(target);
    seekingRef.current = true; // fixa a barra no alvo até o player alcançar
    seekTargetFracRef.current = f;
    prevFracRef.current = f;
    if (seekTimer.current) clearTimeout(seekTimer.current);
    seekTimer.current = setTimeout(() => { seekingRef.current = false; }, 1000); // solta o pino se a amostra exata não vier
  };

  const seekPan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      runOnJS(startDrag)();
      const f = barW.value > 0 ? Math.max(0, Math.min(1, e.x / barW.value)) : 0;
      progress.value = f;
      lastSecSV.value = -1;
    })
    .onUpdate((e) => {
      const f = barW.value > 0 ? Math.max(0, Math.min(1, e.x / barW.value)) : 0;
      progress.value = f;
      if (durationSV.value > 0) {
        const s = Math.floor(f * durationSV.value);
        if (s !== lastSecSV.value) { lastSecSV.value = s; runOnJS(previewSec)(s); }
      }
    })
    .onFinalize(() => {
      runOnJS(applySeekEnd)(progress.value);
    });

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const thumbStyle = useAnimatedStyle(() => ({ left: `${progress.value * 100}%` }));

  const handleFollow = () => { setFollowed((f) => !f); onFollow?.(); };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* vídeo + gestos (segurar 2× · toque play/pause · duplo reagir) */}
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressOut={onPressOut}
        delayLongPress={200}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
      >
        {isOwner ? <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls={false} fullscreenOptions={{ enable: false }} allowsPictureInPicture={false} allowsVideoFrameAnalysis={false} /> : null}
        {/* cobre o 1 frame de entrada (antes da posse virar) → sem flash preto ao expandir */}
        {!isOwner && item.thumbnail ? (
          <Image pointerEvents="none" source={{ uri: item.thumbnail, headers: bunnyHeaders(item.thumbnail) }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="contain" cachePolicy="memory-disk" transition={0} />
        ) : null}
      </Pressable>

      {/* ícone central play/pause (só quando pausado) */}
      {!playing && !holding ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="play" size={36} color="#FFFFFF" />
          </View>
        </View>
      ) : null}

      {/* indicador 2× enquanto segura */}
      {holding ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: insetTop + 70, left: 0, right: 0, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 }}>
            <Icon name="forward" set="bold" size={16} color="#FFFFFF" />
            <Text className="text-white font-bold text-sm">2×</Text>
          </View>
        </View>
      ) : null}

      {/* header: fechar (esq) · 3-pontos p/ ações futuras (dir) */}
      <View style={{ position: 'absolute', top: insetTop + 8, left: 14, right: 14, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={onClose} hitSlop={HIT_SLOP} style={({ pressed }) => [CHIP, { opacity: pressed ? PRESSED_OPACITY : 1 }]}>
          <Icon name="close" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable hitSlop={HIT_SLOP} style={({ pressed }) => [CHIP, { opacity: pressed ? PRESSED_OPACITY : 1 }]}>
          <Icon name="more" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* barra de AÇÕES vertical — lateral direita */}
      <View style={{ position: 'absolute', right: 12, bottom: insetBottom + 150, alignItems: 'center', gap: 20 }}>
        <AnimatedReaction icon="insight" vertical active={r.insighted} activeColor={colors.action.insight} inactiveColor="#FFFFFF" count={r.insightCount} size={30} fontSize={13} onPress={() => onReact('insight')} />
        <AnimatedReaction icon="heart" vertical active={r.liked} activeColor={colors.action.like} inactiveColor="#FFFFFF" count={r.likeCount} size={30} fontSize={13} onPress={() => onReact('like')} />
        {/* comentar/repostar/enviar sem cor (branco fixo sobre o vídeo) */}
        <AnimatedReaction icon="comment" vertical active={false} activeColor="#FFFFFF" inactiveColor="#FFFFFF" count={r.commentCount} size={30} fontSize={13} onPress={onComment} />
        {canRepost ? (
          <AnimatedReaction icon="repost" vertical active={r.reposted} activeColor="#FFFFFF" inactiveColor="#FFFFFF" count={r.repostCount} size={30} fontSize={13} onPress={() => onReact('repost')} />
        ) : null}
        <AnimatedReaction icon="send" vertical active={r.shared} activeColor="#FFFFFF" inactiveColor="#FFFFFF" count={r.shareCount} size={30} fontSize={13} onPress={() => onReact('share')} />
      </View>

      {/* infos do autor + VIEWS — canto inferior esquerdo (acima dos controles) */}
      <View style={{ position: 'absolute', left: 14, right: 84, bottom: insetBottom + 64 }}>
        <View className="flex-row items-center gap-2.5">
          <Pressable onPress={onAuthor} hitSlop={6} className="flex-row items-center gap-2.5 shrink" style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
            <Avatar name={post.authorName} uri={post.authorAvatar} size="sm" />
            <Text className="text-white font-bold text-sm shrink" numberOfLines={1}>{post.authorName}</Text>
          </Pressable>
          {!isAuthor && onFollow ? (
            <Pressable
              onPress={handleFollow}
              hitSlop={HIT_SLOP}
              style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1, minWidth: 80 })}
              className={followed ? 'rounded-full border border-white/60 py-1 px-3 items-center justify-center' : 'rounded-full bg-white py-1 px-3 items-center justify-center'}
            >
              <Text className={followed ? 'text-white text-xs font-bold' : 'text-brand-500 text-xs font-bold'}>{followed ? 'Seguindo' : 'Seguir'}</Text>
            </Pressable>
          ) : null}
        </View>
        <View className="flex-row items-center gap-1 mt-1.5">
          <Icon name="eye" set="light" size={14} color="rgba(255,255,255,0.9)" />
          <Text className="text-white/90 text-xs">{compactNumber(post.viewCount)} visualizações</Text>
        </View>
        {post.content ? <Text className="text-white/90 text-[13px] leading-5 mt-1.5" numberOfLines={3}>{post.content}</Text> : null}
      </View>

      {/* controles numa ÚNICA linha: play/pause + tempo à ESQUERDA da timeline;
          velocidade + áudio à DIREITA. A timeline (flex-1) fica no meio, nada por cima. */}
      <View style={{ position: 'absolute', left: 14, right: 14, bottom: insetBottom + 12 }}>
        <View className="flex-row items-center gap-2.5">
          {/* grupo esquerdo */}
          <Pressable onPress={togglePlay} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
            <Icon name={playing ? 'pause' : 'play'} size={22} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white text-[11px] font-medium" style={{ minWidth: 66 }}>{mmss(current)} / {mmss(duration)}</Text>

          {/* linha do tempo (arrastável) — trilho + preenchido + bolinha (reanimated) */}
          <GestureDetector gesture={seekPan}>
            <View className="flex-1" style={{ paddingVertical: 12 }} onLayout={(e) => { barW.value = e.nativeEvent.layout.width; }}>
              <View style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' }}>
                <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#FFFFFF', borderRadius: 2 }, fillStyle]} />
                <Animated.View style={[{ position: 'absolute', top: -4.5, width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF', marginLeft: -6 }, thumbStyle]} />
              </View>
            </View>
          </GestureDetector>

          {/* grupo direito */}
          <Pressable onPress={cycleSpeed} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1, minWidth: 30 })}>
            <Text className="text-white text-xs font-bold">{speed}×</Text>
          </Pressable>
          <Pressable onPress={() => setMuted((m) => !m)} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
            <Icon name={muted ? 'volumeOff' : 'volumeOn'} size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}
