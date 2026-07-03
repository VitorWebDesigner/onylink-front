import { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar } from '../../../components/Avatar';
import { Button } from '../../../components/Button';
import { Icon } from '../../../components/Icon';
import { EmptyState } from '../../../components/EmptyState';
import { useToast } from '../../../components/feedback/toast';
import { colors } from '../../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../../theme/tokens';
import { timeAgo } from '../../../lib/time';
import { useApplications, useOpportunity, useUpdateApplication } from '../../../features/opportunities/hooks';
import type { OpportunityApplication } from '../../../features/opportunities/types';

const STATUS: Record<OpportunityApplication['status'], { label: string; box: string; text: string }> = {
  PENDING: { label: 'Pendente', box: 'bg-surface-muted', text: 'text-ink-500' },
  APPROVED: { label: 'Aprovada', box: 'bg-accent-50', text: 'text-brand-500' },
  REJECTED: { label: 'Recusada', box: 'bg-[#FBE9E9]', text: 'text-danger' },
};

function ApplicationItem({ app, oppId }: { app: OpportunityApplication; oppId: string }) {
  const update = useUpdateApplication(oppId);
  const toast = useToast();
  const [reply, setReply] = useState(app.ownerReply ?? '');
  const st = STATUS[app.status];

  function act(status: 'APPROVED' | 'REJECTED') {
    update.mutate({ appId: app.id, status }, { onSuccess: () => toast.success(status === 'APPROVED' ? 'Candidatura aprovada.' : 'Candidatura recusada.') });
  }
  function sendReply() {
    const v = reply.trim();
    if (!v) return;
    update.mutate({ appId: app.id, reply: v }, { onSuccess: () => toast.success('Resposta enviada.') });
  }

  return (
    <View className="px-4 py-4 gap-3 border-b border-surface-border">
      <View className="flex-row items-center gap-3">
        <Avatar name={app.applicantName} size="lg" />
        <View className="flex-1">
          <Text className="text-ink-900 font-semibold text-sm">{app.applicantName}</Text>
          <Text className="text-ink-400 text-micro">{timeAgo(app.createdAt)}</Text>
        </View>
        <View className={['px-2.5 h-7 rounded-pill items-center justify-center', st.box].join(' ')}>
          <Text className={[st.text, 'text-xs font-semibold'].join(' ')}>{st.label}</Text>
        </View>
      </View>

      {app.answers.map((a, i) => (
        <View key={i} className="gap-0.5">
          <Text className="text-ink-500 text-[13px] font-semibold">{a.label}</Text>
          <Text className="text-ink-700 leading-5">{a.answer || '—'}</Text>
        </View>
      ))}

      <View className="flex-row gap-3">
        <View className="flex-1"><Button title="Aprovar" variant="accent" size="sm" onPress={() => act('APPROVED')} /></View>
        <View className="flex-1"><Button title="Recusar" variant="danger" size="sm" onPress={() => act('REJECTED')} /></View>
      </View>

      <View className="flex-row items-center gap-2">
        <TextInput
          value={reply} onChangeText={setReply}
          placeholder="Responder ao candidato..."
          placeholderTextColor={colors.ink[400]}
          className="flex-1 h-11 rounded-input px-4 bg-surface-muted text-ink-900 border border-surface-border"
          onSubmitEditing={sendReply} returnKeyType="send"
        />
        <Pressable onPress={sendReply} disabled={!reply.trim()} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed || !reply.trim() ? PRESSED_OPACITY : 1 })} className="w-11 h-11 rounded-full bg-accent-500 items-center justify-center">
          <Icon name="send" size={20} color={colors.brand[500]} />
        </Pressable>
      </View>
    </View>
  );
}

export default function Applications() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: o } = useOpportunity(id);
  const { data: apps, isLoading } = useApplications(id);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border">
        <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP}>
          <Icon name="back" size={24} color={colors.ink[900]} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-ink-900 font-semibold text-base">Candidaturas</Text>
          {o ? <Text className="text-ink-400 text-[13px]" numberOfLines={1}>{o.title}</Text> : null}
        </View>
      </View>

      <FlatList
        data={apps ?? []}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <ApplicationItem app={item} oppId={id} />}
        ListEmptyComponent={
          isLoading ? null : (
            <View className="pt-24"><EmptyState icon="user" title="Sem candidaturas ainda" subtitle="Quando alguém se candidatar, aparece aqui." /></View>
          )
        }
      />
    </SafeAreaView>
  );
}
