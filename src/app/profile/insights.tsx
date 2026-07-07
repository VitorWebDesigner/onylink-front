import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { ScoreRing } from '../../components/ScoreRing';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { compactNumber } from '../../lib/format';
import { useMyInsights } from '../../features/users/hooks';

/** Variação vs. 30 dias anteriores (verde sobe · cinza igual · vermelho cai). */
function Delta({ now, prev }: { now: number; prev: number }) {
  const diff = now - prev;
  if (diff === 0) return <Text className="text-ink-400 text-xs">= mês anterior</Text>;
  const up = diff > 0;
  return (
    <Text className="text-xs font-semibold" style={{ color: up ? '#1F9D55' : colors.danger }}>
      {up ? '▲' : '▼'} {up ? '+' : ''}{diff.toLocaleString('pt-BR')} vs. mês anterior
    </Text>
  );
}

function Metric({ value, label, now, prev }: { value: number; label: string; now: number; prev: number }) {
  return (
    <View className="flex-1 gap-0.5 py-4">
      <Text className="text-ink-900 font-extrabold text-[26px]">{compactNumber(value)}</Text>
      <Text className="text-ink-500 text-[13px]">{label}</Text>
      <Delta now={now} prev={prev} />
    </View>
  );
}

// Anel de nota virou componente COMPARTILHADO (components/ScoreRing) — o
// resultado do Diagnóstico usa o mesmo (§13: nunca recriar primitiva).

/**
 * Painel do Empresário (plano-perfil.md Fase 2) — métricas de NEGÓCIO dos últimos
 * 30 dias com variação, candidaturas, pontos, maturidade (diagnóstico) e top posts.
 * SÓ o próprio usuário vê (decisão §5.2).
 */
export default function InsightsScreen() {
  const router = useRouter();
  const { data: d, isLoading, refetch, isRefetching } = useMyInsights();

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border">
        <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP}>
          <Icon name="back" size={24} color={colors.ink[900]} />
        </Pressable>
        <Text className="text-ink-900 font-semibold text-base">Painel do Empresário</Text>
      </View>

      {isLoading || !d ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.brand[500]} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.brand[500]} />}
        >
          <Text className="text-ink-500 text-sm">Últimos 30 dias</Text>

          <View className="flex-row gap-4 border-b border-surface-border">
            <Metric value={d.views30d} label="Visualizações" now={d.views30d} prev={d.viewsPrev} />
            <Metric value={d.insights30d} label="Insights recebidos" now={d.insights30d} prev={d.insightsPrev} />
          </View>
          <View className="flex-row gap-4 border-b border-surface-border">
            <Metric value={d.followers30d} label="Novos seguidores" now={d.followers30d} prev={d.followersPrev} />
            <Metric value={d.interactions30d} label="Interações" now={d.interactions30d} prev={d.interactionsPrev} />
          </View>

          <View className="flex-row items-center justify-between py-4 border-b border-surface-border">
            <View>
              <Text className="text-ink-900 font-semibold">Candidaturas recebidas</Text>
              <Text className="text-ink-500 text-[13px]">nas suas oportunidades · {d.applicationsTotal} no total</Text>
            </View>
            <Text className="text-ink-900 font-extrabold text-xl">{d.applications30d}</Text>
          </View>

          <View className="flex-row items-center justify-between py-4 border-b border-surface-border">
            <View>
              <Text className="text-ink-900 font-semibold">Pontos OnyLink</Text>
              <Text className="text-ink-500 text-[13px]">participação na comunidade</Text>
            </View>
            <Text className="text-ink-900 font-extrabold text-xl">{d.points.toLocaleString('pt-BR')}</Text>
          </View>

          {/* maturidade (diagnóstico) */}
          <View className="py-5 border-b border-surface-border gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-ink-900 font-bold text-base">Maturidade da empresa</Text>
              {d.diagnostic?.total != null ? (
                <Text className="text-ink-900 font-extrabold text-2xl">
                  {d.diagnostic.total}<Text className="text-ink-400 text-base">/100</Text>
                </Text>
              ) : null}
            </View>
            {d.diagnostic ? (
              <View className="gap-4">
                {/* 4 círculos lado a lado (decisão do dono) */}
                <View className="flex-row items-start">
                  <ScoreRing label="Financeiro" value={d.diagnostic.financeiro} />
                  <ScoreRing label="Comercial" value={d.diagnostic.comercial} />
                  <ScoreRing label="Marketing" value={d.diagnostic.marketing} />
                  <ScoreRing label="Gestão" value={d.diagnostic.gestao} />
                </View>
                <View className="pt-1">
                  <Button title="Refazer diagnóstico" variant="secondary" size="sm" onPress={() => router.push('/(onboarding)/diagnostic')} />
                </View>
              </View>
            ) : (
              <View className="gap-3">
                <Text className="text-ink-500 text-sm leading-5">
                  Você ainda não fez o diagnóstico. Ele mede a maturidade da sua empresa em 4 áreas e gera recomendações.
                </Text>
                <Button title="Fazer diagnóstico" variant="accent" onPress={() => router.push('/(onboarding)/diagnostic')} />
              </View>
            )}
          </View>

          {/* top publicações */}
          {d.topPosts.length ? (
            <View className="pt-5 gap-1">
              <Text className="text-ink-900 font-bold text-base pb-1">Top publicações</Text>
              {d.topPosts.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => router.push({ pathname: '/post/[id]', params: { id: p.id } })}
                  style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
                  className="py-3 border-b border-surface-border flex-row gap-3"
                >
                  {/* thumbnail da 1ª mídia (imagem ou frame do vídeo) */}
                  {p.media ? (
                    <View className="w-14 h-[72px] rounded-lg overflow-hidden bg-surface-muted">
                      <Image source={{ uri: p.media.type === 'VIDEO' ? p.media.thumbnail : p.media.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      {p.media.type === 'VIDEO' ? (
                        <View style={{ position: 'absolute', right: 4, bottom: 4 }}>
                          <Icon name="play" size={12} color="#FFFFFF" />
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                  <View className="flex-1 gap-1">
                    <Text className="text-ink-700 leading-5" numberOfLines={2}>{p.content?.trim() || `#${p.category}`}</Text>
                    <View className="flex-row items-center gap-4">
                    <View className="flex-row items-center gap-1">
                      <Icon name="eye" set="light" size={14} color={colors.ink[500]} />
                      <Text className="text-ink-500 text-xs">{compactNumber(p.viewCount)}</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Icon name="insight" size={14} color={colors.ink[500]} />
                      <Text className="text-ink-500 text-xs">{compactNumber(p.insightCount)}</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Icon name="heart" set="light" size={14} color={colors.ink[500]} />
                      <Text className="text-ink-500 text-xs">{compactNumber(p.likeCount)}</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Icon name="comment" set="light" size={14} color={colors.ink[500]} />
                      <Text className="text-ink-500 text-xs">{compactNumber(p.commentCount)}</Text>
                    </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
