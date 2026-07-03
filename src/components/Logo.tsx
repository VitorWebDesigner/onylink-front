import { Text, View } from 'react-native';

/** Marca OnyLink: logomark lime (preenchido) + wordmark navy. */
export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const lg = size === 'lg';
  return (
    <View className="flex-row items-center gap-2">
      <View className={[lg ? 'w-10 h-10' : 'w-8 h-8', 'rounded-btn bg-accent-500 items-center justify-center'].join(' ')}>
        <Text className={[lg ? 'text-xl' : 'text-base', 'font-extrabold text-brand-500'].join(' ')}>O</Text>
      </View>
      <Text className={[lg ? 'text-3xl' : 'text-2xl', 'font-extrabold text-ink-900 tracking-tight'].join(' ')}>
        OnyLink
      </Text>
    </View>
  );
}
