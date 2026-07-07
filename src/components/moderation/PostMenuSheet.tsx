import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { afterSheetClose, BottomSheet } from '../BottomSheet';
import { Icon, type IconName } from '../Icon';
import { useDialog } from '../feedback/dialog';
import { useToast } from '../feedback/toast';
import { colors } from '../../theme/colors';
import { PRESSED_OPACITY } from '../../theme/tokens';
import { useAuth } from '../../store/auth';
import { useDeletePost } from '../../features/feed/hooks';
import { ReportReasons, useSendReport } from './ReportSheet';
import type { FeedPost } from '../../features/feed/types';
import type { ReportTargetType } from '../../features/moderation/hooks';

function Row({ icon, label, danger, onPress }: { icon: IconName; label: string; danger?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })} className="flex-row items-center gap-3 px-4 py-4 border-b border-surface-border">
      <Icon name={icon} set="light" size={20} color={danger ? colors.danger : colors.ink[700]} />
      <Text className={['text-[15px] flex-1', danger ? 'text-danger font-semibold' : 'text-ink-900'].join(' ')}>{label}</Text>
    </Pressable>
  );
}

interface ReportStep { type: ReportTargetType; id: string; label: string }

/**
 * Menu dos 3-PONTOS do post (feed geral, detalhe, comunidade, abas do perfil).
 * Denunciar troca o CONTEÚDO do MESMO sheet pros motivos (passo 2) — nunca um
 * segundo Modal (montar Modal durante o dismiss de outro travava a tela).
 */
export function PostMenuSheet({ post, onClose, onDeleted, extraRows }: {
  post: FeedPost | null;
  onClose: () => void;
  /** Chamado após excluir (ex.: detalhe volta pra trás). */
  onDeleted?: () => void;
  /** Linhas extras do contexto (ex.: destacar no feed — admin da comunidade). */
  extraRows?: { icon: IconName; label: string; onPress: () => void }[];
}) {
  const toast = useToast();
  const dialog = useDialog();
  const me = useAuth((s) => s.user);
  const deletePost = useDeletePost();
  const sendReport = useSendReport();
  const [reportStep, setReportStep] = useState<ReportStep | null>(null);

  const isAuthor = !!post?.authorId && post.authorId === me?.id;

  const close = () => {
    setReportStep(null);
    onClose();
  };

  async function onDelete() {
    if (!post) return;
    const id = post.id;
    close();
    await afterSheetClose(); // Dialog só após o sheet desmontar (senão trava a tela)
    const ok = await dialog.confirm({
      title: 'Excluir publicação?',
      message: 'Ela some do feed para todo mundo. Essa ação não tem volta.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      destructive: true,
    });
    if (ok) deletePost.mutate(id, {
      onSuccess: () => { toast.success('Publicação excluída.'); onDeleted?.(); },
      onError: () => toast.error('Não foi possível excluir.'),
    });
  }

  return (
    <BottomSheet visible={!!post} onClose={close}>
      {reportStep ? (
        // passo 2: motivos — MESMO sheet, só troca o conteúdo
        <ReportReasons
          targetLabel={reportStep.label}
          onPick={(reason) => {
            const s = reportStep;
            close();
            void sendReport(s.type, s.id, reason);
          }}
        />
      ) : (
        <View className="pb-2">
          {(extraRows ?? []).map((r) => (
            <Row key={r.label} icon={r.icon} label={r.label} onPress={() => { close(); r.onPress(); }} />
          ))}
          {!isAuthor && post ? (
            <>
              <Row icon="error" label="Denunciar publicação" onPress={() => setReportStep({ type: 'POST', id: post.id, label: 'a publicação' })} />
              {post.authorId ? (
                <Row icon="user" label={`Denunciar ${post.authorName}`} onPress={() => setReportStep({ type: 'USER', id: post.authorId!, label: 'o perfil' })} />
              ) : null}
            </>
          ) : null}
          {isAuthor ? <Row icon="trash" label="Excluir publicação" danger onPress={() => void onDelete()} /> : null}
        </View>
      )}
    </BottomSheet>
  );
}
