/**
 * Tokens numéricos de design (spec-design.md). Grade base 4dp, múltiplos de 8.
 * Use estes nomes em estilos JS (gap, padding, hitSlop) em vez de números soltos.
 */
export const space = {
  '2xs': 4, // gap ícone↔texto
  xs: 8, // interno apertado
  sm: 12, // chips, listas densas
  md: 16, // PADRÃO — margem lateral, padding de card
  lg: 24, // entre blocos/seções
  xl: 32, // respiro grande / topo
  '2xl': 48, // grandes seções
} as const;

export const radius = {
  btn: 8,
  input: 8,
  search: 10,
  card: 16,
  sheet: 16,
  modal: 14,
  toast: 8,
  pill: 9999,
} as const;

/** Touch target mínimo (spec §0): 44 iOS / 48 Android. Use 48 pra cobrir os dois. */
export const TOUCH = 48;

/** hitSlop padrão pra ampliar área tocável de ícones/links de 24dp até ~44dp. */
export const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 } as const;

/** Opacidade de estado pressionado (spec §18). */
export const PRESSED_OPACITY = 0.6;

/** Tamanho de ícone padrão (spec §4). */
export const ICON = 24;
