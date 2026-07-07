import { View } from 'react-native';
import { Icon } from './Icon';
import { colors } from '../theme/colors';

/**
 * Selos do usuário ao lado do NOME, em QUALQUER lugar que ele apareça (§13):
 * ADMIN = escudo NAVY · VERIFICADO = escudo LIME (mostra os dois se ambos).
 * Única primitiva — post, comentário, membros, listas, chat, perfil.
 */
export function UserBadges({ verified, admin, size = 14 }: {
  verified?: boolean | null;
  admin?: boolean | null;
  size?: number;
}) {
  if (!verified && !admin) return null;
  return (
    <View className="flex-row items-center" style={{ gap: 3 }}>
      {admin ? <Icon name="verified" set="bold" size={size} color={colors.brand[500]} /> : null}
      {verified ? <Icon name="verified" set="bold" size={size} color={colors.accent[500]} /> : null}
    </View>
  );
}
