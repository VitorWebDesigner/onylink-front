import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRESSED_OPACITY } from '../theme/tokens';

type Provider = 'google' | 'apple';

// Mesmo fundo nos dois (branco c/ borda) — só a logo muda, na cor da rede.
const BOX = 'bg-surface border border-surface-border';
const CFG: Record<Provider, { label: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string }> = {
  google: { label: 'Entrar com Google', icon: 'logo-google', iconColor: '#4285F4' },
  apple: { label: 'Entrar com Apple', icon: 'logo-apple', iconColor: '#0A1030' },
};

/** Botão social circular (visual, não-funcional): só a logo centralizada (56dp). */
export function SocialButton({ provider, onPress }: { provider: Provider; onPress?: () => void }) {
  const c = CFG[provider];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={c.label}
      style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
      className={['w-14 h-14 rounded-full items-center justify-center', BOX].join(' ')}
    >
      <Ionicons name={c.icon} size={26} color={c.iconColor} />
    </Pressable>
  );
}
