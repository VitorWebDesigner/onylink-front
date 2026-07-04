import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import { SelectSheet } from '../../components/SelectSheet';
import { useToast } from '../../components/feedback/toast';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { SEGMENTS } from '../../lib/br';
import { useKeyboardPadding } from '../../lib/keyboard';
import { pickImages, uploadImage } from '../../lib/media';
import { useGroup, useUpdateGroup } from '../../features/groups/hooks';

const DESC_MAX = 300;

/** Edição da comunidade (SÓ admin — o back valida). Nome, descrição, segmento, foto e privacidade. */
export default function EditCommunity() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data: group } = useGroup(id);
  const save = useUpdateGroup(id);
  const kbPad = useKeyboardPadding();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [segment, setSegment] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!group || hydrated) return;
    setName(group.name);
    setDescription((group.description ?? '').slice(0, DESC_MAX));
    setSegment(group.segment ?? '');
    setIsPrivate(group.isPrivate);
    setCoverUrl(group.coverPath ?? null);
    setHydrated(true);
  }, [group, hydrated]);

  async function pickCover() {
    try {
      const [uri] = await pickImages(1);
      if (!uri) return;
      setUploadingCover(true);
      const up = await uploadImage(uri, 'communityCover');
      setCoverUrl(up.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível enviar a foto.');
    } finally {
      setUploadingCover(false);
    }
  }

  async function onSave() {
    if (name.trim().length < 2) { toast.error('Dê um nome à comunidade.'); return; }
    try {
      await save.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        segment: segment || undefined,
        coverPath: coverUrl ?? undefined,
        isPrivate,
      });
      toast.success('Comunidade atualizada!');
      router.back();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível salvar.');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border">
        <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP}>
          <Icon name="back" size={24} color={colors.ink[900]} />
        </Pressable>
        <Text className="text-ink-900 font-semibold text-base">Editar comunidade</Text>
      </View>

      <View style={{ flex: 1, paddingBottom: kbPad }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          <View className="items-center">
            <Pressable onPress={() => void pickCover()} disabled={uploadingCover} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
              <View className="w-20 h-20 rounded-full bg-surface-muted border border-surface-border items-center justify-center overflow-hidden">
                {coverUrl ? (
                  <Image source={{ uri: coverUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : uploadingCover ? (
                  <ActivityIndicator color={colors.brand[500]} />
                ) : (
                  <Icon name="camera" set="light" size={26} color={colors.ink[400]} />
                )}
              </View>
            </Pressable>
            <Text className="text-brand-500 text-sm font-semibold pt-2" suppressHighlighting onPress={() => void pickCover()}>
              {coverUrl ? 'Alterar foto' : 'Adicionar foto'}
            </Text>
          </View>

          <Input label="Nome" value={name} onChangeText={setName} placeholder="Nome da comunidade" maxLength={120} />

          <View className="gap-1.5">
            <Text className="text-ink-700 text-sm font-semibold">Descrição</Text>
            <TextInput
              multiline
              value={description}
              onChangeText={(t) => setDescription(t.slice(0, DESC_MAX))}
              placeholder="Qual o propósito da comunidade?"
              placeholderTextColor={colors.ink[400]}
              maxLength={DESC_MAX}
              className="rounded-input px-4 py-3 bg-surface-muted text-ink-900 border border-surface-border"
              style={{ minHeight: 96, textAlignVertical: 'top' }}
            />
            <Text className="text-ink-400 text-xs text-right">{description.length}/{DESC_MAX}</Text>
          </View>

          <View className="gap-1.5">
            <Text className="text-ink-700 text-sm font-semibold">Segmento</Text>
            <Pressable
              onPress={() => setSheetOpen(true)}
              style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
              className="h-12 rounded-input px-4 bg-surface-muted border border-surface-border flex-row items-center justify-between"
            >
              <Text className={segment ? 'text-ink-900' : 'text-ink-400'}>{segment || 'Escolher segmento'}</Text>
              <Icon name="forward" set="light" size={16} color={colors.ink[400]} />
            </Pressable>
          </View>

          <Pressable
            onPress={() => setIsPrivate((v) => !v)}
            style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
            className="flex-row items-center justify-between py-3 border-t border-b border-surface-border"
          >
            <View className="flex-1 pr-3">
              <Text className="text-ink-900 font-semibold">Comunidade privada</Text>
              <Text className="text-ink-500 text-[13px]">Novos membros só entram com aprovação do admin.</Text>
            </View>
            <View className={['w-12 h-7 rounded-full p-1', isPrivate ? 'bg-brand-500' : 'bg-surface-muted border border-surface-border'].join(' ')}>
              <View className={['w-5 h-5 rounded-full bg-white', isPrivate ? 'self-end' : 'self-start'].join(' ')} />
            </View>
          </Pressable>
        </ScrollView>

        <View className="px-4 py-3 border-t border-surface-border">
          <Button title="Salvar" variant="accent" onPress={onSave} loading={save.isPending} disabled={save.isPending || uploadingCover} />
        </View>
      </View>

      <SelectSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Segmento" options={[...SEGMENTS]} selected={segment} onSelect={setSegment} />
    </SafeAreaView>
  );
}
