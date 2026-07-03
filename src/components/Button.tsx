import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';
import { colors } from '../theme/colors';
import { PRESSED_OPACITY } from '../theme/tokens';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

interface Props extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

// Spec §8: altura 44–48dp, raio 8dp, texto 14sp Semibold. Press = opacidade (§18).
const BG: Record<Variant, string> = {
  primary: 'bg-brand-500',
  accent: 'bg-accent-500',
  secondary: 'bg-surface border border-surface-border',
  ghost: 'bg-transparent',
  danger: 'bg-danger',
};
const FG: Record<Variant, string> = {
  primary: 'text-white',
  accent: 'text-brand-500', // texto navy sobre lime (contraste)
  secondary: 'text-brand-500',
  ghost: 'text-brand-500',
  danger: 'text-white',
};
const SPINNER: Record<Variant, string> = {
  primary: '#FFFFFF',
  accent: colors.brand[500],
  secondary: colors.brand[500],
  ghost: colors.brand[500],
  danger: '#FFFFFF',
};

export function Button({ title, variant = 'primary', size = 'md', loading, disabled, style, ...rest }: Props) {
  const off = disabled || loading;
  return (
    <Pressable
      disabled={off}
      accessibilityRole="button"
      className={[
        size === 'sm' ? 'h-8 px-4' : 'h-12 px-4',
        'rounded-btn items-center justify-center',
        BG[variant],
        off ? 'opacity-40' : '',
      ].join(' ')}
      style={(state) => [
        { opacity: state.pressed && !off ? PRESSED_OPACITY : undefined },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={SPINNER[variant]} />
      ) : (
        <Text className={[FG[variant], size === 'sm' ? 'text-[13px]' : 'text-sm', 'font-semibold'].join(' ')}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
