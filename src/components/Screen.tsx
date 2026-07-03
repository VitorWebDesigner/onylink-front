import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Casca de tela: safe-area + margem lateral padrão 16dp (spec §0). */
export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <View className={`flex-1 px-4 ${className}`}>{children}</View>
    </SafeAreaView>
  );
}
