import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '../theme/colors';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

// Spec §9: altura 44–48dp, raio 8dp, padding 12–16dp, foco troca cor da borda
// SEM mudar layout (borda sempre 1dp).
export function Input({ label, error, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const border = error ? 'border-danger' : focused ? 'border-accent-500' : 'border-surface-border';
  return (
    <View className="gap-1.5">
      {label ? <Text className="text-ink-700 text-sm font-semibold">{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.ink[400]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        className={['h-12 rounded-input px-4 bg-surface-muted text-ink-900 border', border].join(' ')}
        {...rest}
      />
      {error ? <Text className="text-danger text-xs">{error}</Text> : null}
    </View>
  );
}
