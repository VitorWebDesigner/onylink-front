import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { BottomSheet, SheetScrollView } from './BottomSheet';
import { Icon } from './Icon';
import { colors } from '../theme/colors';
import { PRESSED_OPACITY } from '../theme/tokens';

/**
 * Sheet genérico de SELEÇÃO em lista (UF, cidade, segmento...): busca no topo,
 * opções roláveis, check na selecionada. O usuário escolhe — nunca digita valor livre.
 */
export function SelectSheet({ visible, onClose, title, options, selected, onSelect, loading, searchable = true }: {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: string[];
  selected?: string | null;
  onSelect: (value: string) => void;
  loading?: boolean;
  searchable?: boolean;
}) {
  const [q, setQ] = useState('');
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const filtered = useMemo(() => (q.trim() ? options.filter((o) => norm(o).includes(norm(q))) : options), [q, options]);

  return (
    <BottomSheet visible={visible} onClose={() => { setQ(''); onClose(); }} fullHeight>
      <View className="flex-1">
        <Text className="text-ink-900 text-lg font-extrabold text-center pb-3">{title}</Text>
        {searchable ? (
          <View className="px-4 pb-3">
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Buscar…"
              placeholderTextColor={colors.ink[400]}
              className="h-11 rounded-input px-4 bg-surface-muted text-ink-900 border border-surface-border"
            />
          </View>
        ) : null}
        {loading ? (
          <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.brand[500]} /></View>
        ) : (
          <SheetScrollView className="flex-1" keyboardShouldPersistTaps="handled">
            {filtered.map((o) => (
              <Pressable
                key={o}
                onPress={() => { setQ(''); onSelect(o); onClose(); }}
                style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
                className="flex-row items-center justify-between px-4 py-3.5 border-b border-surface-border"
              >
                <Text className={o === selected ? 'text-ink-900 font-bold' : 'text-ink-700'}>{o}</Text>
                {o === selected ? <Icon name="success" set="bold" size={18} color={colors.brand[500]} /> : null}
              </Pressable>
            ))}
            {!filtered.length ? <Text className="text-ink-500 text-center py-8">Nada encontrado.</Text> : null}
          </SheetScrollView>
        )}
      </View>
    </BottomSheet>
  );
}
