import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { TextLink } from '../components/TextLink';
import { ComposeMediaViewer } from '../components/media/ComposeMediaViewer';
import { useToast } from '../components/feedback/toast';
import { colors } from '../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../theme/tokens';
import { handleOf } from '../lib/format';
import { pickImages, uploadImage } from '../lib/media';
import { pickVideos, uploadVideo } from '../lib/video';
import { useAuth } from '../store/auth';
import { useCapture } from '../store/capture';
import { useCreatePost } from '../features/feed/hooks';
import { CATEGORIES, type PostCategory } from '../features/feed/types';

const MAX_MEDIA = 6;

type MediaStatus = 'uploading' | 'ready' | 'error';
interface ComposeMedia {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  localUri: string;   // preview local (antes/depois do upload)
  status: MediaStatus;
  progress: number;   // 0..1
  path?: string;      // caminho/GUID no servidor quando pronto
}

let seq = 0;
const makeId = () => `m${Date.now()}_${seq++}`;

/** Thumbnail de vídeo local: player mudo pausado no 1º frame (sem depender do Bunny,
 *  que só gera thumb depois de encodar). */
function VideoThumb({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.muted = true; p.pause(); });
  return <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="cover" nativeControls={false} allowsVideoFrameAnalysis={false} />;
}

