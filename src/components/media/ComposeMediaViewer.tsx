import { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Modal, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../Icon';
import { Button } from '../Button';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';

const { width: W, height: H } = Dimensions.get('window');
const CHIP: ViewStyle = { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' };

export interface ViewerItem { id: string; type: 'IMAGE' | 'VIDEO'; localUri: string }

/** Slide de vídeo local: toca quando é a página ativa. */
function VideoSlide({ uri, active }: { uri: string; active: boolean }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; });
  useEffect(() => { try { if (active) player.play(); else player.pause(); } catch { /* noop */ } }, [active, player]);
  return <VideoView player={player} style={{ width: W, height: H }} contentFit="contain" nativeControls={false} allowsVideoFrameAnalysis={false} fullscreenOptions={{ enable: false }} allowsPictureInPicture={false} />;
}

/**
 * Preview de mídia da NOVA PUBLICAÇÃO em tela cheia (arquivos LOCAIS, antes de postar).
 * Swipe entre as mídias + botão de excluir com confirmação. A confirmação é INLINE
 * (não usa o Dialog global) porque este é um Modal e um Modal aninhado do Dialog
 * ficaria atrás.
 */
export function ComposeMediaViewer({ items, index, onClose, onDelete }: { items: ViewerItem[]; index: number; onClose: () => void; onDelete: (id: string) => void }) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ViewerItem>>(null);
  const [cur, setCur] = useState(index);
  const [confirming, setConfirming] = useState(false);
  const item = items[Math.min(cur, Math.max(0, items.length - 1))];

  const doDelete = () => {
    if (!item) return;
    const id = item.id;
    setConfirming(false);
    const newLen = items.length - 1;
    if (newLen <= 0) { onDelete(id); onClose(); return; }
    // mantém `cur`, o scroll e o alvo em sincronia depois que a lista encolhe
    const next = Math.max(0, Math.min(cur, newLen - 1));
    setCur(next);
    onDelete(id);
    requestAnimationFrame(() => { try { listRef.current?.scrollToIndex({ index: next, animated: false }); } catch { /* noop */ } });
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <FlatList
          ref={listRef}
          data={items}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={Math.min(index, items.length - 1)}
          getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
          keyExtractor={(m) => m.id}
          onMomentumScrollEnd={(e) => setCur(Math.round(e.nativeEvent.contentOffset.x / W))}
          renderItem={({ item: m, index: i }) => (
            <View style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }}>
              {m.type === 'IMAGE'
                ? <Image source={{ uri: m.localUri }} style={{ width: W, height: H }} contentFit="contain" />
                : <VideoSlide uri={m.localUri} active={i === cur && !confirming} />}
            </View>
          )}
        />

        {/* header: fechar (esq) · contador · excluir (dir) */}
        <View style={{ position: 'absolute', top: insets.top + 8, left: 14, right: 14, flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={onClose} hitSlop={HIT_SLOP} style={({ pressed }) => [CHIP, { opacity: pressed ? PRESSED_OPACITY : 1 }]}>
            <Icon name="close" size={24} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1 }} />
          {items.length > 1 ? (
            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.55)' }}>
              <Text className="text-white text-sm font-bold">{cur + 1}/{items.length}</Text>
            </View>
          ) : null}
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => setConfirming(true)} hitSlop={HIT_SLOP} style={({ pressed }) => [CHIP, { backgroundColor: 'rgba(229,72,77,0.92)', borderColor: 'rgba(255,255,255,0.2)', opacity: pressed ? PRESSED_OPACITY : 1 }]}>
            <Icon name="trash" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* confirmação inline (mesmo Modal → sempre por cima) */}
        {confirming ? (
          <View style={StyleSheet.absoluteFill}>
            <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} onPress={() => setConfirming(false)} />
            <View className="flex-1 items-center justify-center px-6">
              <View className="w-full max-w-[320px] rounded-modal bg-surface p-6 gap-4">
                <View className="gap-1.5">
                  <Text className="text-ink-900 text-[17px] font-semibold">Remover mídia?</Text>
                  <Text className="text-ink-500 text-sm leading-5">Essa mídia será removida da publicação.</Text>
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1"><Button title="Cancelar" variant="secondary" onPress={() => setConfirming(false)} /></View>
                  <View className="flex-1"><Button title="Remover" variant="danger" onPress={doDelete} /></View>
                </View>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
