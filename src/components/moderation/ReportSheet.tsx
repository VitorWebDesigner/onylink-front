import { Pressable, Text, View } from 'react-native';
import { afterSheetClose, BottomSheet, SheetHeader } from '../BottomSheet';
import { Icon } from '../Icon';
import { useDialog } from '../feedback/dialog';
import { useToast } from '../feedback/toast';
import { colors } from '../../theme/colors';
import { PRESSED_OPACITY } from '../../theme/tokens';
import { REPORT_REASONS, useReportContent, type ReportTargetType } from '../../features/moderation/hooks';

/**
 * Sheet de DENÚNCIA (post/comentário/usuário): motivos FIXOS (sem digitação
 * livre — padrão do app §13). Enviar fecha e agradece; re-denunciar o mesmo
 * alvo não duplica (dedupe no back).
 */
export function ReportSheet({ visible, targetType, targetId, onClose }: {
  visible: boolean;
  targetType: ReportTargetType;
  targetId: string | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const dialog = useDialog();
  const report = useReportContent();

  // toda ação tem CONFIRMAÇÃO + retorno via toast (pedido do dono)
  function send(reason: string) {
    if (!targetId) return;
    const id = targetId;
    onClose();
    void (async () => {
      await afterSheetClose(); // Dialog só depois do Modal do sheet desmontar (senão trava)
      const ok = await dialog.confirm({
        title: 'Enviar denúncia?',
        message: `Motivo: ${reason}. Nossa moderação vai revisar — a denúncia é anônima para o autor.`,
        confirmText: 'Denunciar',
        cancelText: 'Cancelar',
        destructive: true,
      });
      if (!ok) return;
      report.mutate(
        { targetType, targetId: id, reason },
        {
          onSuccess: () => toast.success('Denúncia recebida. Nossa moderação vai revisar.'),
          onError: () => toast.error('Não foi possível enviar a denúncia.'),
        },
      );
    })();
  }

  const label = targetType === 'POST' ? 'a publicação' : targetType === 'COMMENT' ? 'o comentário' : 'o perfil';

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="pb-3">
        <SheetHeader title="Denunciar" />
        <Text className="text-ink-500 text-[13px] px-4 pt-3 pb-1">
          Por que você está denunciando {label}? A denúncia é anônima para o autor.
        </Text>
        {REPORT_REASONS.map((r) => (
          <Pressable
            key={r}
            onPress={() => send(r)}
            style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
            className="flex-row items-center gap-3 px-4 py-4 border-b border-surface-border"
          >
            <Icon name="error" set="light" size={20} color={colors.ink[700]} />
            <Text className="text-ink-900 text-[15px] flex-1">{r}</Text>
            <Icon name="forward" set="light" size={16} color={colors.ink[400]} />
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}
