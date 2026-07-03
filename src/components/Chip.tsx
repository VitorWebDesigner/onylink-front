import { Pressable, Text } from 'react-native';
import { PRESSED_OPACITY } from '../theme/tokens';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

/** Chip/tag em pílula (spec §3). Selecionado = lime + texto navy. */
export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
      className={[
        'px-3 h-8 rounded-pill items-center justify-center border',
        selected ? 'bg-accent-500 border-accent-500' : 'bg-surface-muted border-surface-border',
      ].join(' ')}
    >
      <Text className={[selected ? 'text-brand-500 font-semibold' : 'text-ink-500', 'text-sm'].join(' ')}>
        {label}
      </Text>
    </Pressable>
  );
}
