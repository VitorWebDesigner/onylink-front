import { useEffect, useId, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createVideoPlayer, type VideoPlayer } from 'expo-video';

/**
 * Registry de players de vídeo COMPARTILHADOS por URL.
 *
 * Por quê: o feed (inline) e a tela cheia precisam usar a MESMA instância de player.
 * Se fossem players diferentes, ao expandir o player novo recarregaria o HLS do zero
 * (toca do 0 → busca o ponto → rebuffer), gerando a pausa/step visível. Com a mesma
 * instância, expandir só troca qual VideoView exibe o player que JÁ está tocando no
 * ponto certo → transição instantânea e sem rebuffer.
 *
 * Refcount: `retain`/`release` rodam SEMPRE em effect (pareados no mount/unmount) —
 * nunca no render. `peek` (usado no render p/ obter o player pro <VideoView>) só
 * cria/pega SEM contar; se um render for descartado (nenhum retain vem), o player órfão
 * é liberado pelo grace timer. Isso evita leak que o par useMemo(acquire)+cleanup tinha
 * (useMemo pode rodar sem commit / recomputar sem re-rodar o effect).
 * Grace de 500ms: o handoff feed↔tela-cheia reaproveita a instância.
 */
interface Entry { player: VideoPlayer; refs: number; timer?: ReturnType<typeof setTimeout> }
const cache = new Map<string, Entry>();

function scheduleRelease(url: string) {
  const e = cache.get(url);
  if (!e || e.timer) return;
  e.timer = setTimeout(() => {
    const cur = cache.get(url);
    if (cur && cur.refs <= 0) { try { cur.player.release(); } catch { /* noop */ } cache.delete(url); }
  }, 500);
}

/** Cria/pega o player SEM mexer no refcount (seguro no render). Se recém-criado sem
 *  retain (render descartado), o grace timer limpa o órfão. */
function peek(url: string): VideoPlayer {
  let e = cache.get(url);
  if (!e) {
    const player = createVideoPlayer(url);
    player.loop = true;
    player.muted = true; // feed começa mudo; a tela cheia liga o som
    player.timeUpdateEventInterval = 0.25;
    e = { player, refs: 0 };
    cache.set(url, e);
    scheduleRelease(url); // se nenhum retain vier, não vaza
  }
  return e.player;
}

function retain(url: string) {
  peek(url); // garante entry VIVA (se o grace liberou entre renders, recria)
  const e = cache.get(url)!;
  if (e.timer) { clearTimeout(e.timer); e.timer = undefined; }
  e.refs += 1;
}

function release(url: string) {
  const e = cache.get(url);
  if (!e) return;
  e.refs -= 1;
  if (e.refs <= 0) scheduleRelease(url);
}

/** Player compartilhado por URL — mesma instância no feed e na tela cheia.
 *  ⚠️ Se o grace timer liberar a entry ENTRE o render e o effect (FlatList
 *  reciclando devagar, renders descartados), o valor memoizado apontaria pra um
 *  player RELEASED — setar qualquer prop nele crasha no Android ("Cannot use
 *  shared object that was already released"). O effect revalida contra o cache
 *  e troca pra instância viva. */
export function useSharedVideoPlayer(url: string): VideoPlayer {
  const [player, setPlayer] = useState(() => peek(url));
  useEffect(() => {
    retain(url); // recria a entry se o grace já tiver liberado
    const live = cache.get(url)!.player;
    if (live !== player) setPlayer(live);
    return () => release(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revalida 1x por url
  }, [url]);
  return player;
}

/**
 * POSSE da VideoView por URL. Um player só renderiza numa VideoView por vez; se duas
 * VideoViews (ex.: feed + tela cheia, ou feed + tela de detalhe) apontarem pro mesmo
 * player, uma fica preta. Então mantemos uma PILHA de instâncias por URL e só a do
 * TOPO (última montada) renderiza a VideoView de verdade; as outras mostram o poster.
 * Claim/drop em `useLayoutEffect` (antes do paint) → troca sem flash.
 */
const owners = new Map<string, string[]>();
const ownerSubs = new Map<string, Set<() => void>>();

function notifyOwners(url: string) { ownerSubs.get(url)?.forEach((fn) => fn()); }

function claimOwner(url: string, id: string) {
  const s = (owners.get(url) ?? []).filter((x) => x !== id);
  s.push(id);
  owners.set(url, s);
  notifyOwners(url);
}

function dropOwner(url: string, id: string) {
  const s = (owners.get(url) ?? []).filter((x) => x !== id);
  if (s.length) owners.set(url, s); else owners.delete(url);
  notifyOwners(url);
}

function topOwner(url: string): string | null {
  const s = owners.get(url);
  return s && s.length ? s[s.length - 1]! : null;
}

/** Esta instância é a que deve renderizar a VideoView do url? (a última montada vence). */
export function useVideoOwnership(url: string): boolean {
  const id = useId();
  useLayoutEffect(() => { claimOwner(url, id); return () => dropOwner(url, id); }, [url, id]);
  const subscribe = useMemo(() => (cb: () => void) => {
    let set = ownerSubs.get(url);
    if (!set) { set = new Set(); ownerSubs.set(url, set); }
    set.add(cb);
    return () => { const s = ownerSubs.get(url); if (s) { s.delete(cb); if (!s.size) ownerSubs.delete(url); } };
  }, [url]);
  return useSyncExternalStore(subscribe, () => topOwner(url) === id, () => topOwner(url) === id);
}
