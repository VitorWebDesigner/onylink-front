import { Text, View } from 'react-native';
import { TextLink } from './TextLink';

interface Props {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Cabeçalho de seção: título 20sp Semibold + ação opcional à direita (spec §2). */
export function SectionHeader({ title, actionLabel, onAction }: Props) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-ink-900 font-semibold text-xl">{title}</Text>
      {actionLabel && onAction ? <TextLink onPress={onAction}>{actionLabel}</TextLink> : null}
    </View>
  );
}
