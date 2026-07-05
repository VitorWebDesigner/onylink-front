import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Checkbox } from '../../components/Checkbox';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import { TextLink } from '../../components/TextLink';
import { useToast } from '../../components/feedback/toast';
import { colors } from '../../theme/colors';
import { PRESSED_OPACITY } from '../../theme/tokens';
import { pickImages, uploadImage } from '../../lib/media';
import { useKeyboardPadding } from '../../lib/keyboard';
import { useCreateChatGroup, useChatContacts, type ChatContact } from '../../features/messages/hooks';

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
  const [selected, setSelected] = useState<ChatContact[]>([]);
  // só quem eu sigo OU me segue (decisão do dono); a lista fica SEMPRE visível
  // abaixo do campo — a busca filtra localmente por nome/@handle
  const { data: contacts, isLoading: loadingContacts } = useChatContacts();
  const kbPad = useKeyboardPadding();

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const filtered = (contacts ?? []).filter((u) => {
    const t = norm(q.trim());
    return !t || norm(u.name).includes(t) || norm(u.handle).includes(t.replace(/^@/, ''));
  });

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

  function toggle(u: ChatContact) {
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
              <View>
                <View className="w-16 h-16 rounded-full bg-surface-muted border border-surface-border items-center justify-center overflow-hidden">
                  {photoPath ? (
                    <Image source={{ uri: photoPath }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : uploading ? (
                    <ActivityIndicator color={colors.brand[500]} />
                  ) : (
                    <Icon name="groups" set="light" size={26} color={colors.ink[400]} />
                  )}
                </View>
                {/* badge de câmera — mesmo padrão do avatar na edição de perfil */}
                <View className="absolute -right-1 -bottom-1 w-7 h-7 rounded-full bg-brand-500 border-2 border-surface items-center justify-center">
                  <Icon name="camera" set="light" size={13} color="#FFFFFF" />
                </View>
              </View>
            </Pressable>
            <View className="flex-1">
              <Input value={name} onChangeText={setName} placeholder="Nome do grupo" maxLength={80} />
            </View>
          </View>

          {/* selecionados — fileira de AVATARES com × no canto (estilo WhatsApp) */}
          {selected.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ gap: 14, paddingVertical: 2 }}>
              {selected.map((u) => (
                <View key={u.id} className="items-center" style={{ width: 56 }}>
                  <View>
                    <Avatar name={u.name} uri={u.avatarPath} size="lg" />
                    <Pressable onPress={() => toggle(u)} hitSlop={8} className="absolute -right-1.5 -top-1.5 w-5 h-5 rounded-full bg-brand-500 border-2 border-surface items-center justify-center">
                      <Icon name="close" size={10} color="#FFFFFF" />
                    </Pressable>
                  </View>
                  <Text numberOfLines={1} className="text-ink-700 text-[11px] mt-1">{u.name.split(' ')[0]}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}

          {/* participantes: SÓ contatos (sigo/me seguem); lista sempre visível */}
          <View className="gap-2">
            <Text className="text-ink-500 text-sm font-semibold">Adicionar participantes ({selected.length + 1}/150)</Text>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Filtrar por nome ou @usuário…"
              placeholderTextColor={colors.ink[400]}
              className="h-11 rounded-input px-4 bg-surface-muted text-ink-900 border border-surface-border"
            />
          </View>

          {loadingContacts ? <ActivityIndicator color={colors.brand[500]} /> : null}
          {!loadingContacts && !filtered.length ? (
            <Text className="text-ink-500 text-sm text-center py-6">
              {q.trim() ? 'Ninguém na sua rede com esse nome.' : 'Sua rede ainda está vazia — siga pessoas para criar grupos com elas.'}
            </Text>
          ) : null}
          {filtered.map((u) => {
            const on = selected.some((x) => x.id === u.id);
            return (
              <Pressable key={u.id} onPress={() => toggle(u)} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-row items-center gap-3 py-1">
                <Avatar name={u.name} uri={u.avatarPath} size="md" />
                <View className="flex-1">
                  <Text className="text-ink-900 font-semibold text-sm" numberOfLines={1}>{u.name}</Text>
                  <Text className="text-ink-400 text-[13px]" numberOfLines={1}>@{u.handle}{u.roleTitle ? ` · ${u.roleTitle}` : ''}</Text>
                </View>
                <Checkbox checked={on} />
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
