import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { useToast } from '../../components/feedback/toast';
import { useSubmitDiagnostic } from '../../features/diagnostic/hooks';
import {
  AREA_LABEL,
  QUESTIONS,
  type DiagnosticAnswers,
  type DiagnosticArea,
  type DiagnosticResult,
} from '../../features/diagnostic/types';

const SCALE = [0, 1, 2, 3, 4, 5];

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
            className={[
              'flex-1 h-10 rounded-card items-center justify-center border',
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

/** Barra de score 0..100 por área. */
function ScoreBar({ area, score }: { area: DiagnosticArea; score: number }) {
  const tone = score >= 60 ? 'bg-accent-500' : score >= 40 ? 'bg-accent-300' : 'bg-danger';
  return (
    <View className="gap-1">
      <View className="flex-row justify-between">
        <Text className="text-ink-700 font-medium">{AREA_LABEL[area]}</Text>
        <Text className="text-ink-500">{score}/100</Text>
      </View>
      <View className="h-2 rounded-full bg-surface-muted overflow-hidden">
        <View className={`h-2 rounded-full ${tone}`} style={{ width: `${Math.max(score, 3)}%` }} />
      </View>
    </View>
  );
}

export default function Diagnostic() {
  const router = useRouter();
  const toast = useToast();
  const submit = useSubmitDiagnostic();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const allAnswered = useMemo(
    () => QUESTIONS.every((_, i) => answers[i] !== undefined),
    [answers],
  );

  function setAnswer(index: number, value: number) {
    setAnswers((prev) => ({ ...prev, [index]: value }));
  }

  async function onSubmit() {
    // Agrupa respostas por área no formato que o backend espera.
    const grouped: DiagnosticAnswers = { financeiro: [], comercial: [], marketing: [], gestao: [] };
    QUESTIONS.forEach((q, i) => grouped[q.area].push(answers[i] ?? 0));
    try {
      const res = await submit.mutateAsync(grouped);
      setResult(res);
    } catch {
      toast.error('Não foi possível enviar o diagnóstico. Tente novamente.');
    }
  }

  // ----- Tela de resultado -----
  if (result) {
    const areas = Object.keys(result.scores) as DiagnosticArea[];
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
        <ScrollView contentContainerClassName="px-5 py-6 gap-6">
          <View className="gap-1">
            <Text className="text-ink-500">Maturidade da sua empresa</Text>
            <Text className="text-5xl font-extrabold text-brand-600">{result.total}<Text className="text-2xl text-ink-400">/100</Text></Text>
          </View>

          <View className="gap-4">
            {areas.map((area) => (
              <ScoreBar key={area} area={area} score={result.scores[area]} />
            ))}
          </View>

          {result.recommendations.length > 0 ? (
            <View className="gap-3">
              <Text className="text-ink-900 font-semibold text-lg">Onde focar primeiro</Text>
              {result.recommendations.map((r) => (
                <View key={r.area} className="py-4 border-b border-surface-border gap-1">
                  <Text className="text-brand-500 font-semibold">{AREA_LABEL[r.area]}</Text>
                  <Text className="text-ink-700 leading-5">{r.message}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View className="py-4 border-b border-surface-border">
              <Text className="text-ink-700 leading-5">Parabéns! Sua empresa mostra boa maturidade em todas as áreas.</Text>
            </View>
          )}

          <Button title="Entrar na comunidade" onPress={() => router.replace('/(tabs)/feed')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ----- Questionário -----
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <ScrollView contentContainerClassName="px-5 py-6 gap-6">
        <View className="gap-1">
          <Text className="text-2xl font-extrabold text-ink-900">Diagnóstico empresarial</Text>
          <Text className="text-ink-500">0 = discordo totalmente · 5 = concordo totalmente</Text>
        </View>

        {QUESTIONS.map((q, i) => (
          <View key={i} className="gap-2">
            <Text className="text-ink-400 text-xs uppercase tracking-wide">{AREA_LABEL[q.area]}</Text>
            <Text className="text-ink-900 leading-5">{q.text}</Text>
            <Scale value={answers[i] ?? null} onChange={(v) => setAnswer(i, v)} />
          </View>
        ))}

        <Button
          title={allAnswered ? 'Ver meu resultado' : 'Responda todas as perguntas'}
          onPress={onSubmit}
          disabled={!allAnswered}
          loading={submit.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
