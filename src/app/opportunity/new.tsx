import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { TextLink } from '../../components/TextLink';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/feedback/toast';
import { colors } from '../../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../../theme/tokens';
import { useCreateOpportunity } from '../../features/opportunities/hooks';
import { OPPORTUNITY_KINDS, type ApplicationQuestion, type OpportunityKind } from '../../features/opportunities/types';

export default function NewOpportunity() {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateOpportunity();
  const [kind, setKind] = useState<OpportunityKind | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [segment, setSegment] = useState('');
  const [questions, setQuestions] = useState<ApplicationQuestion[]>([]);

  const canSubmit = !!kind && title.trim().length >= 3;

  function addQuestion() {
    setQuestions((q) => [...q, { id: `q${Date.now()}${q.length}`, label: '', required: false }]);
  }
  function setLabel(id: string, label: string) {
    setQuestions((q) => q.map((it) => (it.id === id ? { ...it, label } : it)));
  }
  function toggleReq(id: string) {
    setQuestions((q) => q.map((it) => (it.id === id ? { ...it, required: !it.required } : it)));
  }
  function removeQuestion(id: string) {
    setQuestions((q) => q.filter((it) => it.id !== id));
  }

  async function onSubmit() {
    if (!kind || !canSubmit) return;
    const applicationForm = questions
      .filter((q) => q.label.trim())
      .map((q) => ({ id: q.id, label: q.label.trim(), required: !!q.required }));
    try {
      await create.mutateAsync({
        kind,
        title: title.trim(),
        description: description.trim() || undefined,
        city: city.trim() || undefined,
        segment: segment.trim() || undefined,
        applicationForm,
      });
      toast.success('Oportunidade publicada!');
      router.back();
    } catch {
      toast.error('Não foi possível publicar. Tente novamente.');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-surface-border">
        <TextLink onPress={() => router.back()} tone="muted">Cancelar</TextLink>
        <Text className="text-ink-900 font-semibold text-base">Nova oportunidade</Text>
        <View className="w-16" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 24 }} keyboardShouldPersistTaps="handled">
        <View className="gap-3">
          <Text className="text-ink-700 text-sm font-semibold">Tipo</Text>
          <View className="flex-row flex-wrap gap-2">
            {OPPORTUNITY_KINDS.map((k) => (
              <Chip key={k.kind} label={k.label} selected={kind === k.kind} onPress={() => setKind(k.kind)} />
            ))}
          </View>
        </View>

        <Input label="Título" value={title} onChangeText={setTitle} placeholder="Ex.: Vaga de vendedor B2B" maxLength={160} />

        <View className="gap-1.5">
          <Text className="text-ink-700 text-sm font-semibold">Descrição</Text>
          <TextInput
            multiline value={description} onChangeText={setDescription}
            placeholder="Detalhe o que você precisa ou oferece..."
            placeholderTextColor={colors.ink[400]} maxLength={2000}
            className="min-h-32 rounded-input px-4 py-3 bg-surface-muted text-ink-900 border border-surface-border"
            style={{ textAlignVertical: 'top' }}
          />
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1"><Input label="Cidade" value={city} onChangeText={setCity} placeholder="Fortaleza · CE" maxLength={120} /></View>
          <View className="flex-1"><Input label="Segmento" value={segment} onChangeText={setSegment} placeholder="Varejo" maxLength={120} /></View>
        </View>

        {/* Form-builder: perguntas que o candidato vai responder */}
        <View className="gap-3 pt-2 border-t border-surface-border">
          <Text className="text-ink-700 text-sm font-semibold">Formulário de candidatura (opcional)</Text>
          <Text className="text-ink-400 text-xs">Perguntas que o candidato responde ao se candidatar.</Text>
          {questions.map((q, i) => (
            <View key={q.id} className="gap-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-ink-400 text-xs w-5">{i + 1}.</Text>
                <View className="flex-1">
                  <TextInput
                    value={q.label} onChangeText={(v) => setLabel(q.id, v)}
                    placeholder="Sua pergunta" placeholderTextColor={colors.ink[400]} maxLength={160}
                    className="h-11 rounded-input px-3 bg-surface-muted text-ink-900 border border-surface-border"
                  />
                </View>
                <Pressable onPress={() => removeQuestion(q.id)} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
                  <Icon name="error" set="light" size={22} color={colors.ink[400]} />
                </Pressable>
              </View>
              <Pressable onPress={() => toggleReq(q.id)} className="flex-row items-center gap-2 pl-7" hitSlop={HIT_SLOP}>
                <View className={['w-5 h-5 rounded items-center justify-center border', q.required ? 'bg-accent-500 border-accent-500' : 'border-surface-border'].join(' ')}>
                  {q.required ? <Icon name="success" set="bold" size={14} color={colors.brand[500]} /> : null}
                </View>
                <Text className="text-ink-500 text-[13px]">Obrigatória</Text>
              </Pressable>
            </View>
          ))}
          <Pressable onPress={addQuestion} className="flex-row items-center gap-2 self-start" hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
            <Icon name="plus" set="light" size={20} color={colors.brand[500]} />
            <Text className="text-brand-500 font-semibold text-sm">Adicionar pergunta</Text>
          </Pressable>
        </View>

        <Button title="Publicar oportunidade" variant="accent" onPress={onSubmit} disabled={!canSubmit} loading={create.isPending} />
      </ScrollView>
    </SafeAreaView>
  );
}
