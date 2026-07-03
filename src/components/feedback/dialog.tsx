import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Button } from '../Button';

interface ConfirmOpts {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** Esconde o botão cancelar — diálogo de só "Ok" (texto longo que exige leitura). */
  acknowledgeOnly?: boolean;
  destructive?: boolean;
}

type Resolver = (ok: boolean) => void;
interface DialogApi {
  /** Resolve true (confirmar) / false (cancelar). Substitui Alert com botões. */
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
}

const DialogCtx = createContext<DialogApi | null>(null);

/**
 * Diálogo central de confirmação/ação (spec §13). Use para texto longo + botões.
 * Para info simples sem ação, use o Toast. NUNCA use Alert.
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOpts | null>(null);
  const resolver = useRef<Resolver | null>(null);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  }, []);

  const confirm = useCallback(
    (o: ConfirmOpts) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setOpts(o);
      }),
    [],
  );

  const api = useMemo<DialogApi>(() => ({ confirm }), [confirm]);

  return (
    <DialogCtx.Provider value={api}>
      {children}
      <Modal visible={!!opts} transparent animationType="fade" statusBarTranslucent onRequestClose={() => settle(false)}>
        {/* Overlay + blur (spec §13/§17). Toque fora = cancela. */}
        <View className="flex-1 items-center justify-center px-6">
          <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,16,48,0.25)' }]} onPress={() => settle(false)} />
          {opts ? (
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="w-full max-w-[320px] rounded-modal bg-surface p-6 gap-4"
              style={{ shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}
            >
              <View className="gap-1.5">
                <Text className="text-ink-900 text-[17px] font-semibold">{opts.title}</Text>
                {opts.message ? <Text className="text-ink-500 text-sm leading-5">{opts.message}</Text> : null}
              </View>
              <View className="flex-row gap-3">
                {!opts.acknowledgeOnly ? (
                  <View className="flex-1">
                    <Button title={opts.cancelText ?? 'Cancelar'} variant="secondary" onPress={() => settle(false)} />
                  </View>
                ) : null}
                <View className="flex-1">
                  <Button
                    title={opts.confirmText ?? 'Confirmar'}
                    variant={opts.destructive ? 'danger' : 'primary'}
                    onPress={() => settle(true)}
                  />
                </View>
              </View>
            </Pressable>
          ) : null}
        </View>
      </Modal>
    </DialogCtx.Provider>
  );
}

export function useDialog(): DialogApi {
  const ctx = useContext(DialogCtx);
  if (!ctx) throw new Error('useDialog precisa de <DialogProvider>');
  return ctx;
}
