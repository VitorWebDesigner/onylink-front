/**
 * Espelho JS da paleta do tailwind.config.js — use em props que NÃO aceitam
 * className (ActivityIndicator color, tabBar tint, placeholderTextColor, ícones).
 * Fonte de verdade da identidade visual: navy + lime + cinza + branco.
 */
export const colors = {
  brand: { 50: '#EEEFF4', 100: '#D6D8E3', 300: '#5B628A', 500: '#0A1030', 600: '#161C3D', 700: '#070B22' },
  accent: { 50: '#F6F8DC', 300: '#DDE84D', 500: '#C5D200', 600: '#A9B500', 700: '#8C9600' },
  ink: { 900: '#0A1030', 700: '#3A3F52', 500: '#9B9B9B', 400: '#B7B7BC' },
  surface: { white: '#FFFFFF', muted: '#F4F5F6', border: '#E6E7EA' },
  danger: '#E5484D',
  // Cor de cada ação do post quando ativa. SÓ insight (amarelo) e curtir (vermelho)
  // têm cor própria; comentar/repostar/enviar ficam NEUTROS (cinza escuro).
  action: { insight: '#F5B301', like: '#E5484D', comment: '#3A3F52', repost: '#3A3F52', send: '#3A3F52' },
} as const;
