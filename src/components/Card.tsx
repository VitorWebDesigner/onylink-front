import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { PRESSED_OPACITY } from '../theme/tokens';

interface Props {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
}

/** Cartão padrão: superfície branca, borda hairline, raio 16dp, padding 16dp. */
export function Card({ children, className = '', onPress }: Props) {
  const cls = ['bg-surface rounded-card border border-surface-border p-4', className].join(' ');
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className={cls}>
        {children}
      </Pressable>
    );
  }
  return <View className={cls}>{children}</View>;
}
