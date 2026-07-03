import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { colors } from '../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../theme/tokens';

interface Props {
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  pending?: boolean;
  avatarName?: string | null;
  avatarUri?: string | null;
  placeholder?: string;
  replyingToName?: string | null;
  onCancelReply?: () => void;
  /** Anexos (imagem/sticker/gif/expandir) — futuro; screens podem exibir um toast. */
  onAttach?: (kind: 'image' | 'sticker' | 'gif' | 'expand') => void;
  /** Abre já com o teclado (fluxo "tocar em comentar"). */
  autoFocus?: boolean;
}

/**
 * Barra de comentário FLUTUANTE estilo Threads (item #2): pill arredondado com
 * sombra, SEM borda-top separando a seção — flutua acima do conteúdo. Avatar à
 * esquerda; quando vazio mostra os ícones de mídia (imagem/sticker/gif/expandir),
 * quando há texto mostra o botão enviar. Chip "Respondendo a X" acima do pill.
 */
export function CommentComposer({
  value, onChangeText, onSend, pending, avatarName, avatarUri,
  placeholder = 'Adicione um comentário...', replyingToName, onCancelReply, onAttach, autoFocus,
}: Props) {
  const hasText = !!value.trim();
  const canSend = hasText && !pending;

  const MediaIcon = ({ name, kind }: { name: 'image' | 'sticker' | 'expand'; kind: 'image' | 'sticker' | 'expand' }) => (
    <Pressable onPress={() => onAttach?.(kind)} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
      <Icon name={name} set="light" size={20} color={colors.ink[400]} />
    </Pressable>
  );

  return (
    <View className="px-3 pb-3 pt-2 bg-surface">
      {replyingToName ? (
        <View className="flex-row items-center gap-2 px-3 pb-2">
          <Icon name="reply" size={14} color={colors.ink[400]} />
          <Text className="text-ink-500 text-xs flex-1">Respondendo a <Text className="font-semibold text-ink-700">{replyingToName}</Text></Text>
          <Pressable onPress={onCancelReply} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
            <Icon name="close" size={16} color={colors.ink[400]} />
          </Pressable>
        </View>
      ) : null}

      {/* pill flutuante (sem sombra) */}
      <View
        className="flex-row items-center gap-2 bg-surface-muted rounded-full border border-surface-border pl-2 pr-1.5"
        style={{ minHeight: 48 }}
      >
        <Avatar name={avatarName} uri={avatarUri} size="sm" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.ink[400]}
          className="flex-1 text-ink-900 py-2"
          multiline
          autoFocus={autoFocus}
          onSubmitEditing={onSend}
          returnKeyType="send"
          blurOnSubmit
        />

        {canSend || pending ? (
          <Pressable
            onPress={onSend}
            disabled={!canSend}
            hitSlop={HIT_SLOP}
            style={({ pressed }) => ({ opacity: pressed || !canSend ? PRESSED_OPACITY : 1 })}
            className="w-9 h-9 rounded-full bg-accent-500 items-center justify-center"
          >
            {pending ? <ActivityIndicator size="small" color={colors.brand[500]} /> : <Icon name="send" size={18} color={colors.brand[500]} />}
          </Pressable>
        ) : (
          <View className="flex-row items-center gap-3 pr-1.5">
            <MediaIcon name="image" kind="image" />
            <MediaIcon name="sticker" kind="sticker" />
            <Pressable onPress={() => onAttach?.('gif')} hitSlop={HIT_SLOP} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
              <Text className="text-ink-400 text-[11px] font-extrabold tracking-tight">GIF</Text>
            </Pressable>
            <MediaIcon name="expand" kind="expand" />
          </View>
        )}
      </View>
    </View>
  );
}
