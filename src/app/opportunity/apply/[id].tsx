import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '../../../components/Button';
import { Icon } from '../../../components/Icon';
import { EmptyState } from '../../../components/EmptyState';
import { useToast } from '../../../components/feedback/toast';
import { colors } from '../../../theme/colors';
import { HIT_SLOP } from '../../../theme/tokens';
import { useApply, useOpportunity } from '../../../features/opportunities/hooks';

export default function ApplyOpportunity() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data: o } = useOpportunity(id);
  const apply = useApply(id);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const form = o?.applicationForm ?? [];

  function onSubmit() {
    const missing = form.find((q) => q.required && !(answers[q.id] ?? '').trim());
    if (missing) {
      toast.error(`Responda: ${missing.label}`);
      return;
    }
    const payload = form.map((q) => ({ label: q.label, answer: (answers[q.id] ?? '').trim() }));
    apply.mutate(payload, {
      onSuccess: () => {
        toast.success('Candidatura enviada! O autor vai receber.');
        router.back();
      },
      onError: () => toast.error('Não foi possível enviar. Tente novamente.'),
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border">
        <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP}>
          <Icon name="back" size={24} color={colors.ink[900]} />
        </Pressable>
        <Text className="text-ink-900 font-semibold text-base">Candidatar-se</Text>
      </View>

      {!o ? (
        <View className="flex-1 items-center justify-center"><EmptyState icon="work" title="Oportunidade não encontrada" /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }} keyboardShouldPersistTaps="handled">
          <View className="gap-1">
            <Text className="text-ink-400 text-[13px]">Candidatura para</Text>
            <Text className="text-ink-900 font-extrabold text-lg leading-6">{o.title}</Text>
          </View>

          {form.length === 0 ? (
            <Text className="text-ink-500 leading-5">Esta oportunidade não tem formulário. Confirme seu interesse abaixo e o autor receberá seu contato.</Text>
          ) : (
            form.map((q) => (
              <View key={q.id} className="gap-1.5">
                <Text className="text-ink-700 text-sm font-semibold">
                  {q.label}{q.required ? <Text className="text-danger"> *</Text> : null}
                </Text>
                <TextInput
                  multiline
                  value={answers[q.id] ?? ''}
                  onChangeText={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                  placeholder="Sua resposta"
                  placeholderTextColor={colors.ink[400]}
                  maxLength={2000}
                  className="min-h-20 rounded-input px-4 py-3 bg-surface-muted text-ink-900 border border-surface-border"
                  style={{ textAlignVertical: 'top' }}
                />
              </View>
            ))
          )}

          <Button title="Enviar candidatura" variant="accent" onPress={onSubmit} loading={apply.isPending} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
