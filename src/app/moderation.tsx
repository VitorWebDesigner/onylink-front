import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BottomSheet } from '../components/BottomSheet';
import { EmptyState } from '../components/EmptyState';
import { Icon, type IconName } from '../components/Icon';
import { useDialog } from '../components/feedback/dialog';
import { useToast } from '../components/feedback/toast';
import { colors } from '../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../theme/tokens';
import { timeAgo } from '../lib/time';
import { useReports, useResolveReport, type ModerationReport, type ResolveAction } from '../features/moderation/hooks';

const TYPE_LABEL: Record<string, string> = { POST: 'PUBLICAÇÃO', COMMENT: 'COMENTÁRIO', USER: 'PERFIL', MESSAGE: 'MENSAGEM' };

function ActionRow({ icon, label, danger, onPress }: { icon: IconName; label: string; danger?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-row items-center gap-3 px-4 py-4 border-b border-surface-border">
      <Icon name={icon} set="light" size={20} color={danger ? colors.danger : colors.ink[700]} />
      <Text className={['text-[15px] flex-1', danger ? 'text-danger font-semibold' : 'text-ink-900'].join(' ')}>{label}</Text>
    </Pressable>
  );
}

/**
 * MODERAÇÃO (só ADMIN — o back barra os demais): fila de denúncias abertas com
 * contexto (preview, autor, quantas denúncias o alvo acumula) e ações que
 * APLICAM no alvo: descartar · remover conteúdo · suspender 7d · banir.
 */
export default function ModerationScreen() {
  const router = useRouter();
  const toast = useToast();
  const dialog = useDialog();
  const { data: reports, isLoading, refetch, isRefetching } = useReports('OPEN');
  const resolve = useResolveReport();
  const [target, setTarget] = useState<ModerationReport | null>(null);

  async function act(r: ModerationReport, action: ResolveAction | 'DISMISS') {
    setTarget(null);
    const conf: Record<string, { title: string; message: string; confirmText: string } | null> = {
      DISMISS: null,
      REMOVE: { title: 'Remover conteúdo?', message: 'O conteúdo denunciado some do app para todo mundo.', confirmText: 'Remover' },
      SUSPEND: { title: 'Suspender autor por 7 dias?', message: `${r.offenderName ?? 'O autor'} não conseguirá entrar no app até lá.`, confirmText: 'Suspender' },
      BAN: { title: 'Banir autor?', message: `${r.offenderName ?? 'O autor'} perde o acesso à conta DEFINITIVAMENTE.`, confirmText: 'Banir' },
    };
    const c = conf[action];
    if (c) {
      const ok = await dialog.confirm({ ...c, cancelText: 'Cancelar', destructive: true });
      if (!ok) return;
    }
    resolve.mutate({ reportId: r.id, action }, {
      onSuccess: () => toast.success(action === 'DISMISS' ? 'Denúncia descartada.' : 'Ação aplicada.'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Não foi possível resolver.'),
    });
  }

  function openTarget(r: ModerationReport) {
    if (r.targetType === 'POST') router.push({ pathname: '/post/[id]', params: { id: r.targetId } });
    else if (r.targetType === 'USER' && r.offenderId) router.push({ pathname: '/user/[id]', params: { id: r.offenderId } });
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border">
        <Pressable onPress={() => router.back()} hitSlop={HIT_SLOP}>
          <Icon name="back" size={24} color={colors.ink[900]} />
        </Pressable>
        <Text className="text-ink-900 font-semibold text-base flex-1">Moderação</Text>
        {reports?.length ? <Text className="text-ink-400 text-xs">{reports.length} aberta{reports.length > 1 ? 's' : ''}</Text> : null}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.brand[500]} /></View>
      ) : (
        <FlatList
          data={reports ?? []}
          keyExtractor={(r) => r.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.brand[500]} />}
          renderItem={({ item: r }) => (
            <Pressable
              onPress={() => setTarget(r)}
              style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
              className="px-4 py-4 border-b border-surface-border gap-1.5"
            >
              <View className="flex-row items-center gap-2">
                <View className="rounded-pill px-2 py-0.5 bg-surface-muted border border-surface-border">
                  <Text className="text-ink-700 text-[10px] font-bold">{TYPE_LABEL[r.targetType] ?? r.targetType}</Text>
                </View>
                {r.reportCount > 1 ? (
                  <View className="rounded-pill px-2 py-0.5 bg-danger">
                    <Text className="text-white text-[10px] font-bold">{r.reportCount} denúncias</Text>
                  </View>
                ) : null}
                <View className="flex-1" />
                <Text className="text-ink-400 text-micro">{timeAgo(r.createdAt)}</Text>
              </View>
              {r.targetPreview ? <Text className="text-ink-900 leading-5" numberOfLines={2}>{r.targetPreview}</Text> : null}
              <Text className="text-ink-500 text-[13px]" numberOfLines={1}>
                {r.offenderName ? `por ${r.offenderName}${r.offenderHandle ? ` @${r.offenderHandle}` : ''} · ` : ''}motivo: {r.reason}
              </Text>
              {r.postStatus === 'REJECTED' ? <Text className="text-danger text-xs font-semibold">conteúdo já removido</Text> : null}
            </Pressable>
          )}
          ListEmptyComponent={
            <View className="pt-24">
              <EmptyState icon="success" title="Fila limpa" subtitle="Nenhuma denúncia aberta no momento." />
            </View>
          }
        />
      )}

      {/* ações sobre a denúncia */}
      <BottomSheet visible={!!target} onClose={() => setTarget(null)}>
        <View className="pb-2">
          {target && (target.targetType === 'POST' || target.targetType === 'USER') ? (
            <ActionRow icon="eye" label={target.targetType === 'POST' ? 'Ver publicação' : 'Ver perfil'} onPress={() => { const r = target; setTarget(null); openTarget(r); }} />
          ) : null}
          {target ? <ActionRow icon="success" label="Descartar denúncia" onPress={() => void act(target, 'DISMISS')} /> : null}
          {target && target.targetType !== 'USER' ? (
            <ActionRow icon="trash" label="Remover conteúdo" danger onPress={() => void act(target, 'REMOVE')} />
          ) : null}
          {target ? <ActionRow icon="error" label="Suspender autor (7 dias)" danger onPress={() => void act(target, 'SUSPEND')} /> : null}
          {target ? <ActionRow icon="close" label="Banir autor" danger onPress={() => void act(target, 'BAN')} /> : null}
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
