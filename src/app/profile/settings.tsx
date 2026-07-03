import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/Icon';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { useAuth } from '../../store/auth';
import { useMe } from '../../features/users/hooks';

function Row({ icon, label, sub, danger, onPress }: { icon: IconName; label: string; sub?: string; danger?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-row items-center gap-3 px-4 py-4 border-b border-surface-border">
      <Icon name={icon} set="light" size={22} color={danger ? colors.danger : colors.ink[900]} />
      <View className="flex-1">
        <Text className={danger ? 'text-danger font-semibold text-[15px]' : 'text-ink-900 font-semibold text-[15px]'}>{label}</Text>
        {sub ? <Text className="text-ink-500 text-[13px]">{sub}</Text> : null}
      </View>
      {!danger ? <Icon name="forward" set="light" size={16} color={colors.ink[400]} /> : null}
    </Pressable>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text className="text-ink-400 text-xs font-semibold uppercase px-4 pt-6 pb-1">{children}</Text>;
}

/** Configurações e atividades — agrupa as ações do perfil (aberta pelo menu ☰). */
export default function SettingsScreen() {
  const router = useRouter();
  const logout = useAuth((s) => s.logout);
  const { data: p } = useMe();

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border">
        <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP}>
          <Icon name="back" size={24} color={colors.ink[900]} />
        </Pressable>
        <Text className="text-ink-900 font-semibold text-base">Configurações e atividades</Text>
      </View>

      <ScrollView>
        <SectionTitle>Conta</SectionTitle>
        <Row icon="edit" label="Editar perfil" sub="Foto, capa, bio, contato e localização" onPress={() => router.push('/profile/edit')} />
        <Row icon="document" label="Diagnóstico empresarial" sub="Meça a maturidade da sua empresa" onPress={() => router.push('/(onboarding)/diagnostic')} />

        {p?.professional ? (
          <>
            <SectionTitle>Profissional</SectionTitle>
            <Row icon="chart" label="Painel do Empresário" sub="Métricas dos últimos 30 dias" onPress={() => router.push('/profile/insights')} />
          </>
        ) : null}

        <SectionTitle>Sessão</SectionTitle>
        <Row icon="logout" label="Sair" danger onPress={() => void logout()} />
      </ScrollView>
    </SafeAreaView>
  );
}
