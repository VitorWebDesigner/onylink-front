import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Icon, type IconName } from '../Icon';
import { colors } from '../../theme/colors';
import { PRESSED_OPACITY } from '../../theme/tokens';

interface PickerOpts {
  onInsight: () => void;
  onLike: () => void;
  insighted?: boolean;
  liked?: boolean;
}

const Ctx = createContext<{ show: (o: PickerOpts) => void } | null>(null);

export function useReactionPicker() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useReactionPicker precisa de <ReactionPickerProvider>');
  return c;
}

function Option({ icon, color, label, active, onPress }: { icon: IconName; color: string; label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="items-center gap-1.5">
      <View className="w-16 h-16 rounded-full items-center justify-center" style={{ backgroundColor: active ? color : colors.surface.muted, borderWidth: 2, borderColor: color }}>
        <Icon name={icon} set="light" size={30} color={active ? '#FFFFFF' : color} />
      </View>
      <Text className="text-ink-900 text-xs font-bold">{label}</Text>
    </Pressable>
  );
}

/**
 * Menu de reação rápido (item #2): double-tap na imagem abre no MEIO da tela a
 * lista Insight/Curtir com animação de entrada; toca numa → reage. Toque fora fecha.
 */
export function ReactionPickerProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<PickerOpts | null>(null);
  const scale = useRef(new Animated.Value(0.6)).current;
  const op = useRef(new Animated.Value(0)).current;

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.6, duration: 140, useNativeDriver: true }),
    ]).start(() => setOpts(null));
  }, [op, scale]);

  useEffect(() => {
    if (opts) {
      scale.setValue(0.6);
      op.setValue(0);
      Animated.parallel([
        Animated.spring(op, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }),
      ]).start();
    }
  }, [opts, op, scale]);

  const pick = (fn: () => void) => { fn(); close(); };
  const api = useMemo(() => ({ show: (o: PickerOpts) => setOpts(o) }), []);

  return (
    <Ctx.Provider value={api}>
      {children}
      <Modal visible={!!opts} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
        <Pressable style={{ flex: 1 }} onPress={close}>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: op }]}>
            <BlurView intensity={16} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,16,48,0.2)' }]} />
          </Animated.View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View
              style={{ opacity: op, transform: [{ scale }], shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 12 }}
              className="flex-row gap-8 bg-surface rounded-3xl px-8 py-5"
            >
              {opts ? (
                <>
                  <Option icon="insight" color={colors.action.insight} label="Insight" active={opts.insighted} onPress={() => pick(opts.onInsight)} />
                  <Option icon="heart" color={colors.action.like} label="Curtir" active={opts.liked} onPress={() => pick(opts.onLike)} />
                </>
              ) : null}
            </Animated.View>
          </View>
        </Pressable>
      </Modal>
    </Ctx.Provider>
  );
}
