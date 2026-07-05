import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import { TextLink } from '../../components/TextLink';
import { useToast } from '../../components/feedback/toast';
import { colors } from '../../theme/colors';
import { PRESSED_OPACITY } from '../../theme/tokens';
import { pickImages, uploadImage } from '../../lib/media';
import { useKeyboardPadding } from '../../lib/keyboard';
import { useSearchUsers, type SearchUser } from '../../features/search/hooks';
import { useCreateChatGroup } from '../../features/messages/hooks';

const MAX_MEMBERS = 149; // + o criador = 150 (decisão §5.2)

/** Criar GRUPO de chat (estilo WhatsApp): nome + foto + participantes. */
export default function NewChatGroup() {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateChatGroup();
  const [name, setName] = useState('');
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<SearchUser[]>([]);
  const { data: results, isLoading: searching } = useSearchUsers(q);
  const kbPad = useKeyboardPadding();

  async function pickPhoto() {
    try {
      setUploading(true);
      const [uri] = await pickImages(1);
      if (!uri) return;
      const up = await uploadImage(uri, 'chatGroupPhoto');
      setPhotoPath(up.url);
    } catch {
      toast.error('Não foi possível subir a foto.');
    } finally {
      setUploading(false);
    }
  }

  function toggle(u: SearchUser) {
    setSelected((s) => {
      if (s.some((x) => x.id === u.id)) return s.filter((x) => x.id !== u.id);
      if (s.length >= MAX_MEMBERS) {
        toast.error(`Grupo comporta até ${MAX_MEMBERS + 1} pessoas.`);
        return s;
      }
      return [...s, u];
    });
  }

  function onCreate() {
    const n = name.trim();
    if (n.length < 2) { toast.error('Dê um nome ao grupo.'); return; }
    if (!selected.length) { toast.error('Adicione ao menos um participante.'); return; }
    create.mutate(
      { name: n, photoPath: photoPath ?? undefined, memberIds: selected.map((u) => u.id) },
      {
        onSuccess: (conv) => {
          toast.success('Grupo criado!');
          router.replace({ pathname: '/chat/[id]', params: { id: conv.id } });
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Não foi possível criar o grupo.'),
      },
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      {/* header padrão de modal (mesmo tamanho do compose) */}
      <View className="flex-row items-center justify-between px-4 py-7 border-b border-surface-border">
        <TextLink onPress={() => router.back()} tone="muted">Cancelar</TextLink>
        <Text className="text-ink-900 font-semibold text-base">Novo grupo</Text>
        <View className="w-16" />
      </View>

      <View className="flex-1" style={{ paddingBottom: kbPad }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 16 }}>
          {/* foto + nome */}
          <View className="flex-row items-center gap-4">
            <Pressable onPress={() => void pickPhoto()} disabled={uploading} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
              <View className="w-16 h-16 rounded-full bg-surface-muted border border-surface-border items-center justify-center overflow-hidden">
                {photoPath ? (
                  <Image source={{ uri: photoPath }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : uploading ? (
                  <ActivityIndicator color={colors.brand[500]} />
                ) : (
                  <Icon name="camera" set="light" size={24} color={colors.ink[500]} />
                )}
              </View>
            </Pressable>
            <View className="flex-1">
              <Input value={name} onChangeText={setName} placeholder="Nome do grupo" maxLength={80} />
            </View>
          </View>

          {/* selecionados */}
          {selected.length ? (
            <View className="flex-row flex-wrap gap-2">
              {selected.map((u) => (
                <Pressable key={u.id} onPress={() => toggle(u)} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-row items-center gap-1.5 rounded-pill bg-accent-50 px-3 py-1.5">
                  <Text className="text-brand-500 text-[13px] font-semibold">{u.name}</Text>
                  <Icon name="close" size={13} color={colors.brand[500]} />
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* busca de participantes */}
          <View className="gap-2">
            <Text className="text-ink-500 text-sm font-semibold">Adicionar participantes ({selected.length + 1}/150)</Text>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Buscar por nome ou @usuário…"
              placeholderTextColor={colors.ink[400]}
              className="h-11 rounded-input px-4 bg-surface-muted text-ink-900 border border-surface-border"
            />
          </View>

          {searching ? <ActivityIndicator color={colors.brand[500]} /> : null}
          {(results ?? []).map((u) => {
            const on = selected.some((x) => x.id === u.id);
            return (
              <Pressable key={u.id} onPress={() => toggle(u)} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-row items-center gap-3 py-1">
                <Avatar name={u.name} uri={u.avatarPath} size="md" />
                <View className="flex-1">
                  <Text className="text-ink-900 font-semibold text-sm" numberOfLines={1}>{u.name}</Text>
                  <Text className="text-ink-400 text-[13px]" numberOfLines={1}>@{u.handle}{u.roleTitle ? ` · ${u.roleTitle}` : ''}</Text>
                </View>
                <View className={['w-6 h-6 rounded-full border items-center justify-center', on ? 'bg-accent-500 border-accent-500' : 'border-surface-border'].join(' ')}>
                  {on ? <Icon name="success" set="bold" size={14} color={colors.brand[500]} /> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="px-4 pb-2 pt-1">
          <Button title="Criar grupo" variant="accent" onPress={onCreate} loading={create.isPending} disabled={create.isPending || uploading} />
        </View>
      </View>
    </SafeAreaView>
  );
}
