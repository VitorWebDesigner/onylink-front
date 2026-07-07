import { createContext, useContext, useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring, withTiming,
  type AnimatedRef, type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_H = Dimensions.get('window').height;

// Superfície do sheet: branco sólido. Sombra p/ definir a borda.
export const SHEET_BG = '#FFFFFF';
export const sheetShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -3 },
  shadowOpacity: 0.12,
  shadowRadius: 16,
  elevation: 16,
} as const;

/**
 * Espera o Modal do sheet TERMINAR de desmontar antes de abrir outro Modal
 * (Dialog global, outro sheet). Abrir Modal durante o dismiss de outro trava a
 * tela no iOS (overlay preso) — TODO fluxo sheet→Dialog passa por aqui (§13).
 */
export const afterSheetClose = () => new Promise<void>((resolve) => setTimeout(resolve, 320));

/** Header padrão de sheet COM TÍTULO — mesmo tamanho do header do compose
 *  ("Nova publicação": py-7, título text-base font-semibold centrado, borda
 *  inferior). Use em TODO sheet titulado (§13 — pedido do dono). */
export function SheetHeader({ title }: { title: string }) {
  return (
    <View className="items-center justify-center px-4 py-7 border-b border-surface-border">
      <Text className="text-ink-900 font-semibold text-base">{title}</Text>
    </View>
  );
}

// mesma sensação do modal nativo do compose (fechar com arrasto)
const SPRING = { damping: 22, stiffness: 220, mass: 0.6 } as const;
const CLOSE_DIST = 90; // px arrastados p/ fechar
const CLOSE_VEL = 700; // velocidade p/ fechar por flick

/** Contexto p/ os filhos roláveis reportarem o offset do scroll ao sheet (libera o
 *  arrasto-fechar do corpo todo só quando a lista está no topo). */
interface SheetScrollCtx {
  scrollOffset: SharedValue<number>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scrollRef: AnimatedRef<any>;
  onScroll: ReturnType<typeof useAnimatedScrollHandler>;
}
const Ctx = createContext<SheetScrollCtx | null>(null);

/** ScrollView que integra com o arrasto-fechar do BottomSheet: use SEMPRE esta dentro
 *  de um `<BottomSheet>` quando o conteúdo rolar (senão o pan do corpo mata o scroll). */
export function SheetScrollView(props: ComponentProps<typeof Animated.ScrollView>) {
  const ctx = useContext(Ctx);
  if (!ctx) return <Animated.ScrollView {...props} />;
  return (
    <Animated.ScrollView
      ref={ctx.scrollRef}
      onScroll={ctx.onScroll}
      scrollEventThrottle={16}
      bounces={false}
      {...props}
    />
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Cards flutuantes separados (estilo action sheet do Threads) em vez de 1 superfície. */
  floating?: boolean;
  /** Ocupa a tela quase inteira. */
  fullHeight?: boolean;
}

/**
 * Bottom sheet: sobe de baixo (slide) com **overlay + blur** no conteúdo de trás.
 * **Arrastar pra baixo em QUALQUER lugar do corpo fecha** — gesto via
 * **react-native-gesture-handler + reanimated** (thread nativa, igual ao modal do
 * compose). O pan roda **simultâneo** ao scroll interno e só move o sheet quando a
 * lista está no topo (via `SheetScrollView`), então arrastar o corpo e rolar a lista
 * convivem. `PanResponder` dentro de `Modal` era instável — por isso gesture-handler.
 */
export function BottomSheet({ visible, onClose, children, floating, fullHeight }: Props) {
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState(visible);
  const translateY = useSharedValue(SCREEN_H);
  const backdrop = useSharedValue(0);

  // offset do scroll interno (0 = topo → libera arrastar o sheet)
  const scrollOffset = useSharedValue(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scrollRef = useAnimatedRef<any>();
  const onScroll = useAnimatedScrollHandler((e) => { scrollOffset.value = e.contentOffset.y; });

  useEffect(() => {
    if (visible) {
      setShown(true);
      translateY.value = SCREEN_H;
      translateY.value = withSpring(0, SPRING);
      backdrop.value = withTiming(1, { duration: 200 });
    } else if (shown) {
      backdrop.value = withTiming(0, { duration: 180 });
      translateY.value = withTiming(SCREEN_H, { duration: 220 }, (fin) => { if (fin) runOnJS(setShown)(false); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const closeNow = () => {
    backdrop.value = withTiming(0, { duration: 160 });
    translateY.value = withTiming(SCREEN_H, { duration: 200 }, (fin) => { if (fin) runOnJS(onClose)(); });
  };

  // arrasta o corpo TODO; só move o sheet quando o scroll está no topo e o gesto é p/
  // baixo — senão deixa a lista rolar (simultâneo). Solta → fecha (limite/flick) ou volta.
  const pan = Gesture.Pan()
    .activeOffsetY(10)
    .simultaneousWithExternalGesture(scrollRef)
    .onUpdate((e) => {
      if (scrollOffset.value <= 0 && e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const shouldClose = translateY.value > CLOSE_DIST || (e.velocityY > CLOSE_VEL && translateY.value > 20);
      if (shouldClose) {
        translateY.value = withTiming(SCREEN_H, { duration: 200 }, (fin) => { if (fin) runOnJS(onClose)(); });
      } else {
        translateY.value = withSpring(0, SPRING);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  const handle = (
    <View className="items-center pt-2.5 pb-2">
      <View className="w-10 h-1.5 rounded-full" style={{ backgroundColor: '#C7C9CE' }} />
    </View>
  );

  return (
    <Modal visible={shown} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Ctx.Provider value={{ scrollOffset, scrollRef, onScroll }}>
          {/* overlay + blur — fade-in/out */}
          <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
            <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
            <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,16,48,0.25)' }]} onPress={closeNow} />
          </Animated.View>

          {/* sheet ancorado embaixo; box-none deixa o toque acima chegar no overlay */}
          <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <GestureDetector gesture={pan}>
              <Animated.View style={sheetStyle}>
                {floating ? (
                  <View className="px-2 gap-2" style={{ paddingBottom: insets.bottom + 8 }}>
                    {children}
                  </View>
                ) : (
                  <View
                    style={{ backgroundColor: SHEET_BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', ...sheetShadow, paddingBottom: insets.bottom + 8, height: fullHeight ? SCREEN_H - insets.top : undefined }}
                  >
                    {handle}
                    {children}
                  </View>
                )}
              </Animated.View>
            </GestureDetector>
          </View>
        </Ctx.Provider>
      </GestureHandlerRootView>
    </Modal>
  );
}
