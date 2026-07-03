import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { SectionHeader } from '../components/SectionHeader';
import { colors } from '../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../theme/tokens';
import { timeAgo } from '../lib/time';
import { useFollow, useSearchPosts, useSearchUsers, type SearchUser } from '../features/search/hooks';
import { useFeed } from '../features/feed/hooks';
import type { FeedPost } from '../features/feed/types';

const TRENDING = ['Gestão de caixa', 'IA no comercial', 'Contratação', 'Networking local', 'Precificação'];

export default function Search() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const follow = useFollow();
  const feed = useFeed();

  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const users = useSearchUsers(dq);
  const posts = useSearchPosts(dq);
  const loading = !!dq && (users.isLoading || posts.isLoading);

  const PostRow = ({ p }: { p: FeedPost }) => (
    <Pressable onPress={() => router.push({ pathname: '/post/[id]', params: { id: p.id } })} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-row gap-3 px-4 py-3 border-b border-surface-border">
      <Avatar name={p.authorName} uri={p.authorAvatar} size="md" />
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-ink-900 font-semibold text-sm">{p.authorName}</Text>
          <Text className="text-ink-400 text-[13px]">· {timeAgo(p.createdAt)}</Text>
        </View>
        <Text className="text-ink-700 leading-5" numberOfLines={2}>{p.content}</Text>
      </View>
    </Pressable>
  );

  function UserRow({ u }: { u: SearchUser }) {
    return (
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border">
        <Avatar name={u.name} uri={u.avatarPath} size="lg" />
        <View className="flex-1">
          <Text className="text-ink-900 font-semibold text-sm">@{u.handle}</Text>
          <Text className="text-ink-500 text-[13px]" numberOfLines={1}>
            {u.name}{u.roleTitle ? ` · ${u.roleTitle}` : u.segment ? ` · ${u.segment}` : ''}
          </Text>
        </View>
        <Button
          title={u.followed ? 'Seguindo' : 'Seguir'}
          variant={u.followed ? 'secondary' : 'primary'}
          size="sm"
          onPress={() => follow.mutate({ userId: u.id, following: u.followed })}
        />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center gap-3 px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP}>
          <Icon name="back" size={24} color={colors.ink[900]} />
        </Pressable>
        <Text className="text-2xl font-extrabold text-ink-900">Pesquisar</Text>
      </View>

      <View className="px-4 pb-3">
        <View className="flex-row items-center gap-2 h-11 rounded-search px-3 bg-surface-muted border border-surface-border">
          <Icon name="search" set="light" size={18} color={colors.ink[400]} />
          <TextInput
            autoFocus value={q} onChangeText={setQ}
            placeholder="Pesquisar empresários, conteúdos..."
            placeholderTextColor={colors.ink[400]}
            className="flex-1 text-ink-900" autoCapitalize="none"
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
              <Icon name="error" set="light" size={18} color={colors.ink[400]} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {!dq ? (
        <ScrollView keyboardShouldPersistTaps="handled">
          <View className="px-4 pt-2 pb-1">
            <View className="self-start bg-accent-500 px-2 py-0.5 rounded">
              <Text className="text-brand-500 font-extrabold text-xs">EM ALTA AGORA</Text>
            </View>
          </View>
          {TRENDING.map((t) => (
            <Pressable key={t} onPress={() => setQ(t)} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="px-4 py-3 border-b border-surface-border flex-row items-center gap-2">
              <Icon name="search" set="light" size={16} color={colors.ink[400]} />
              <Text className="text-ink-900 font-semibold">{t}</Text>
            </Pressable>
          ))}

          {feed.data?.length ? (
            <>
              <View className="px-4 pt-5 pb-1"><SectionHeader title="Sugestões pra você" /></View>
              {feed.data.slice(0, 12).map((p) => <PostRow key={p.id} p={p} />)}
            </>
          ) : null}
        </ScrollView>
      ) : loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.brand[500]} /></View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled">
          {users.data?.length ? (
            <>
              <View className="px-4 pt-3 pb-1"><SectionHeader title="Pessoas" /></View>
              {users.data.map((u) => <UserRow key={u.id} u={u} />)}
            </>
          ) : null}

          {posts.data?.length ? (
            <>
              <View className="px-4 pt-4 pb-1"><SectionHeader title="Posts" /></View>
              {posts.data.map((p) => <PostRow key={p.id} p={p} />)}
            </>
          ) : null}

          {!users.data?.length && !posts.data?.length ? (
            <Text className="text-ink-500 px-4 py-8 text-center">Nenhum resultado para "{dq}".</Text>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
