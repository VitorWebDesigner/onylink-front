import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import { SelectSheet } from '../../components/SelectSheet';
import { useToast } from '../../components/feedback/toast';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { pickImages, uploadImage } from '../../lib/media';
import { UFS, SEGMENTS, fetchCities } from '../../lib/br';
import { useAuth } from '../../store/auth';
import { useMe, useUpdateProfile } from '../../features/users/hooks';

const BIO_MAX = 200;

/** Linha de SELEÇÃO (o usuário escolhe, não digita): valor + chevron → abre sheet. */
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

/**
 * Edição do próprio perfil (PATCH /web/users/me). Capa+avatar na MESMA disposição
 * da tela de perfil (capa full-bleed, avatar sobreposto à esquerda). Cidade/UF
 * (IBGE) e segmento são SELECIONADOS, nunca digitados. Bio máx. 200 c/ links
 * clicáveis no perfil (basta digitar a URL no texto).
 */
export default function EditProfile() {
  const router = useRouter();
  const toast = useToast();
  const me = useAuth((s) => s.user);
  const updateUser = useAuth((s) => s.updateUser);
  const { data: profile } = useMe();
  const save = useUpdateProfile();

  const [name, setName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [segment, setSegment] = useState('');
  const [city, setCity] = useState('');
  const [uf, setUf] = useState('');
  const [bio, setBio] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [contactUrl, setContactUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // seleção (UF → cidades do IBGE → segmento)
  const [sheet, setSheet] = useState<'uf' | 'city' | 'segment' | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    if (!profile || hydrated) return;
    setName(profile.name ?? '');
    setRoleTitle(profile.roleTitle ?? '');
    setSegment(profile.segment ?? '');
    setCity(profile.city ?? '');
    setUf(profile.state ?? '');
    setBio((profile.bio ?? '').slice(0, BIO_MAX));
    setContactEmail(profile.contactEmail ?? '');
    setContactWhatsapp(profile.contactWhatsapp ?? '');
    setContactUrl(profile.contactUrl ?? '');
    setAvatarUrl(profile.avatarPath);
    setCoverUrl(profile.coverPath);
    setHydrated(true);
  }, [profile, hydrated]);

  async function selectUf(v: string) {
    setUf(v);
    setCity(''); // trocou o estado → cidade anterior deixa de valer
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

  async function pickAndUpload(kind: 'avatar' | 'cover') {
    try {
      const [uri] = await pickImages(1);
      if (!uri) return;
      kind === 'avatar' ? setUploadingAvatar(true) : setUploadingCover(true);
      const up = await uploadImage(uri, kind);
      kind === 'avatar' ? setAvatarUrl(up.url) : setCoverUrl(up.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível enviar a imagem.');
    } finally {
      kind === 'avatar' ? setUploadingAvatar(false) : setUploadingCover(false);
    }
  }

  const busy = save.isPending || uploadingAvatar || uploadingCover;

  async function onSave() {
    if (name.trim().length < 2) { toast.error('Informe seu nome.'); return; }
    try {
      await save.mutateAsync({
        name: name.trim(),
        roleTitle: roleTitle.trim() || undefined,
        segment: segment || undefined,
        city: city || undefined,
        state: uf || undefined,
        bio: bio.trim() || undefined,
        avatarPath: avatarUrl ?? undefined,
        coverPath: coverUrl ?? undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactWhatsapp: contactWhatsapp.trim() || undefined,
        contactUrl: contactUrl.trim() || undefined,
      });
      if (name.trim() !== me?.name) updateUser({ name: name.trim() });
      toast.success('Perfil atualizado!');
      router.back();
    } catch {
      toast.error('Não foi possível salvar. Tente novamente.');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border">
        <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP}>
          <Icon name="back" size={24} color={colors.ink[900]} />
        </Pressable>
        <Text className="text-ink-900 font-semibold text-base">Editar perfil</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {/* capa + avatar — MESMA disposição da tela de perfil (capa full-bleed,
              avatar sobreposto à esquerda) */}
          <Pressable onPress={() => pickAndUpload('cover')} disabled={uploadingCover} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
            <View className="h-36 items-center justify-center" style={{ backgroundColor: coverUrl ? undefined : 'rgba(10,16,48,0.06)' }}>
              {coverUrl ? <Image source={{ uri: coverUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
              <View style={{ position: 'absolute', right: 10, bottom: 10 }}>
                <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: 'rgba(10,16,48,0.65)' }}>
                  {uploadingCover ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon name="camera" set="light" size={14} color="#FFFFFF" />}
                  <Text className="text-white text-xs font-semibold">{coverUrl ? 'Alterar capa' : 'Adicionar capa'}</Text>
                </View>
              </View>
            </View>
          </Pressable>

          <View className="px-4">
            <Pressable onPress={() => pickAndUpload('avatar')} disabled={uploadingAvatar} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="-mt-10 self-start">
              <View className="rounded-full border-4 border-surface bg-surface">
                <Avatar name={name || me?.name} uri={avatarUrl} size="xl" />
                {uploadingAvatar ? (
                  <View className="absolute inset-0 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(10,16,48,0.45)' }}>
                    <ActivityIndicator color="#FFFFFF" />
                  </View>
                ) : null}
                {/* badge de câmera no canto do avatar */}
                <View className="absolute -right-1 -bottom-1 w-8 h-8 rounded-full bg-brand-500 border-2 border-surface items-center justify-center">
                  <Icon name="camera" set="light" size={14} color="#FFFFFF" />
                </View>
              </View>
            </Pressable>
          </View>

          <View className="px-4 pt-4 gap-4">
            <Input label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" maxLength={120} />
            <Input label="Cargo" value={roleTitle} onChangeText={setRoleTitle} placeholder="Ex.: CEO, Sócio, Gestor comercial" maxLength={120} />

            {/* localização + segmento: SELEÇÃO (sem digitação livre) */}
            <View className="flex-row gap-3">
              <View className="w-28"><SelectRow label="UF" value={uf} placeholder="UF" onPress={() => setSheet('uf')} /></View>
              <SelectRow label="Cidade" value={city} placeholder={uf ? 'Escolher cidade' : 'Escolha a UF antes'} disabled={!uf} onPress={() => void openCitySheet()} />
            </View>
            <SelectRow label="Segmento" value={segment} placeholder="Escolher segmento" onPress={() => setSheet('segment')} />

            {/* bio (máx. 200) — digite URLs no texto e elas ficam clicáveis no perfil */}
            <View className="gap-1.5">
              <Text className="text-ink-700 text-sm font-semibold">Bio</Text>
              <TextInput
                multiline
                value={bio}
                onChangeText={(t) => setBio(t.slice(0, BIO_MAX))}
                placeholder="Conte em poucas linhas o que sua empresa faz. Links (ex.: suaempresa.com.br com https://) ficam clicáveis no perfil."
                placeholderTextColor={colors.ink[400]}
                maxLength={BIO_MAX}
                className="rounded-input px-4 py-3 bg-surface-muted text-ink-900 border border-surface-border"
                style={{ minHeight: 96, textAlignVertical: 'top' }}
              />
              <Text className="text-ink-400 text-xs text-right">{bio.length}/{BIO_MAX}</Text>
            </View>

            {/* contato — alimenta o sheet do botão Contato no perfil público */}
            <View className="gap-1 pt-1">
              <Text className="text-ink-900 font-bold text-base">Contato</Text>
              <Text className="text-ink-500 text-xs">Aparecem no botão Contato do seu perfil. Preencha só o que quiser expor.</Text>
            </View>
            <Input label="E-mail de contato" value={contactEmail} onChangeText={setContactEmail} placeholder="contato@suaempresa.com.br" keyboardType="email-address" autoCapitalize="none" maxLength={200} />
            <Input label="WhatsApp" value={contactWhatsapp} onChangeText={setContactWhatsapp} placeholder="(34) 99999-9999" keyboardType="phone-pad" maxLength={30} />
            <Input label="Site" value={contactUrl} onChangeText={setContactUrl} placeholder="suaempresa.com.br" keyboardType="url" autoCapitalize="none" maxLength={300} />
          </View>
        </ScrollView>

        <View className="px-4 py-3 border-t border-surface-border">
          <Button title="Salvar" variant="accent" onPress={onSave} disabled={busy} loading={save.isPending} />
        </View>
      </KeyboardAvoidingView>

      {/* sheets de seleção */}
      <SelectSheet visible={sheet === 'uf'} onClose={() => setSheet(null)} title="Estado (UF)" options={[...UFS]} selected={uf} onSelect={(v) => void selectUf(v)} />
      <SelectSheet visible={sheet === 'city'} onClose={() => setSheet(null)} title={`Cidade${uf ? ` · ${uf}` : ''}`} options={cities} selected={city} onSelect={setCity} loading={loadingCities} />
      <SelectSheet visible={sheet === 'segment'} onClose={() => setSheet(null)} title="Segmento" options={[...SEGMENTS]} selected={segment} onSelect={setSegment} />
    </SafeAreaView>
  );
}
