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
import { ReportSheet } from './ReportSheet';
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

/**
 * Menu dos 3-PONTOS do post (feed geral, detalhe, comunidade): Denunciar
 * publicação/autor (todos) · Excluir (só o autor). Sheets em SEQUÊNCIA
 * (Modal dentro de Modal não apresenta — §13).
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
  const [report, setReport] = useState<{ type: ReportTargetType; id: string } | null>(null);

  const isAuthor = !!post?.authorId && post.authorId === me?.id;

  // sheet de denúncia abre DEPOIS do menu fechar (sequencial — §13)
  const openReport = (type: ReportTargetType, id: string) => {
    onClose();
    setTimeout(() => setReport({ type, id }), 250);
  };

  async function onDelete() {
    if (!post) return;
    onClose();
    await afterSheetClose(); // Dialog só após o sheet desmontar (senão trava a tela)
    const ok = await dialog.confirm({
      title: 'Excluir publicação?',
      message: 'Ela some do feed para todo mundo. Essa ação não tem volta.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      destructive: true,
    });
    if (ok) deletePost.mutate(post.id, {
      onSuccess: () => { toast.success('Publicação excluída.'); onDeleted?.(); },
      onError: () => toast.error('Não foi possível excluir.'),
    });
  }

  return (
    <>
      <BottomSheet visible={!!post} onClose={onClose}>
        <View className="pb-2">
          {(extraRows ?? []).map((r) => (
            <Row key={r.label} icon={r.icon} label={r.label} onPress={() => { onClose(); r.onPress(); }} />
          ))}
          {!isAuthor && post ? (
            <>
              <Row icon="error" label="Denunciar publicação" onPress={() => openReport('POST', post.id)} />
              {post.authorId ? (
                <Row icon="user" label={`Denunciar ${post.authorName}`} onPress={() => openReport('USER', post.authorId!)} />
              ) : null}
            </>
          ) : null}
          {isAuthor ? <Row icon="trash" label="Excluir publicação" danger onPress={() => void onDelete()} /> : null}
        </View>
      </BottomSheet>

      <ReportSheet
        visible={!!report}
        targetType={report?.type ?? 'POST'}
        targetId={report?.id ?? null}
        onClose={() => setReport(null)}
      />
    </>
  );
}
