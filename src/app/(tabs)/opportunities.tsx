import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { EmptyState } from '../../components/EmptyState';
import { OpportunityCard } from '../../components/OpportunityCard';
import { useToast } from '../../components/feedback/toast';
import { colors } from '../../theme/colors';
import { PRESSED_OPACITY } from '../../theme/tokens';
import { useMyOpportunities, useOpportunities, useToggleOppInsight, useToggleOppLike } from '../../features/opportunities/hooks';
import { OPPORTUNITY_KINDS, type OpportunityKind } from '../../features/opportunities/types';

export default function Opportunities() {
  const router = useRouter();
  const toast = useToast();
  const [mine, setMine] = useState(false);
  const [kind, setKind] = useState<OpportunityKind | null>(null);
  const list = useOpportunities(kind);
  const my = useMyOpportunities();
  const toggleLike = useToggleOppLike();
  const toggleInsight = useToggleOppInsight();

  const data = mine ? my.data : list.data;
  const isLoading = mine ? my.isLoading : list.isLoading;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-2xl font-extrabold text-ink-900">Oportunidades</Text>
        <Pressable
          onPress={() => router.push('/opportunity/new')}
          style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
          className="bg-accent-500 h-9 px-4 rounded-pill flex-row items-center gap-1"
        >
          <Icon name="plus" size={18} color={colors.brand[500]} />
          <Text className="text-brand-500 font-semibold text-sm">Publicar</Text>
        </Pressable>
      </View>

      <View className="border-b border-surface-border">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}>
          <Chip label="Minhas" selected={mine} onPress={() => setMine(true)} />
          <Chip label="Todas" selected={!mine && kind === null} onPress={() => { setMine(false); setKind(null); }} />
          {OPPORTUNITY_KINDS.map((k) => (
            <Chip key={k.kind} label={k.label} selected={!mine && kind === k.kind} onPress={() => { setMine(false); setKind(k.kind); }} />
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(o) => o.id}
          renderItem={({ item }) => (
            <OpportunityCard
              opportunity={item}
              onOpen={(o) =>
                mine
                  ? router.push({ pathname: '/opportunity/applications/[id]', params: { id: o.id } })
                  : router.push({ pathname: '/opportunity/[id]', params: { id: o.id } })
              }
              onOpenAuthor={(o) => { if (o.authorId) router.push({ pathname: '/user/[id]', params: { id: o.authorId } }); }}
              onToggleInsight={(o) => toggleInsight.mutate({ id: o.id, insighted: o.insighted })}
              onToggleLike={(o) => toggleLike.mutate({ id: o.id, liked: o.liked })}
              onRepost={() => toast.success('Oportunidade repostada no seu perfil.')}
              onSend={() => toast.info('Enviar para um amigo em breve.')}
            />
          )}
          ListEmptyComponent={
            <View className="pt-24">
              <EmptyState
                icon="work"
                title={mine ? 'Você ainda não publicou' : 'Nenhuma oportunidade aqui'}
                subtitle={mine ? 'Publique uma indicação, parceria, vaga ou evento.' : 'Seja o primeiro a publicar.'}
              />
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
