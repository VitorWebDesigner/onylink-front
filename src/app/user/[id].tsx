import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { ContactSheet } from '../../components/profile/ContactSheet';
import { FollowsSheet, type FollowsKind } from '../../components/profile/FollowsSheet';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { ProfileTabsBar, useProfileTabList, type ProfileTab } from '../../components/profile/ProfileTabs';
import { SuggestionsRow } from '../../components/profile/SuggestionsRow';
import { useFollowFlow } from '../../components/follow/FollowFlowProvider';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { useAuth } from '../../store/auth';
import { useUser } from '../../features/users/hooks';
import { useOpenDm } from '../../features/messages/hooks';
import { useToast } from '../../components/feedback/toast';
import { ReportSheet } from '../../components/moderation/ReportSheet';
import { BottomSheet } from '../../components/BottomSheet';
import { Share } from 'react-native';

/** Perfil PÚBLICO: perfil rico + Seguir/Contato + sugestões (só APÓS seguir) + abas. */
export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const me = useAuth((s) => s.user);
  const { data: u, isLoading, isError } = useUser(id);
  const followFlow = useFollowFlow();
  const openDm = useOpenDm();
  const toast = useToast();
  const [contactOpen, setContactOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [follows, setFollows] = useState<FollowsKind | null>(null);
  const [tab, setTab] = useState<ProfileTab>('posts');
  // abas usam o id RESOLVIDO (a rota aceita @handle nas menções da bio — Fase 4)
  const tabList = useProfileTabList(u?.id ?? '', tab);

  const isMe = !!u && u.id === me?.id;
  const hasContact = !!(u?.contactEmail || u?.contactWhatsapp || u?.contactUrl);

  const header = u ? (
    <View>
      <ProfileHeader
        p={u}
        onPressFollowers={() => setFollows('followers')}
        onPressFollowing={() => setFollows('following')}
        actions={
          isMe ? (
            <Button title="Editar perfil" variant="secondary" onPress={() => router.push('/profile/edit')} />
          ) : (
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  title={u.followed ? 'Seguindo' : 'Seguir'}
                  variant={u.followed ? 'secondary' : 'primary'}
                  onPress={() => followFlow.start({ id: u.id, name: u.name, avatarPath: u.avatarPath, followed: u.followed })}
                />
              </View>
              {/* caminho pro chat 1:1 direto do perfil (Fase B) */}
              <View className="flex-1">
                <Button
                  title="Mensagem"
                  variant="secondary"
                  loading={openDm.isPending}
                  onPress={() => openDm.mutate(u.id, {
                    onSuccess: (conv) => router.push({ pathname: '/chat/[id]', params: { id: conv.id } }),
                    onError: () => toast.error('Não foi possível abrir a conversa.'),
                  })}
                />
              </View>
              {hasContact ? (
                <View className="flex-1">
                  <Button title="Contato" variant="accent" onPress={() => setContactOpen(true)} />
                </View>
              ) : null}
            </View>
          )
        }
      />

      {/* sugestões SÓ depois de seguir (comportamento IG — decisão item 1) */}
      {!isMe && u.followed ? <SuggestionsRow seedId={u.id} excludeId={me?.id} /> : null}

      <ProfileTabsBar tab={tab} onChange={setTab} />
    </View>
  ) : null;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border">
        <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP}>
          <Icon name="back" size={24} color={colors.ink[900]} />
        </Pressable>
        <Text className="text-ink-900 font-semibold text-base flex-1">{u ? `@${u.handle}` : 'Perfil'}</Text>
        {/* menu do perfil (compartilhar · denunciar) — 3-pontos NÃO é denúncia direta */}
        {u && !isMe ? (
          <Pressable onPress={() => setMenuOpen(true)} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="w-8 h-8 rounded-full border border-surface-border items-center justify-center">
            <Icon name="more" size={16} color={colors.ink[900]} />
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.brand[500]} /></View>
      ) : isError || !u ? (
        <View className="flex-1 items-center justify-center"><EmptyState icon="user" title="Perfil não encontrado" /></View>
      ) : (
        <>
          <FlatList
            key={tab}
            data={tabList.data as never[]}
            keyExtractor={tabList.keyExtractor}
            numColumns={tabList.numColumns}
            renderItem={tabList.renderItem}
            ListHeaderComponent={header}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              tabList.loading ? (
                <View className="py-10 items-center"><ActivityIndicator color={colors.brand[500]} /></View>
              ) : (
                <View className="py-8"><EmptyState icon="paper" title={tabList.empty} /></View>
              )
            }
          />
          <ContactSheet visible={contactOpen} onClose={() => setContactOpen(false)} p={u} />
          <FollowsSheet userId={u.id} initialKind={follows ?? 'followers'} visible={!!follows} onClose={() => setFollows(null)} />
          {/* menu → ações do perfil; Denunciar abre o sheet de motivos EM SEQUÊNCIA (§13) */}
          <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)}>
            <View className="pb-2">
              <Pressable
                onPress={() => {
                  setMenuOpen(false);
                  void Share.share({ message: `Conheça ${u.name} (@${u.handle}) no OnyLink — networking que gera negócio.` });
                }}
                style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
                className="flex-row items-center gap-3 px-4 py-4 border-b border-surface-border"
              >
                <Icon name="send" set="light" size={20} color={colors.ink[700]} />
                <Text className="text-ink-900 text-[15px]">Compartilhar perfil</Text>
              </Pressable>
              <Pressable
                onPress={() => { setMenuOpen(false); setTimeout(() => setReportOpen(true), 250); }}
                style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
                className="flex-row items-center gap-3 px-4 py-4 border-b border-surface-border"
              >
                <Icon name="error" set="light" size={20} color={colors.danger} />
                <Text className="text-danger font-semibold text-[15px]">Denunciar</Text>
              </Pressable>
            </View>
          </BottomSheet>

          <ReportSheet visible={reportOpen} targetType="USER" targetId={u.id} onClose={() => setReportOpen(false)} />
        </>
      )}
    </SafeAreaView>
  );
}
