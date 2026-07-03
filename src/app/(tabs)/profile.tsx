import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen } from '../../components/Screen';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Icon, type IconName } from '../../components/Icon';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { ProfileTabsBar, useProfileTabList, type ProfileTab } from '../../components/profile/ProfileTabs';
import { FollowsSheet, type FollowsKind } from '../../components/profile/FollowsSheet';
import { useToast } from '../../components/feedback/toast';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { config } from '../../lib/config';
import { mockProfile } from '../../lib/mock';
import { useAuth } from '../../store/auth';
import { useMe, useMyInsights } from '../../features/users/hooks';
import { usePinPost } from '../../features/feed/hooks';
import type { FeedPost } from '../../features/feed/types';

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View className="flex-1 items-center gap-0.5">
      <Text className="text-ink-900 font-extrabold text-lg">{value.toLocaleString('pt-BR')}</Text>
      <Text className="text-ink-500 text-xs">{label}</Text>
    </View>
  );
}

/** Aba Perfil (própria): perfil rico + Painel (só conta PROFISSIONAL) + abas + menu ☰. */
export default function Profile() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const router = useRouter();
  const toast = useToast();
  const { data: p, isLoading, refetch, isRefetching } = useMe();
  const { data: ins } = useMyInsights(!!p?.professional);
  const [tab, setTab] = useState<ProfileTab>('posts');
  const [follows, setFollows] = useState<FollowsKind | null>(null);
  const [pinTarget, setPinTarget] = useState<FeedPost | null>(null);
  const pin = usePinPost();
  const tabList = useProfileTabList(p?.id ?? '', tab, { onPostMenu: (po) => { if (po.authorId === user?.id) setPinTarget(po); } });

  // ——— modo mock (offline total, EXPO_PUBLIC_MOCK=1) ———
  if (config.mock.profile) {
    const m = mockProfile;
    return (
      <Screen>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="items-center gap-3 py-6 border-b border-surface-border">
            <Avatar name={user?.name} size="xl" />
            <View className="items-center gap-1">
              <Text className="text-ink-900 font-extrabold text-xl">{user?.name ?? 'Visitante'}</Text>
              <Text className="text-ink-500 text-sm">{m.title} · {m.company}</Text>
            </View>
            <Text className="text-ink-700 leading-5 text-center px-2">{m.bio}</Text>
            <View className="flex-row flex-wrap gap-2 justify-center pt-1">
              {m.badges.map((b) => <Badge key={b.label} label={b.label} icon={b.icon as IconName} tone={b.tone} />)}
            </View>
          </View>
          <View className="flex-row py-5 border-b border-surface-border">
            <Stat value={m.stats.posts} label="Publicações" />
            <View className="w-px bg-surface-border" />
            <Stat value={m.stats.connections} label="Conexões" />
            <View className="w-px bg-surface-border" />
            <Stat value={m.stats.groups} label="Grupos" />
          </View>
          <View className="gap-3 py-6">
            <Button title="Editar perfil" variant="secondary" onPress={() => toast.info('Sem backend no modo demo.')} />
            <Button title="Sair" variant="ghost" onPress={() => logout()} />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // ——— modo real ———
  const header = p ? (
    <View>
      <ProfileHeader
        p={p}
        onPressFollowers={() => setFollows('followers')}
        onPressFollowing={() => setFollows('following')}
      />

      {/* Painel do Empresário — SÓ conta PROFISSIONAL. (Card de maturidade saiu:
          a nota vive dentro do Painel, em 4 anéis.) */}
      {p.professional ? (
        <Pressable
          onPress={() => router.push('/profile/insights')}
          style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
          className="flex-row items-center justify-between mx-4 mt-5 py-4 border-t border-b border-surface-border"
        >
          <View className="gap-0.5 flex-1 pr-3">
            <View className="flex-row items-center gap-2">
              <Icon name="chart" set="light" size={18} color={colors.brand[500]} />
              <Text className="text-ink-900 font-semibold">Painel do Empresário</Text>
            </View>
            <Text className="text-ink-500 text-sm" numberOfLines={2}>
              {ins
                ? `${ins.views30d.toLocaleString('pt-BR')} visualizações · ${ins.insights30d.toLocaleString('pt-BR')} insights · +${ins.followers30d.toLocaleString('pt-BR')} seguidores nos últimos 30 dias`
                : 'Métricas dos seus posts, seguidores e maturidade da empresa'}
            </Text>
          </View>
          <Icon name="forward" set="light" size={18} color={colors.brand[500]} />
        </Pressable>
      ) : null}

      <ProfileTabsBar tab={tab} onChange={setTab} />
    </View>
  ) : null;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* top bar: @handle + menu ☰ → tela Configurações e atividades */}
      <View className="flex-row items-center justify-between px-4 py-2">
        <Text className="text-ink-900 font-bold text-base">{p ? `@${p.handle}` : ''}</Text>
        <Pressable onPress={() => router.push('/profile/settings')} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
          <Icon name="menu" size={26} color={colors.ink[900]} />
        </Pressable>
      </View>

      {isLoading && !p ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.brand[500]} /></View>
      ) : (
        <FlatList
          key={tab}
          data={tabList.data as never[]}
          keyExtractor={tabList.keyExtractor}
          numColumns={tabList.numColumns}
          renderItem={tabList.renderItem}
          ListHeaderComponent={header}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.brand[500]} />}
          ListEmptyComponent={
            tabList.loading ? (
              <View className="py-10 items-center"><ActivityIndicator color={colors.brand[500]} /></View>
            ) : (
              <View className="py-8"><EmptyState icon="paper" title={tabList.empty} /></View>
            )
          }
        />
      )}

      {/* rede (stats tocáveis) — sheet Seguidores | Seguindo */}
      {p ? <FollowsSheet userId={p.id} initialKind={follows ?? 'followers'} visible={!!follows} onClose={() => setFollows(null)} /> : null}

      {/* fixar/desafixar post (toque longo num post próprio da aba Publicações) */}
      <BottomSheet visible={!!pinTarget} onClose={() => setPinTarget(null)}>
        <View className="pb-2">
          <Pressable
            onPress={() => {
              if (pinTarget) {
                pin.mutate({ postId: pinTarget.id, pinned: !!pinTarget.pinned });
                toast.success(pinTarget.pinned ? 'Post desafixado.' : 'Post fixado no seu perfil.');
              }
              setPinTarget(null);
            }}
            style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
            className="flex-row items-center gap-3 px-4 py-4"
          >
            <Icon name="bookmark" set="light" size={22} color={colors.ink[900]} />
            <Text className="text-ink-900 font-semibold text-[15px]">{pinTarget?.pinned ? 'Desafixar do perfil' : 'Fixar no perfil'}</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
