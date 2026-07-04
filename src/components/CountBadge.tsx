import { Text, View } from 'react-native';

/**
 * Bolinha VERMELHA numérica de "não visto / não resolvido" (padrão WhatsApp).
 * Única primitiva desse badge — tab bar, abas de Mensagens e rows de lista.
 * Some sozinha quando count = 0.
 */
export function CountBadge({ count, size = 18 }: { count: number; size?: number }) {
  if (!count) return null;
  return (
    <View
      className="bg-danger items-center justify-center rounded-full"
      style={{ minWidth: size, height: size, paddingHorizontal: size * 0.22 }}
    >
      <Text className="text-white font-bold" style={{ fontSize: size * 0.58 }}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}
