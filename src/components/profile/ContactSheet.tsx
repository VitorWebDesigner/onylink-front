import { Linking, Pressable, Text, View } from 'react-native';
import { BottomSheet, SheetHeader } from '../BottomSheet';
import { Icon, type IconName } from '../Icon';
import { colors } from '../../theme/colors';
import { PRESSED_OPACITY } from '../../theme/tokens';
import type { UserProfile } from '../../features/users/hooks';

function Row({ icon, label, value, onPress }: { icon: IconName; label: string; value: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-row items-center gap-3 px-4 py-4 border-b border-surface-border">
      <View className="w-10 h-10 rounded-full bg-surface-muted items-center justify-center">
        <Icon name={icon} size={20} color={colors.brand[500]} />
      </View>
      <View className="flex-1">
        <Text className="text-ink-900 font-semibold text-[15px]">{label}</Text>
        <Text className="text-ink-500 text-[13px]" numberOfLines={1}>{value}</Text>
      </View>
      <Icon name="forward" set="light" size={18} color={colors.ink[400]} />
    </Pressable>
  );
}

/**
 * Sheet do botão Contato (decisão plano-perfil.md §5.1): até 3 opções —
 * e-mail, WhatsApp e site. Só mostra as preenchidas no perfil.
 */
export function ContactSheet({ visible, onClose, p }: { visible: boolean; onClose: () => void; p: UserProfile }) {
  const wa = (p.contactWhatsapp ?? '').replace(/\D/g, '');
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="pb-2">
        <SheetHeader title="Contato" />
        {p.contactEmail ? (
          <Row icon="message" label="E-mail" value={p.contactEmail} onPress={() => { void Linking.openURL(`mailto:${p.contactEmail}`); onClose(); }} />
        ) : null}
        {wa ? (
          <Row icon="whatsapp" label="WhatsApp" value={p.contactWhatsapp!} onPress={() => { void Linking.openURL(`https://wa.me/${wa.length <= 11 ? `55${wa}` : wa}`); onClose(); }} />
        ) : null}
        {p.contactUrl ? (
          <Row icon="globe" label="Site" value={p.contactUrl} onPress={() => { void Linking.openURL(/^https?:/i.test(p.contactUrl!) ? p.contactUrl! : `https://${p.contactUrl}`); onClose(); }} />
        ) : null}
      </View>
    </BottomSheet>
  );
}
