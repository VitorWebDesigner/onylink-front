import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraMode, type CameraType } from 'expo-camera';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { colors } from '../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../theme/tokens';
import { useCapture } from '../store/capture';

interface Shot { uri: string; type: 'IMAGE' | 'VIDEO' }

/** Preview do vídeo gravado (loop mudo). */
function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; p.play(); });
  return <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls={false} allowsVideoFrameAnalysis={false} fullscreenOptions={{ enable: false }} allowsPictureInPicture={false} />;
}

/**
 * Câmera do OnyLink (identidade do app, pt-BR). Substitui o preview nativo
 * ("Retake / Use Photo") por um preview próprio com **Refazer** / **Usar**. Tira foto
 * ou grava vídeo (até 90s) e devolve o resultado pro compose via `useCapture`.
 *
 * ⚠️ Os controles ficam como FILHOS de `<CameraView>` (não irmãos absolutos): a
 * superfície nativa da câmera captura o toque, então overlays irmãos não recebem clique.
 */
export default function CameraScreen() {
  const router = useRouter();
  const setResult = useCapture((s) => s.setResult);
  const [camPerm, requestCam] = useCameraPermissions();
  const [, requestMic] = useMicrophonePermissions();
  const camRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [mode, setMode] = useState<CameraMode>('picture');
  const [recording, setRecording] = useState(false);
  const [ready, setReady] = useState(false); // preview pronto (só então captura)
  const [shot, setShot] = useState<Shot | null>(null);

  useEffect(() => {
    if (!camPerm) return;
    if (!camPerm.granted) void requestCam();
    void requestMic(); // p/ áudio do vídeo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camPerm]);

  const takePhoto = async () => {
    try { const p = await camRef.current?.takePictureAsync({ quality: 1 }); if (p?.uri) setShot({ uri: p.uri, type: 'IMAGE' }); } catch { /* noop */ }
  };
  const startRecord = async () => {
    setRecording(true);
    try { const v = await camRef.current?.recordAsync({ maxDuration: 90 }); if (v?.uri) setShot({ uri: v.uri, type: 'VIDEO' }); }
    catch { /* noop */ }
    finally { setRecording(false); }
  };
  const stopRecord = () => { camRef.current?.stopRecording(); };

  const onCapture = () => {
    if (!ready) return; // câmera ainda não pronta → ignora (evita takePicture/record rejeitar)
    if (mode === 'picture') void takePhoto();
    else if (recording) stopRecord();
    else void startRecord();
  };

  const use = () => { if (shot) { setResult(shot); router.back(); } };

  // ── sem permissão ──
  if (!camPerm) return <View className="flex-1 bg-brand-500" />;
  if (!camPerm.granted) {
    return (
      <SafeAreaView className="flex-1 bg-brand-500 items-center justify-center px-8 gap-4" edges={['top', 'bottom']}>
        <Icon name="camera" set="light" size={40} color="#FFFFFF" />
        <Text className="text-white text-center text-base">Precisamos da câmera para tirar foto ou gravar vídeo.</Text>
        <View className="w-56"><Button title="Permitir câmera" variant="accent" onPress={() => requestCam()} /></View>
        <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
          <Text className="text-white/80 text-sm font-semibold">Cancelar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── preview do que foi capturado (branded, pt-BR) — botões FLUTUANTES modernos ──
  if (shot) {
    return (
      <View className="flex-1 bg-black">
        {shot.type === 'IMAGE'
          ? <Image source={{ uri: shot.uri }} style={{ flex: 1 }} contentFit="contain" />
          : <VideoPreview uri={shot.uri} />}
        <SafeAreaView edges={['bottom']} className="absolute left-0 right-0 bottom-0">
          <View className="flex-row items-center gap-3 px-5 pb-3">
            <Pressable onPress={() => setShot(null)} style={({ pressed }) => ({ flex: 1, opacity: pressed ? PRESSED_OPACITY : 1 })} className="rounded-full border border-white/60 py-3.5 items-center justify-center flex-row gap-2">
              <Icon name="back" size={18} color="#FFFFFF" />
              <Text className="text-white font-bold text-[15px]">Refazer</Text>
            </Pressable>
            <Pressable onPress={use} style={({ pressed }) => ({ flex: 1, opacity: pressed ? PRESSED_OPACITY : 1 })} className="rounded-full bg-accent-500 py-3.5 items-center justify-center flex-row gap-2">
              <Icon name="success" set="bold" size={18} color={colors.brand[500]} />
              <Text className="text-brand-500 font-extrabold text-[15px]">{shot.type === 'IMAGE' ? 'Usar foto' : 'Usar vídeo'}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
        {/* fechar no topo */}
        <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0">
          <View className="px-5 pt-2">
            <Pressable onPress={() => { setShot(null); router.back(); }} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="w-10 h-10 rounded-full bg-black/45 items-center justify-center">
              <Icon name="close" size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── câmera ao vivo (controles = FILHOS da CameraView) ──
  return (
    <View className="flex-1 bg-black">
      <CameraView ref={camRef} style={{ flex: 1 }} facing={facing} mode={mode} onCameraReady={() => setReady(true)}>
        {/* topo: fechar · gravando · virar câmera */}
        <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0">
          <View className="flex-row items-center justify-between px-5 pt-2">
            <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="w-10 h-10 rounded-full bg-black/45 items-center justify-center">
              <Icon name="close" size={24} color="#FFFFFF" />
            </Pressable>
            {recording ? (
              <View className="flex-row items-center gap-2 rounded-full px-3 py-1" style={{ backgroundColor: 'rgba(229,72,77,0.9)' }}>
                <View className="w-2 h-2 rounded-full bg-white" />
                <Text className="text-white text-xs font-bold">Gravando</Text>
              </View>
            ) : null}
            <Pressable onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="w-10 h-10 rounded-full bg-black/45 items-center justify-center">
              <Icon name="repost" set="light" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </SafeAreaView>

        {/* base: modo (Foto/Vídeo) + botão de captura */}
        <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0">
          {!recording ? (
            <View className="flex-row items-center justify-center gap-6 mb-4">
              <Pressable onPress={() => setMode('picture')} hitSlop={HIT_SLOP}>
                <Text className={mode === 'picture' ? 'text-white font-extrabold text-sm' : 'text-white/50 font-semibold text-sm'}>FOTO</Text>
              </Pressable>
              <Pressable onPress={() => setMode('video')} hitSlop={HIT_SLOP}>
                <Text className={mode === 'video' ? 'text-white font-extrabold text-sm' : 'text-white/50 font-semibold text-sm'}>VÍDEO</Text>
              </Pressable>
            </View>
          ) : null}
          <View className="items-center pb-6">
            <Pressable onPress={onCapture} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? 0.85 : ready ? 1 : 0.5 })}>
              <View className="w-[74px] h-[74px] rounded-full items-center justify-center" style={{ borderWidth: 4, borderColor: '#FFFFFF' }}>
                {mode === 'video' ? (
                  <View style={{ width: recording ? 26 : 56, height: recording ? 26 : 56, borderRadius: recording ? 6 : 28, backgroundColor: colors.danger }} />
                ) : (
                  <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF' }} />
                )}
              </View>
            </Pressable>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}
