import { Pressable, Text } from 'react-native';
import { Link, type Href } from 'expo-router';
import { HIT_SLOP, PRESSED_OPACITY } from '../theme/tokens';

interface Props {
  children: string;
  href?: Href;
  onPress?: () => void;
  /** 'accent' = navy forte (padrão p/ ações); 'muted' = cinza secundário. */
  tone?: 'accent' | 'muted';
  className?: string;
}

/**
 * Link/ação em texto SEM fundo. Resolve o anti-UX do <Link> cru, que pinta um
 * highlight no toque (spec §18: estado pressed = só opacidade, nunca muda layout).
 * Use SEMPRE isto para "Criar conta", "Esqueci a senha", "Voltar", etc.
 */
export function TextLink({ children, href, onPress, tone = 'accent', className = '' }: Props) {
  const label = (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole={href ? 'link' : 'button'}
      style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
    >
      <Text
        suppressHighlighting
        className={[tone === 'accent' ? 'text-brand-500' : 'text-ink-500', 'text-sm font-semibold', className].join(' ')}
      >
        {children}
      </Text>
    </Pressable>
  );

  return href ? (
    <Link href={href} asChild>
      {label}
    </Link>
  ) : (
    label
  );
}
