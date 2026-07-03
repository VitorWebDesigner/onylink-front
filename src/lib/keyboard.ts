import { useEffect, useState } from 'react';
import { Keyboard, LayoutAnimation, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * paddingBottom pra manter composer/rodapé ACIMA do teclado — nos DOIS SOs.
 *
 * Por que manual: `KeyboardAvoidingView` mede errado dentro de pageSheet (iOS)
 * e, no Android com edge-to-edge (SDK 54+), o `adjustResize` NÃO redimensiona a
 * janela — o teclado simplesmente cobre a UI. Listeners diretos funcionam nos dois.
 * iOS anima no ritmo do teclado (keyboardWill*); Android usa keyboardDid*.
 * Desconta o safe inset inferior (a tela já o aplica via SafeAreaView).
 */
export function useKeyboardPadding(): number {
  const insets = useSafeAreaInsets();
  const [kb, setKb] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => {
      if (Platform.OS === 'ios') LayoutAnimation.configureNext({ duration: e.duration || 250, update: { type: 'keyboard' } });
      setKb(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvt, (e) => {
      if (Platform.OS === 'ios') LayoutAnimation.configureNext({ duration: e.duration || 250, update: { type: 'keyboard' } });
      setKb(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  return Math.max(0, kb - insets.bottom);
}
