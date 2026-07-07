/** @type {import('tailwindcss').Config} */
// Tokens de design — ÚNICA fonte de verdade visual junto com spec-design.md.
// Paleta de marca OnyLink: navy (primária), lime (destaque), cinza, branco.
// Nunca improvise medida/cor solta no JSX: use estes tokens (ver CLAUDE.md §13).
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // brand = navy escuro (#0A1030). Botão primário, títulos, superfícies escuras.
        brand: {
          50: '#EEEFF4',
          100: '#D6D8E3',
          300: '#5B628A',
          500: '#0A1030',
          600: '#161C3D', // estado pressed em fundo navy (levemente mais claro)
          700: '#070B22',
        },
        // accent = lime (#C5D200). Destaque da marca: SEMPRE como preenchimento
        // com texto navy por cima (lime não tem contraste pra texto sobre branco).
        accent: {
          50: '#F6F8DC',
          300: '#DDE84D',
          500: '#C5D200',
          600: '#A9B500', // pressed
          700: '#8C9600',
        },
        ink: {
          900: '#0A1030', // títulos (navy)
          700: '#3A3F52', // corpo forte
          500: '#9B9B9B', // secundário (cinza da marca)
          400: '#B7B7BC', // placeholder / muted
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F4F5F6', // fundo de input / card sutil
          border: '#E6E7EA', // hairline 0.5–1dp
        },
        danger: '#E5484D',
        // semáforo de NOTA (anéis de maturidade): <40 low · 40–69 mid · ≥70 high
        score: { low: '#E5484D', mid: '#F5B301', high: '#1F9D55' },
      },
      // Raios por componente (spec-design.md §3). Use rounded-btn, rounded-input...
      borderRadius: {
        btn: '8px',
        input: '8px',
        search: '10px',
        card: '16px',
        sheet: '16px',
        modal: '14px',
        toast: '8px',
        pill: '9999px',
      },
      fontSize: {
        micro: ['11px', '14px'], // "há 2 h", labels mínimas (spec §2)
      },
    },
  },
  plugins: [],
};