export default function Compose() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  const create = useCreatePost();
  const [category, setCategory] = useState<PostCategory | null>(null);
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<ComposeMedia[]>([]);
  const [viewer, setViewer] = useState<number | null>(null); // preview em tela cheia
  const [confirmId, setConfirmId] = useState<string | null>(null); // confirmação de remoção (inline)
  const { width: screenW } = useWindowDimensions();
  const stripRef = useRef<View>(null);
  const [stripLeft, setStripLeft] = useState<number | null>(null); // x da fileira na tela (full-bleed à esquerda)

  // Footer acima do teclado. KeyboardAvoidingView NÃO serve aqui: dentro de tela
  // apresentada como modal nativo (pageSheet) ele mede o próprio frame em coords da
  // sheet e o teclado em coords da TELA → padding menor que o necessário. Padding
  // manual com a altura real do teclado (menos o safe inset que o SafeAreaView já dá).
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'ios') return; // Android: adjustResize já levanta o footer
    const show = Keyboard.addListener('keyboardWillShow', (e) => {
      LayoutAnimation.configureNext({ duration: e.duration || 250, update: { type: 'keyboard' } });
      setKbHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardWillHide', (e) => {
      LayoutAnimation.configureNext({ duration: e.duration || 250, update: { type: 'keyboard' } });
      setKbHeight(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, []);
  const timers = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const mountedRef = useRef(true);
  const removedRef = useRef<Set<string>>(new Set()); // ids removidos → não mostrar erro deles
  // limpa timers de progresso ao desmontar (evita setState fora da tela)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; Object.values(timers.current).forEach(clearInterval); }; }, []);

  const uploading = media.some((m) => m.status === 'uploading');
  const hasError = media.some((m) => m.status === 'error');
  const allReady = media.length > 0 && media.every((m) => m.status === 'ready');
  const canSubmit = !!category && (content.trim().length > 0 || allReady) && !uploading && !hasError;

  const patch = (id: string, p: Partial<ComposeMedia>) => setMedia((arr) => arr.map((m) => (m.id === id ? { ...m, ...p } : m)));

  // digitar #categoria (com/sem acento) seleciona a categoria automaticamente
  const strip = (s: string) =>
    s.toLowerCase().replace(/[áàâãä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i').replace(/[óòôõö]/g, 'o').replace(/[úùûü]/g, 'u').replace(/ç/g, 'c');
  function onChangeContent(t: string) {
    setContent(t);
    const tags = t.match(/#[A-Za-zÀ-ÿ0-9_]+/g);
    if (!tags) return;
    for (const tag of tags) {
      const found = CATEGORIES.find((c) => strip(c) === strip(tag.slice(1)));
      if (found) { setCategory(found); break; }
    }
  }

  /** Sobe UM item com a barra SEMPRE subindo (imagem não tem progresso granular; o TUS
   *  do vídeo às vezes só reporta 0/100) — anima até 90% e completa em 100 no fim; se o
   *  progresso real do vídeo vier maior, usa ele. */
  async function uploadOne(id: string, type: 'IMAGE' | 'VIDEO', uri: string) {
    let p = 0.05;
    patch(id, { progress: p });
    // só AVANÇA (nunca recua): se o progresso real do vídeo já passou de 0.9, o tick não puxa pra baixo
    timers.current[id] = setInterval(() => { const np = Math.min(0.9, p + 0.07); if (np > p) { p = np; patch(id, { progress: p }); } }, 150);
    try {
      const up = type === 'IMAGE'
        ? await uploadImage(uri, 'postImage')
        : await uploadVideo(uri, (pct) => { if (pct > p) { p = pct; patch(id, { progress: pct }); } });
      clearInterval(timers.current[id]); delete timers.current[id];
      patch(id, { status: 'ready', progress: 1, path: up.path });
    } catch (e) {
      if (timers.current[id]) { clearInterval(timers.current[id]); delete timers.current[id]; }
      // item já removido ou tela fechada → não marca erro nem mostra toast fantasma
      if (!mountedRef.current || removedRef.current.has(id)) return;
      patch(id, { status: 'error' });
      toast.error(e instanceof Error ? e.message : 'Não foi possível enviar a mídia.');
    }
  }

  /** Adiciona itens locais (respeitando o limite) e começa o upload de cada um. */
  function addMedia(items: { uri: string; type: 'IMAGE' | 'VIDEO' }[]) {
    const room = MAX_MEDIA - media.length;
    if (room <= 0) { toast.info(`Máximo de ${MAX_MEDIA} mídias.`); return; }
    if (items.length > room) toast.info(`Máximo de ${MAX_MEDIA} mídias — adicionei ${room}.`);
    const entries: ComposeMedia[] = items.slice(0, room).map((it) => ({ id: makeId(), type: it.type, localUri: it.uri, status: 'uploading', progress: 0 }));
    setMedia((arr) => [...arr, ...entries]);
    entries.forEach((e) => void uploadOne(e.id, e.type, e.localUri));
  }

  async function addImages() {
    try {
      const uris = await pickImages(MAX_MEDIA - media.length);
      if (uris.length) addMedia(uris.map((uri) => ({ uri, type: 'IMAGE' as const })));
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível abrir a galeria.'); }
  }

  async function addVideos() {
    try {
      const uris = await pickVideos(MAX_MEDIA - media.length);
      if (uris.length) addMedia(uris.map((uri) => ({ uri, type: 'VIDEO' as const })));
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível abrir a galeria.'); }
  }

  // câmera = tela própria (branded, pt-BR); devolve o resultado via `useCapture`
  function openCamera() { router.push('/camera'); }

  function removeMedia(id: string) {
    if (timers.current[id]) { clearInterval(timers.current[id]); delete timers.current[id]; }
    removedRef.current.add(id); // upload em voo que falhar depois não vira erro fantasma
    setMedia((arr) => arr.filter((m) => m.id !== id));
  }

  function retry(m: ComposeMedia) {
    removedRef.current.delete(m.id);
    patch(m.id, { status: 'uploading', progress: 0 });
    void uploadOne(m.id, m.type, m.localUri);
  }

  // remover a partir do CARD → confirmação INLINE (overlay local). O Dialog global é um
  // RN Modal montado no root — e o compose é tela apresentada como MODAL NATIVO
  // (pageSheet): no iOS esse Modal do root não apresenta por cima e a confirmação nunca
  // aparece. Mesmo motivo da confirmação inline do ComposeMediaViewer.
  function confirmRemove(id: string) { setConfirmId(id); }

  // ao voltar da câmera: consome a captura (ref sempre atual → sem media.length stale)
  const addMediaRef = useRef(addMedia);
  addMediaRef.current = addMedia;
  useFocusEffect(useCallback(() => {
    const r = useCapture.getState().result;
    if (r) { useCapture.getState().clear(); addMediaRef.current([r]); }
  }, []));

  async function onSubmit() {
    if (!category) return;
    try {
      await create.mutateAsync({
        content: content.trim(),
        category,
        media: media.filter((m) => m.status === 'ready' && m.path).map((m) => ({ type: m.type, path: m.path! })),
      });
      toast.success('Publicado!');
      router.back();
    } catch {
      toast.error('Não foi possível publicar. Tente novamente.');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-4 py-7 border-b border-surface-border">
        <TextLink onPress={() => router.back()} tone="muted">Cancelar</TextLink>
        <Text className="text-ink-900 font-semibold text-base">Nova publicação</Text>
        <View className="w-16" />
      </View>

      {/* teclado aberto → footer (contador + Postar) sobe junto e fica visível acima dele */}
      <View style={{ flex: 1, paddingBottom: Math.max(0, kbHeight - insets.bottom) }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <View className="flex-row gap-3">
          <Avatar name={user?.name} size="md" />
          <View className="flex-1 gap-2">
            <Text className="text-ink-900 font-semibold text-sm">{handleOf(user)}</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
              {CATEGORIES.map((c) => (
                <Chip key={c} label={`#${c}`} selected={category === c} onPress={() => setCategory(c)} />
              ))}
            </ScrollView>

            <TextInput
              multiline
              autoFocus
              value={content}
              onChangeText={onChangeContent}
              placeholder="Quais são as novidades?"
              placeholderTextColor={colors.ink[400]}
              maxLength={5000}
              className="text-ink-900 text-base leading-6"
              style={{ textAlignVertical: 'top', paddingTop: 2 }}
            />

            {category ? <Text className="text-brand-500 font-semibold text-[13px] -mt-1">#{category}</Text> : null}

            {/* prévia das mídias — dentro da coluna do texto (alinhada ao placeholder, estilo
                Threads); toque expande em tela cheia; tag flutuante na base; barra de progresso;
                excluir com confirmação */}
            {/* full-bleed à esquerda (mesmo padrão do MediaCarousel do feed): mede a própria
                posição na tela e estende a ScrollView até a borda — 1º card alinha com o texto
                e, ao arrastar, os cards transpassam o espaço vazio à esquerda */}
            {media.length ? (
              <View ref={stripRef} onLayout={() => stripRef.current?.measureInWindow((x) => setStripLeft(x))}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={stripLeft != null ? { width: screenW, marginLeft: -stripLeft } : undefined}
                  contentContainerStyle={{ gap: 10, paddingVertical: 2, paddingLeft: stripLeft ?? 0, paddingRight: 16 }}
                >
                {/* tamanho do card SEMPRE em style ESTÁTICO num View: com o tamanho no retorno
                    de style-função de Pressable o card colapsava em 0×0 aqui (NativeWind não
                    aplicou o retorno da função neste contexto) — o Pressable só captura o toque */}
                {media.map((m, idx) => (
                  <View key={m.id} style={{ width: 132, height: 176 }} className="rounded-2xl overflow-hidden bg-surface-muted border border-surface-border">
                    <Pressable onPress={() => (m.status === 'error' ? retry(m) : setViewer(idx))} className="flex-1">
                      {m.type === 'VIDEO' ? <VideoThumb uri={m.localUri} /> : <Image source={{ uri: m.localUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />}

                      {/* selo de tipo (vídeo) */}
                      {m.type === 'VIDEO' ? (
                        <View className="absolute top-2 left-2 flex-row items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                          <Icon name="video" set="bold" size={12} color="#FFFFFF" />
                          <Text className="text-white text-[10px] font-bold">Vídeo</Text>
                        </View>
                      ) : null}

                      {/* excluir (confirmação) */}
                      <Pressable onPress={() => confirmRemove(m.id)} hitSlop={HIT_SLOP} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/55 items-center justify-center">
                        <Icon name="trash" size={14} color="#FFFFFF" />
                      </Pressable>

                      {/* barra de progresso fina na base (enviando/erro) */}
                      {m.status !== 'ready' ? (
                        <View className="absolute left-0 right-0 bottom-0 h-1" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
                          <View style={{ height: '100%', width: `${Math.round(m.progress * 100)}%`, backgroundColor: m.status === 'error' ? colors.danger : colors.accent[500] }} />
                        </View>
                      ) : null}

                      {/* TAG flutuante centralizada na base, fundo transparente */}
                      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 8, alignItems: 'center' }} pointerEvents="none">
                        {m.status === 'uploading' ? (
                          <View className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                            <Text className="text-white text-[11px] font-semibold">{Math.round(m.progress * 100)}%</Text>
                          </View>
                        ) : m.status === 'ready' ? (
                          <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                            <Icon name="success" set="bold" size={13} color="#FFFFFF" />
                            <Text className="text-white text-[11px] font-bold">Pronto</Text>
                          </View>
                        ) : (
                          <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(229,72,77,0.6)' }}>
                            <Icon name="error" set="bold" size={12} color="#FFFFFF" />
                            <Text className="text-white text-[11px] font-bold">Erro · tocar p/ repetir</Text>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  </View>
                ))}
                </ScrollView>
              </View>
            ) : null}

            {/* ações de mídia — mesma coluna do texto → alinhadas ao placeholder */}
            <View className="flex-row items-center gap-6 pt-1">
              <Pressable onPress={addImages} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
                <Icon name="image" set="light" size={24} color={colors.ink[500]} />
              </Pressable>
              <Pressable onPress={addVideos} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
                <Icon name="video" set="light" size={24} color={colors.ink[500]} />
              </Pressable>
              <Pressable onPress={openCamera} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
                <Icon name="camera" set="light" size={24} color={colors.ink[500]} />
              </Pressable>
              {media.length ? <Text className="text-ink-400 text-xs ml-auto">{media.length}/{MAX_MEDIA}</Text> : null}
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="flex-row items-center justify-between px-4 py-3 border-t border-surface-border">
        <Text className="text-ink-400 text-sm">{uploading ? 'Enviando mídias…' : `${content.length}/5000`}</Text>
        <View className="w-40">
          <Button title="Postar" variant="accent" onPress={onSubmit} disabled={!canSubmit} loading={create.isPending} />
        </View>
      </View>
      </View>

      {/* confirmação de remoção — overlay INLINE (ver comentário em confirmRemove) */}
      {confirmId ? (
        <View style={StyleSheet.absoluteFill}>
          <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,16,48,0.25)' }]} onPress={() => setConfirmId(null)} />
          <View className="flex-1 items-center justify-center px-6" pointerEvents="box-none">
            <View
              className="w-full max-w-[320px] rounded-modal bg-surface p-6 gap-4"
              style={{ shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}
            >
              <View className="gap-1.5">
                <Text className="text-ink-900 text-[17px] font-semibold">Remover mídia?</Text>
                <Text className="text-ink-500 text-sm leading-5">Essa mídia será removida da publicação.</Text>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1"><Button title="Cancelar" variant="secondary" onPress={() => setConfirmId(null)} /></View>
                <View className="flex-1"><Button title="Remover" variant="danger" onPress={() => { removeMedia(confirmId); setConfirmId(null); }} /></View>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {viewer !== null && media.length ? (
        <ComposeMediaViewer items={media} index={viewer} onClose={() => setViewer(null)} onDelete={removeMedia} />
      ) : null}
    </SafeAreaView>
  );
}
