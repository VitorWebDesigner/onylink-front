/** Áreas avaliadas pelo diagnóstico (espelha diagnostics.schema.ts do backend). */
export type DiagnosticArea = 'financeiro' | 'comercial' | 'marketing' | 'gestao';

export const AREA_LABEL: Record<DiagnosticArea, string> = {
  financeiro: 'Financeiro',
  comercial: 'Comercial',
  marketing: 'Marketing',
  gestao: 'Gestão',
};

export interface DiagnosticQuestion {
  area: DiagnosticArea;
  text: string;
}

/**
 * Banco de perguntas. Cada uma é respondida de 0 (discordo) a 5 (concordo).
 * O backend normaliza cada área para 0..100 (ver diagnostics.service).
 */
export const QUESTIONS: DiagnosticQuestion[] = [
  { area: 'financeiro', text: 'Acompanho meu fluxo de caixa toda semana.' },
  { area: 'financeiro', text: 'Sei exatamente minha margem de lucro por produto/serviço.' },
  { area: 'financeiro', text: 'Separo as finanças da empresa das pessoais.' },
  { area: 'comercial', text: 'Tenho um processo comercial definido (funil e etapas).' },
  { area: 'comercial', text: 'Faço follow-up consistente com leads e clientes.' },
  { area: 'comercial', text: 'Tenho metas de vendas claras e acompanhadas.' },
  { area: 'marketing', text: 'Meu posicionamento e público-alvo estão bem definidos.' },
  { area: 'marketing', text: 'Tenho um canal principal de aquisição funcionando.' },
  { area: 'marketing', text: 'Acompanho métricas de marketing (alcance, conversão).' },
  { area: 'gestao', text: 'Tenho indicadores (KPIs) que acompanho com frequência.' },
  { area: 'gestao', text: 'Consigo delegar e sair do operacional do dia a dia.' },
  { area: 'gestao', text: 'Minha equipe tem papéis e responsabilidades claros.' },
];

export interface DiagnosticRecommendation {
  area: DiagnosticArea;
  score: number;
  message: string;
  groupSlug: string;
}

export interface DiagnosticResult {
  scores: Record<DiagnosticArea, number>;
  total: number;
  recommendations: DiagnosticRecommendation[];
  recommendedGroups: string[];
}

export type DiagnosticAnswers = Record<DiagnosticArea, number[]>;
