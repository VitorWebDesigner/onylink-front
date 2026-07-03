import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../Icon';

type ToastType = 'info' | 'success' | 'error';
interface ToastData {
  message: string;
  type: ToastType;
}

// Todos os toasts (menos erro) usam a MESMA cor/design do toast de notificação do
// post (navy + texto branco). Só o de erro muda (danger). Mantém ícone próprio.
const STYLE: Record<ToastType, { box: string; text: string; icon: IconName; iconColor: string }> = {
  info: { box: 'bg-brand-500', text: 'text-white', icon: 'info', iconColor: '#FFFFFF' },
  success: { box: 'bg-brand-500', text: 'text-white', icon: 'success', iconColor: '#FFFFFF' },
  error: { box: 'bg-danger', text: 'text-white', icon: 'error', iconColor: '#FFFFFF' },
};

interface ToastApi {
  show: (message: string, type?: ToastType) => void;
  info: (m: string) => void;
  success: (m: string) => void;
  error: (m: string) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

/**
 * Feedback informativo (spec §14). NUNCA usar Alert para info — use toast.
 * Para confirmações/ações com botões, use o Dialog (./dialog).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<ToastData | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 20, duration: 180, useNativeDriver: true }),
    ]).start(() => setData(null));
  }, [opacity, translateY]);

  const show = useCallback(
    (message: string, type: ToastType = 'info') => {
      if (timer.current) clearTimeout(timer.current);
      setData({ message, type });
      opacity.setValue(0);
      translateY.setValue(20);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
      timer.current = setTimeout(hide, 2800);
    },
    [opacity, translateY, hide],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      info: (m) => show(m, 'info'),
      success: (m) => show(m, 'success'),
      error: (m) => show(m, 'error'),
    }),
    [show],
  );

  const s = data ? STYLE[data.type] : null;

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {data && s ? (
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 64, opacity, transform: [{ translateY }] }}
        >
          <View
            className={['min-h-12 rounded-toast flex-row items-center gap-2 px-4 py-3', s.box].join(' ')}
            style={{ shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 }}
          >
            <Icon name={s.icon} size={20} color={s.iconColor} />
            <Text className={[s.text, 'flex-1 text-sm font-medium'].join(' ')}>{data.message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast precisa de <ToastProvider>');
  return ctx;
}
