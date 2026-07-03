/** Listas pré-definidas de localização/segmento (o usuário ESCOLHE, não digita). */

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export const SEGMENTS = [
  'Agronegócio', 'Alimentação', 'Automotivo', 'Beleza e Estética', 'Construção',
  'Consultoria', 'Contabilidade', 'E-commerce', 'Educação', 'Energia', 'Eventos',
  'Financeiro', 'Imobiliário', 'Indústria', 'Jurídico', 'Logística',
  'Marketing e Publicidade', 'Moda', 'Saúde', 'Serviços', 'Tecnologia',
  'Turismo', 'Varejo', 'Outro',
] as const;

/** Municípios do IBGE por UF (API pública, ordenados por nome). */
export async function fetchCities(uf: string): Promise<string[]> {
  const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
  if (!res.ok) throw new Error('Não foi possível carregar as cidades.');
  const data = (await res.json()) as { nome: string }[];
  return data.map((m) => m.nome);
}
