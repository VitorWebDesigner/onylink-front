import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import { SelectSheet } from '../../components/SelectSheet';
import { TextLink } from '../../components/TextLink';
import { useToast } from '../../components/feedback/toast';
import { colors } from '../../theme/colors';
import { PRESSED_OPACITY } from '../../theme/tokens';
import { SEGMENTS, UFS, fetchCities } from '../../lib/br';
import { useKeyboardPadding } from '../../lib/keyboard';
import { useCreateGroup } from '../../features/groups/hooks';

const DESC_MAX = 300;

function SelectRow({ label, value, placeholder, disabled, onPress }: {
  label: string; value: string; placeholder: string; disabled?: boolean; onPress: () => void;
}) {
  return (
    <View className="gap-1.5 flex-1">
      <Text className="text-ink-700 text-sm font-semibold">{label}</Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => ({ opacity: disabled ? 0.5 : pressed ? PRESSED_OPACITY : 1 })}
        className="h-12 rounded-input px-4 bg-surface-muted border border-surface-border flex-row items-center justify-between"
      >
        <Text className={value ? 'text-ink-900' : 'text-ink-400'} numberOfLines={1}>{value || placeholder}</Text>
        <Icon name="forward" set="light" size={16} color={colors.ink[400]} />
      </Pressable>
    </View>
  );
}

/** Criar grupo (ADMIN ou conta profissional — gate no back). Tela modal → só toasts. */
export default function NewGroup() {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateGroup();
  const kbPad = useKeyboardPadding();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [segment, setSegment] = useState('');
  const [uf, setUf] = useState('');
  const [city, setCity] = useState('');
  const [sheet, setSheet] = useState<'segment' | 'uf' | 'city' | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  async function selectUf(v: string) {
    setUf(v);
    setCity('');
    setLoadingCities(true);
    try { setCities(await fetchCities(v)); } catch { setCities([]); toast.error('Não foi possível carregar as cidades.'); }
    setLoadingCities(false);
  }

  async function openCitySheet() {
    if (!uf) { toast.info('Escolha primeiro a UF.'); return; }
    setSheet('city');
    if (!cities.length) {
      setLoadingCities(true);
      try { setCities(await fetchCities(uf)); } catch { toast.error('Não foi possível carregar as cidades.'); }
      setLoadingCities(false);
    }
  }

  async function onCreate() {
    if (name.trim().length < 2) { toast.error('Dê um nome ao grupo.'); return; }
    try {
      const g = await create.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        segment: segment || undefined,
        city: city ? `${city} · ${uf}` : undefined,
      });
      toast.success('Grupo criado!');
      router.replace({ pathname: '/group/[id]', params: { id: g.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível criar o grupo.');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-surface-border">
        <TextLink onPress={() => router.back()} tone="muted">Cancelar</TextLink>
        <Text className="text-ink-900 font-semibold text-base">Novo grupo</Text>
        <View className="w-16" />
      </View>

      <View style={{ flex: 1, paddingBottom: kbPad }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Input label="Nome do grupo" value={name} onChangeText={setName} placeholder="Ex.: Empresários do Varejo" maxLength={120} autoFocus />

          <View className="gap-1.5">
            <Text className="text-ink-700 text-sm font-semibold">Descrição</Text>
            <TextInput
              multiline
              value={description}
              onChangeText={(t) => setDescription(t.slice(0, DESC_MAX))}
              placeholder="Qual o propósito do grupo? Quem deveria participar?"
              placeholderTextColor={colors.ink[400]}
              maxLength={DESC_MAX}
              className="rounded-input px-4 py-3 bg-surface-muted text-ink-900 border border-surface-border"
              style={{ minHeight: 96, textAlignVertical: 'top' }}
            />
            <Text className="text-ink-400 text-xs text-right">{description.length}/{DESC_MAX}</Text>
          </View>

          <SelectRow label="Segmento (opcional)" value={segment} placeholder="Escolher segmento" onPress={() => setSheet('segment')} />
          <View className="flex-row gap-3">
            <View className="w-28"><SelectRow label="UF (opcional)" value={uf} placeholder="UF" onPress={() => setSheet('uf')} /></View>
            <SelectRow label="Cidade" value={city} placeholder={uf ? 'Escolher cidade' : 'Escolha a UF antes'} disabled={!uf} onPress={() => void openCitySheet()} />
          </View>
        </ScrollView>

        <View className="px-4 py-3 border-t border-surface-border">
          <Button title="Criar grupo" variant="accent" onPress={onCreate} loading={create.isPending} disabled={create.isPending} />
        </View>
      </View>

      <SelectSheet visible={sheet === 'segment'} onClose={() => setSheet(null)} title="Segmento" options={[...SEGMENTS]} selected={segment} onSelect={setSegment} />
      <SelectSheet visible={sheet === 'uf'} onClose={() => setSheet(null)} title="Estado (UF)" options={[...UFS]} selected={uf} onSelect={(v) => void selectUf(v)} />
      <SelectSheet visible={sheet === 'city'} onClose={() => setSheet(null)} title={`Cidade${uf ? ` · ${uf}` : ''}`} options={cities} selected={city} onSelect={setCity} loading={loadingCities} />
    </SafeAreaView>
  );
}
