import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Icon, type IconName } from '../../components/Icon';
import { ScoreRing } from '../../components/ScoreRing';
import { TextLink } from '../../components/TextLink';
import { useToast } from '../../components/feedback/toast';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { useLatestDiagnostic, useSubmitDiagnostic } from '../../features/diagnostic/hooks';
import {
  AREA_LABEL,
  QUESTIONS,
  type DiagnosticAnswers,
  type DiagnosticArea,
  type DiagnosticResult,
} from '../../features/diagnostic/types';

const SCALE = [0, 1, 2, 3, 4, 5];
const AREAS: DiagnosticArea[] = ['financeiro', 'comercial', 'marketing', 'gestao'];
const AREA_ICON: Record<DiagnosticArea, IconName> = {
  financeiro: 'wallet', comercial: 'bag', marketing: 'chart', gestao: 'document',
};
const AREA_INTRO: Record<DiagnosticArea, string> = {
  financeiro: 'Caixa, margem e organização do dinheiro.',
  comercial: 'Processo de vendas, funil e metas.',
  marketing: 'Posicionamento, aquisição e métricas.',
  gestao: 'Indicadores, delegação e time.',
};

/** Seletor Likert 0..5 para uma pergunta. */
function Scale({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <View className="flex-row gap-2">
      {SCALE.map((n) => {
        const active = value === n;
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
            className={[
              'flex-1 h-11 rounded-card items-center justify-center border',
              active ? 'bg-brand-500 border-brand-500' : 'bg-surface-muted border-surface-border',
            ].join(' ')}
          >
            <Text className={active ? 'text-white font-semibold' : 'text-ink-500'}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Diagnóstico de Maturidade — porta de aquisição (CLAUDE.md §8).
 * WIZARD por área (4 passos, 3 perguntas cada, progresso no topo) → resultado
 * com ANÉIS (mesmo ScoreRing do Painel) + recomendações com CTA pra comunidade.
 * Vindo das Configurações com resultado anterior: mostra o salvo + "Refazer".
 */
export default function Diagnostic() {
  const router = useRouter();
  const toast = useToast();
  const { redo } = useLocalSearchParams<{ redo?: string }>();
  const submit = useSubmitDiagnostic();
  const { data: latest, isLoading: loadingLatest } = useLatestDiagnostic();

  const [step, setStep] = useState(0); // 0..3 = áreas
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [redoing, setRedoing] = useState(redo === '1');

  const area = AREAS[step]!;
  const areaQuestions = useMemo(
    () => QUESTIONS.map((q, i) => ({ ...q, index: i })).filter((q) => q.area === area),
    [area],
  );
  const stepDone = areaQuestions.every((q) => answers[q.index] !== undefined);
  const progress = (Object.keys(answers).length / QUESTIONS.length) * 100;

  async function onSubmit() {
    const grouped: DiagnosticAnswers = { financeiro: [], comercial: [], marketing: [], gestao: [] };
    QUESTIONS.forEach((q, i) => grouped[q.area].push(answers[i] ?? 0));
    try {
      const res = await submit.mutateAsync(grouped);
      setResult(res);
      setRedoing(false);
    } catch {
      toast.error('Não foi possível enviar o diagnóstico. Tente novamente.');
    }
  }

  function restart() {
    setAnswers({});
    setStep(0);
    setResult(null);
    setRedoing(true);
  }

  // ───── Resultado (recém-enviado OU salvo, vindo das Configurações) ─────
  const shown = result ?? (!redoing && latest ? latest : null);
  if (shown) {
    const cameFromApp = router.canGoBack(); // Configurações → tem voltar; onboarding → não
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
        <ScrollView contentContainerClassName="px-5 py-6 gap-7">
          {cameFromApp ? (
            <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP} className="self-start">
              <Icon name="back" size={24} color={colors.ink[900]} />
            </Pressable>
          ) : null}

          {/* anel-herói do total */}
          <View className="items-center gap-2 pt-2">
            <Text className="text-ink-500">Maturidade da sua empresa</Text>
            <ScoreRing value={shown.total} size={148} />
            <Text className="text-ink-400 text-xs">
              {shown.total >= 75 ? 'Empresa madura — hora de escalar' : shown.total >= 50 ? 'No caminho — há espaço claro pra crescer' : 'Começo de jornada — foque no essencial primeiro'}
            </Text>
          </View>

          {/* 4 anéis por área */}
          <View className="flex-row">
            {AREAS.map((a) => (
              <ScoreRing key={a} label={AREA_LABEL[a]} value={shown.scores[a]} />
            ))}
          </View>

          {shown.recommendations.length > 0 ? (
            <View className="gap-1">
              <Text className="text-ink-900 font-semibold text-lg pb-1">Onde focar primeiro</Text>
              {shown.recommendations.map((r) => (
                <View key={r.area} className="py-4 border-b border-surface-border gap-2.5">
                  <View className="flex-row items-center gap-2">
                    <Icon name={AREA_ICON[r.area]} set="light" size={18} color={colors.brand[500]} />
                    <Text className="text-brand-500 font-semibold">{AREA_LABEL[r.area]}</Text>
                    <Text className="text-ink-400 text-xs">· {r.score}/100</Text>
                  </View>
                  <Text className="text-ink-700 leading-5">{r.message}</Text>

                  {/* comunidades que casam com a área (recomendador dinâmico) */}
                  {(r.groups ?? []).map((g) => (
                    <Pressable
                      key={g.id}
                      onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.slug } })}
                      style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
                      className="flex-row items-center gap-2.5"
                    >
                      <View className="w-9 h-9 rounded-full bg-accent-50 items-center justify-center">
                        <Icon name="groups" set="light" size={18} color={colors.brand[500]} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-ink-900 font-semibold text-sm" numberOfLines={1}>{g.name}</Text>
                        <Text className="text-ink-400 text-xs">{g.memberCount.toLocaleString('pt-BR')} membros · comunidade</Text>
                      </View>
                      <Icon name="forward" set="light" size={16} color={colors.ink[400]} />
                    </Pressable>
                  ))}

                  {/* pessoas fortes na área (insights recebidos) pra seguir */}
                  {(r.people ?? []).map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => router.push({ pathname: '/user/[id]', params: { id: p.id } })}
                      style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
                      className="flex-row items-center gap-2.5"
                    >
                      <Avatar name={p.name} uri={p.avatarPath} size="sm" />
                      <View className="flex-1">
                        <Text className="text-ink-900 font-semibold text-sm" numberOfLines={1}>{p.name}</Text>
                        <Text className="text-ink-400 text-xs" numberOfLines={1}>@{p.handle}{p.roleTitle ? ` · ${p.roleTitle}` : ''} · referência na área</Text>
                      </View>
                      <Icon name="forward" set="light" size={16} color={colors.ink[400]} />
                    </Pressable>
                  ))}

                  {/* histórico salvo ANTES do recomendador dinâmico: só o slug */}
                  {!r.groups?.length && !r.people?.length && r.groupSlug ? (
                    <TextLink onPress={() => router.push({ pathname: '/group/[id]', params: { id: r.groupSlug! } })}>
                      Ver comunidade recomendada →
                    </TextLink>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <View className="py-4 border-b border-surface-border">
              <Text className="text-ink-700 leading-5">
                Parabéns! Sua empresa mostra boa maturidade em todas as áreas — use a comunidade pra ir além.
              </Text>
            </View>
          )}

          {cameFromApp ? (
            <Button title="Refazer diagnóstico" variant="accent" onPress={restart} />
          ) : (
            <View className="gap-3">
              <Button title="Entrar na comunidade" variant="accent" onPress={() => router.replace('/(tabs)/feed')} />
              <View className="items-center">
                <TextLink onPress={restart} tone="muted">Refazer diagnóstico</TextLink>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (loadingLatest && !redoing) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center" edges={['top', 'bottom']}>
        <ActivityIndicator color={colors.brand[500]} />
      </SafeAreaView>
    );
  }

  // ───── Wizard (4 passos, um por área) ─────
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      {/* topo: voltar (passo ou tela) + barra de progresso */}
      <View className="px-5 pt-3 gap-3">
        <View className="flex-row items-center gap-3">
          {step > 0 || router.canGoBack() ? (
            <Pressable onPress={() => (step > 0 ? setStep(step - 1) : router.back())} hitSlop={HIT_SLOP}>
              <Icon name="back" size={24} color={colors.ink[900]} />
            </Pressable>
          ) : null}
          <Text className="text-ink-400 text-xs font-semibold flex-1 text-right">Passo {step + 1} de {AREAS.length}</Text>
        </View>
        <View className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
          <View className="h-1.5 rounded-full bg-accent-500" style={{ width: `${Math.max(progress, 4)}%` }} />
        </View>
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 gap-6" keyboardShouldPersistTaps="handled">
        <View className="gap-1.5">
          <View className="flex-row items-center gap-2.5">
            <View className="w-11 h-11 rounded-full bg-accent-50 items-center justify-center">
              <Icon name={AREA_ICON[area]} set="light" size={22} color={colors.brand[500]} />
            </View>
            <View className="flex-1">
              <Text className="text-2xl font-extrabold text-ink-900">{AREA_LABEL[area]}</Text>
              <Text className="text-ink-500 text-[13px]">{AREA_INTRO[area]}</Text>
            </View>
          </View>
          <Text className="text-ink-400 text-xs pt-1">0 = discordo totalmente · 5 = concordo totalmente</Text>
        </View>

        {areaQuestions.map((q) => (
          <View key={q.index} className="gap-2.5">
            <Text className="text-ink-900 leading-5 font-medium">{q.text}</Text>
            <Scale value={answers[q.index] ?? null} onChange={(v) => setAnswers((p) => ({ ...p, [q.index]: v }))} />
          </View>
        ))}

        <Button
          title={step < AREAS.length - 1 ? 'Continuar' : 'Ver meu resultado'}
          variant="accent"
          disabled={!stepDone}
          loading={submit.isPending}
          onPress={() => (step < AREAS.length - 1 ? setStep(step + 1) : void onSubmit())}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
