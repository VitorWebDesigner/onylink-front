import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, scoreColor } from '../theme/colors';

/**
 * Anel de nota 0–100 (pedido do dono: círculos, não barras). Única primitiva —
 * Painel do Empresário e resultado do Diagnóstico usam a MESMA. `size` grande
 * (ex. 148) vira o anel-herói do total. Cor = SEMÁFORO da nota (pedido do
 * dono): <40 vermelho · 40–69 amarelo · ≥70 verde.
 */
export function ScoreRing({ label, value, size = 68, strokeWidth }: {
  label?: string;
  value: number | null;
  size?: number;
  strokeWidth?: number;
}) {
  const sw = strokeWidth ?? Math.max(6, Math.round(size * 0.09));
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <View className="items-center gap-1.5" style={label ? { flex: 1 } : undefined}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surface.border} strokeWidth={sw} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={scoreColor(value)}
            strokeWidth={sw}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c}`}
            strokeDashoffset={c * (1 - v / 100)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-ink-900 font-extrabold" style={{ fontSize: Math.max(16, size * 0.24) }}>
            {value ?? '—'}
          </Text>
        </View>
      </View>
      {label ? <Text className="text-ink-500 text-xs">{label}</Text> : null}
    </View>
  );
}
