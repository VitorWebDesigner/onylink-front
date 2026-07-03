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
import { HIT_SLOP } from '../../theme/tokens';
import { useAuth } from '../../store/auth';
import { useUser } from '../../features/users/hooks';

/** Perfil PÚBLICO: perfil rico + Seguir/Contato + sugestões (só APÓS seguir) + abas. */
export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const me = useAuth((s) => s.user);
  const { data: u, isLoading, isError } = useUser(id);
  const followFlow = useFollowFlow();
  const [contactOpen, setContactOpen] = useState(false);
  const [follows, setFollows] = useState<FollowsKind | null>(null);
  const [tab, setTab] = useState<ProfileTab>('posts');
  const tabList = useProfileTabList(id, tab);

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
        <Text className="text-ink-900 font-semibold text-base">{u ? `@${u.handle}` : 'Perfil'}</Text>
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
        </>
      )}
    </SafeAreaView>
  );
}
