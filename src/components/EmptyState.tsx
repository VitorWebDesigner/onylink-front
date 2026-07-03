import { Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors } from '../theme/colors';

interface Props {
  icon: IconName;
  title: string;
  subtitle?: string;
}

/** Estado vazio padrão (ícone em disco lime + título + apoio). Reutilize sempre. */
export function EmptyState({ icon, title, subtitle }: Props) {
  return (
    <View className="items-center justify-center gap-3 px-8">
      <View className="w-16 h-16 rounded-full bg-accent-50 items-center justify-center">
        <Icon name={icon} size={28} color={colors.brand[500]} />
      </View>
      <Text className="text-ink-900 font-semibold text-lg text-center">{title}</Text>
      {subtitle ? <Text className="text-ink-500 text-center leading-5">{subtitle}</Text> : null}
    </View>
  );
}
