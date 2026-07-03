import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { PRESSED_OPACITY } from '../theme/tokens';

interface Props {
  title: string;
  subtitle?: string;
  avatarName?: string;
  avatarUri?: string | null;
  right?: ReactNode;
  onPress?: () => void;
}

/** Célula de lista com avatar (spec §15): avatar 44 + título + subtítulo + ação. */
export function ListRow({ title, subtitle, avatarName, avatarUri, right, onPress }: Props) {
  const body = (
    <View className="flex-row items-center gap-3 py-2">
      <Avatar name={avatarName} uri={avatarUri} size="lg" />
      <View className="flex-1">
        <Text className="text-ink-900 font-semibold text-sm" numberOfLines={1}>{title}</Text>
        {subtitle ? <Text className="text-ink-500 text-[13px]" numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
        {body}
      </Pressable>
    );
  }
  return body;
}
