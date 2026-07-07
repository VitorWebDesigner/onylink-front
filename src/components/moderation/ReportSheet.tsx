import { Pressable, Text, View } from 'react-native';
import { afterSheetClose, BottomSheet, SheetHeader } from '../BottomSheet';
import { Icon } from '../Icon';
import { useDialog } from '../feedback/dialog';
import { useToast } from '../feedback/toast';
import { colors } from '../../theme/colors';
import { PRESSED_OPACITY } from '../../theme/tokens';
import { REPORT_REASONS, useReportContent, type ReportTargetType } from '../../features/moderation/hooks';

/**
 * CONTEÚDO do passo de denúncia (motivos fixos) — renderizado DENTRO do sheet
 * que já está aberto (troca de conteúdo, NUNCA um segundo Modal: montar um
 * Modal durante o dismiss de outro deixava a tela travada — caso real no feed).
 */
export function ReportReasons({ targetLabel, onPick }: {
  targetLabel: string;
  onPick: (reason: string) => void;
}) {
  return (
    <View className="pb-3">
      <SheetHeader title="Denunciar" />
      <Text className="text-ink-500 text-[13px] px-4 pt-3 pb-1">
        Por que você está denunciando {targetLabel}? A denúncia é anônima para o autor.
      </Text>
      {REPORT_REASONS.map((r) => (
        <Pressable
          key={r}
          onPress={() => onPick(r)}
          style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
          className="flex-row items-center gap-3 px-4 py-4 border-b border-surface-border"
        >
          <Icon name="error" set="light" size={20} color={colors.ink[700]} />
          <Text className="text-ink-900 text-[15px] flex-1">{r}</Text>
          <Icon name="forward" set="light" size={16} color={colors.ink[400]} />
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Fluxo completo pós-escolha do motivo: espera o sheet desmontar →
 * CONFIRMAÇÃO (Dialog) → envia → toast de sucesso/erro. Chame DEPOIS de
 * fechar o sheet que mostrou os motivos.
 */
export function useSendReport() {
  const toast = useToast();
  const dialog = useDialog();
  const report = useReportContent();

  return async (targetType: ReportTargetType, targetId: string, reason: string): Promise<void> => {
    await afterSheetClose(); // Dialog só depois do Modal do sheet desmontar
    const ok = await dialog.confirm({
      title: 'Enviar denúncia?',
      message: `Motivo: ${reason}. Nossa moderação vai revisar — a denúncia é anônima para o autor.`,
      confirmText: 'Denunciar',
      cancelText: 'Cancelar',
      destructive: true,
    });
    if (!ok) return;
    report.mutate(
      { targetType, targetId, reason },
      {
        onSuccess: () => toast.success('Denúncia recebida. Nossa moderação vai revisar.'),
        onError: () => toast.error('Não foi possível enviar a denúncia.'),
      },
    );
  };
}

/** Sheet standalone de denúncia (quando NÃO há outro sheet aberto antes). */
export function ReportSheet({ visible, targetType, targetId, onClose }: {
  visible: boolean;
  targetType: ReportTargetType;
  targetId: string | null;
  onClose: () => void;
}) {
  const sendReport = useSendReport();
  const label = targetType === 'POST' ? 'a publicação' : targetType === 'COMMENT' ? 'o comentário' : 'o perfil';
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ReportReasons
        targetLabel={label}
        onPick={(reason) => {
          const id = targetId;
          onClose();
          if (id) void sendReport(targetType, id, reason);
        }}
      />
    </BottomSheet>
  );
}
