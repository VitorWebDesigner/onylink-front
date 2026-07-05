import { View } from 'react-native';
import { Icon } from './Icon';

/**
 * Checkbox de SELEÇÃO em lista (participantes de grupo etc.) — quadrado
 * arredondado; marcado = navy preenchido com check branco. Única primitiva:
 * não recrie círculo/borda por tela.
 */
export function Checkbox({ checked, size = 24 }: { checked: boolean; size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size * 0.32 }}
      className={['items-center justify-center border-2', checked ? 'bg-brand-500 border-brand-500' : 'bg-surface border-surface-border'].join(' ')}
    >
      {checked ? <Icon name="check" size={size * 0.62} color="#FFFFFF" /> : null}
    </View>
  );
}
