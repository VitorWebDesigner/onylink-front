import { Image, Text, View } from 'react-native';

const SIZES = { xs: 24, sm: 32, md: 40, lg: 44, xxl: 64, xl: 96 } as const;
type Size = keyof typeof SIZES;

interface Props {
  name?: string | null;
  uri?: string | null;
  size?: Size;
}

/** Avatar circular (spec §5). Mostra foto se houver, senão a inicial em disco navy. */
export function Avatar({ name, uri, size = 'md' }: Props) {
  const d = SIZES[size];
  const initial = name?.trim?.()?.[0]?.toUpperCase() ?? '?';
  if (uri) {
    return <Image source={{ uri }} style={{ width: d, height: d, borderRadius: d / 2 }} />;
  }
  return (
    <View style={{ width: d, height: d, borderRadius: d / 2 }} className="bg-brand-500 items-center justify-center">
      <Text className="text-white font-bold" style={{ fontSize: Math.round(d * 0.4) }}>
        {initial}
      </Text>
    </View>
  );
}
