import { Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors } from '../theme/colors';

type Tone = 'accent' | 'navy' | 'muted';

interface Props {
  label: string;
  icon?: IconName;
  tone?: Tone;
}

const TONE: Record<Tone, { box: string; text: string; icon: string }> = {
  accent: { box: 'bg-accent-50', text: 'text-brand-500', icon: colors.brand[500] },
  navy: { box: 'bg-brand-500', text: 'text-white', icon: '#FFFFFF' },
  muted: { box: 'bg-surface-muted', text: 'text-ink-700', icon: colors.ink[500] },
};

/** Selo/badge em pílula (autoridade, verificação — prompt.md §5.2). */
export function Badge({ label, icon, tone = 'accent' }: Props) {
  const t = TONE[tone];
  return (
    <View className={['flex-row items-center gap-1 px-2.5 h-7 rounded-pill', t.box].join(' ')}>
      {icon ? <Icon name={icon} size={14} color={t.icon} /> : null}
      <Text className={[t.text, 'text-xs font-semibold'].join(' ')}>{label}</Text>
    </View>
  );
}
