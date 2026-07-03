import { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors } from '../theme/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '../theme/tokens';

interface Props {
  icon: IconName;
  active: boolean;
  activeColor: string;
  count: number;
  onPress?: () => void;
  size?: number;
  fontSize?: number;
  gap?: number;
  /** Cor quando inativo (default cinza; use branco sobre fundo escuro). */
  inactiveColor?: string;
  /** Empilha ícone em cima do número (barra vertical estilo Reels). */
  vertical?: boolean;
}

/**
 * Botão de reação com animação SUAVE (item 1): o ícone dá um "pop" (escala) ao
 * tocar e o número desliza/aparece sempre que muda — inclusive quando o contador
 * sobe por reação de OUTRO usuário (item 2). Ícone nunca preenche (set='light').
 */
export function AnimatedReaction({ icon, active, activeColor, count, onPress, size = 20, fontSize = 14, gap = 6, inactiveColor = colors.ink[500], vertical = false }: Props) {
  const color = active ? activeColor : inactiveColor;
  const scale = useRef(new Animated.Value(1)).current;
  const enter = useRef(new Animated.Value(1)).current; // animação do número ao mudar
  const prevCount = useRef(count);

  // pop do ícone quando o estado ativo muda (feedback do toque)
  const prevActive = useRef(active);
  useEffect(() => {
    if (prevActive.current !== active) {
      prevActive.current = active;
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.32, useNativeDriver: true, speed: 60, bounciness: 14 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 14 }),
      ]).start();
    }
  }, [active, scale]);

  // número sobe suavemente sempre que o valor muda (próprio ou de outro usuário)
  useEffect(() => {
    if (prevCount.current !== count) {
      prevCount.current = count;
      enter.setValue(0);
      Animated.timing(enter, { toValue: 1, duration: 240, useNativeDriver: true }).start();
    }
  }, [count, enter]);

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [7, 0] });

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={HIT_SLOP}
      style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
    >
      {/* layout em LINHA (número à direita) ou COLUNA (número embaixo, estilo Reels) */}
      <View style={{ flexDirection: vertical ? 'column' : 'row', alignItems: 'center', gap: vertical ? 3 : gap }}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Icon name={icon} set="light" size={size} color={color} />
        </Animated.View>
        {count > 0 ? (
          <Animated.Text style={{ color, fontSize, fontWeight: '500', opacity: enter, transform: [{ translateY }] }}>
            {count}
          </Animated.Text>
        ) : null}
      </View>
    </Pressable>
  );
}
