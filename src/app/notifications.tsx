import { useEffect, useRef } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { Icon, type IconName } from '../components/Icon';
import { UserBadges } from '../components/UserBadges';
import { colors } from '../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../theme/tokens';
import { timeAgo } from '../lib/time';
import { useMarkAllRead, useNotifications, type AppNotification } from '../features/notifications/hooks';

/** Texto + ícone por tipo de evento. */
const KIND_META: Record<string, { text: string; icon: IconName; color: string }> = {
  LIKE: { text: 'curtiu sua publicação', icon: 'heart', color: colors.action.like },
  INSIGHT: { text: 'marcou insight na sua publicação', icon: 'insight', color: colors.action.insight },
  REPOST: { text: 'repostou sua publicação', icon: 'repost', color: colors.ink[500] },
  COMMENT: { text: 'comentou na sua publicação', icon: 'comment', color: colors.brand[500] },
  REPLY: { text: 'respondeu seu comentário', icon: 'reply', color: colors.brand[500] },
  SUBSCRIBED: { text: 'comentou numa publicação que você acompanha', icon: 'bell', color: colors.brand[500] },
  FOLLOW: { text: 'começou a seguir você', icon: 'user', color: colors.brand[500] },
  APPLICATION: { text: 'se candidatou à sua oportunidade', icon: 'work', color: colors.brand[500] },
  JOIN_REQUEST: { text: 'pediu para entrar na sua comunidade', icon: 'groups', color: colors.brand[500] },
  JOIN_APPROVED: { text: 'aprovou sua entrada na comunidade', icon: 'success', color: colors.brand[500] },
  GROUP_POST: { text: 'publicou na comunidade', icon: 'groups', color: colors.brand[500] },
  CONNECTION: { text: 'enviou um convite de conexão', icon: 'connector', color: colors.brand[500] },
  CONNECTION_ACCEPTED: { text: 'aceitou sua conexão', icon: 'connector', color: colors.brand[500] },
  MESSAGE: { text: 'enviou uma mensagem', icon: 'message', color: colors.brand[500] },
  POST_APPROVED: { text: 'sua publicação foi aprovada', icon: 'success', color: colors.brand[500] },
  POST_REJECTED: { text: 'sua publicação foi removida', icon: 'error', color: colors.danger },
};

/** Notificações (sino). Abrir a tela marca tudo como lido (badge zera; os pontinhos
 *  de não-lida permanecem até a próxima visita). */
export default function NotificationsScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useNotifications();
  const markAll = useMarkAllRead();
  const marked = useRef(false);

  // marca como lidas DEPOIS que a lista chegou (senão os pontinhos nem aparecem)
  useEffect(() => {
    if (data && !marked.current) {
      marked.current = true;
      markAll.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function open(n: AppNotification) {
    if (n.kind === 'FOLLOW' || n.kind === 'CONNECTION' || n.kind === 'CONNECTION_ACCEPTED') {
      if (n.actorId) router.push({ pathname: '/user/[id]', params: { id: n.actorId } });
      return;
    }
    if (n.kind === 'APPLICATION') {
      if (n.opportunityId) router.push({ pathname: '/opportunity/applications/[id]', params: { id: n.opportunityId } });
      return;
    }
    if (n.kind === 'JOIN_REQUEST' || n.kind === 'JOIN_APPROVED') {
      if (n.groupId) router.push({ pathname: '/group/[id]', params: { id: n.groupId } });
      return;
    }
    if (n.postId) router.push({ pathname: '/post/[id]', params: { id: n.postId } });
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border">
        <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP}>
          <Icon name="back" size={24} color={colors.ink[900]} />
        </Pressable>
        <Text className="text-ink-900 font-semibold text-base">Notificações</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.brand[500]} /></View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(n) => n.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.brand[500]} />}
          renderItem={({ item: n }) => {
            const meta = KIND_META[n.kind] ?? { text: 'interagiu com você', icon: 'bell' as IconName, color: colors.brand[500] };
            // GROUP_POST leva o nome da comunidade no texto
            const text = n.kind === 'GROUP_POST' && n.groupName ? `publicou em ${n.groupName}` : meta.text;
            return (
              <Pressable
                onPress={() => open(n)}
                style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
                className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border"
              >
                <Pressable
                  onPress={() => { if (n.actorId) router.push({ pathname: '/user/[id]', params: { id: n.actorId } }); }}
                  hitSlop={6}
                  style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
                >
                  <View>
                    <Avatar name={n.actorName ?? '?'} uri={n.actorAvatar} size="md" />
                    <View className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full bg-surface items-center justify-center">
                      <Icon name={meta.icon} set="bold" size={12} color={meta.color} />
                    </View>
                  </View>
                </Pressable>

                <View className="flex-1">
                  <Text className="text-ink-700 leading-5" numberOfLines={2}>
                    {n.actorName ? <Text className="text-ink-900 font-semibold">{n.actorName} </Text> : null}
                    {n.actorVerified || n.actorAdmin ? <UserBadges verified={n.actorVerified} admin={n.actorAdmin} size={12} /> : null}
                    {n.actorVerified || n.actorAdmin ? ' ' : null}
                    {text}
                    {n.preview ? <Text className="text-ink-500">{` · “${n.preview}”`}</Text> : null}
                  </Text>
                  <Text className="text-ink-400 text-xs mt-0.5">{timeAgo(n.createdAt)}</Text>
                </View>

                {!n.read ? <View className="w-2.5 h-2.5 rounded-full bg-brand-500" /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View className="py-24">
              <EmptyState icon="bell" title="Nenhuma notificação" subtitle="Interações com você e com seus posts aparecem aqui." />
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
