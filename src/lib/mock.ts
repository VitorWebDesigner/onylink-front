import type { SessionUser } from '../store/auth';
import type { FeedPost } from '../features/feed/types';
import type { Comment } from '../features/comments/types';
import type { Group } from '../features/groups/types';
import type { Opportunity } from '../features/opportunities/types';

/**
 * Dados de demonstração para rodar o app SEM backend (flag EXPO_PUBLIC_MOCK=1).
 * Some quando o backend estiver no ar — ver config.mock. NÃO usar em produção.
 */
export const mockUser: SessionUser = {
  id: 'mock-user',
  name: 'Vitor Moura',
  email: 'vitor@goxtechub.com',
  handle: 'vitormoura',
  role: 'USER',
};

export const mockFeed: FeedPost[] = [
  {
    id: 'm1',
    category: 'Gestão',
    content: 'Implementamos reunião semanal de 15min com indicadores na parede. Em 2 meses o time parou de apagar incêndio e começou a antecipar problema.',
    authorName: 'Ana Ribeiro',
    authorRoleTitle: 'CEO · Construtora Ribeiro',
    likeCount: 42,
    commentCount: 7,
    repostCount: 5,
    shareCount: 3,
    insightCount: 24,
    viewCount: 320, media: [],
    authorFollowed: false,
    subscribed: false,
    liked: true,
    reposted: false,
    shared: false,
    insighted: true,
    createdAt: '2026-06-26T12:00:00.000Z',
  },
  {
    id: 'm2',
    category: 'Vendas',
    content: 'Dica que dobrou minha taxa de fechamento: parar de mandar proposta por e-mail e apresentar ao vivo, mesmo que rápido. Objeção morre na hora.',
    authorName: 'Carlos Pena',
    authorRoleTitle: 'Sócio · Pena Seguros',
    likeCount: 88,
    commentCount: 19,
    repostCount: 12,
    shareCount: 8,
    insightCount: 41,
    viewCount: 890, media: [],
    authorFollowed: true,
    subscribed: false,
    liked: false,
    reposted: true,
    shared: false,
    insighted: false,
    createdAt: '2026-06-26T09:30:00.000Z',
  },
  {
    id: 'm3',
    category: 'Marketing',
    content: 'Gastei R$ 0 em tráfego este mês e bati recorde de leads só pedindo indicação ativa pra clientes satisfeitos. Boca a boca estruturado funciona.',
    authorName: 'Marina Souza',
    authorRoleTitle: 'Fundadora · Estúdio MS',
    likeCount: 31,
    commentCount: 5,
    repostCount: 2,
    shareCount: 1,
    insightCount: 13,
    viewCount: 210, media: [],
    authorFollowed: false,
    subscribed: true,
    liked: false,
    reposted: false,
    shared: false,
    insighted: false,
    createdAt: '2026-06-25T18:10:00.000Z',
  },
  {
    id: 'm4',
    category: 'Financeiro',
    content: 'Separar conta PJ da PF parece óbvio mas mudou meu jogo. Pela primeira vez sei minha margem real por serviço. Quem ainda mistura, comece por aí.',
    authorName: 'Rafael Lima',
    authorRoleTitle: 'Dono · Lima Contabilidade',
    likeCount: 57,
    commentCount: 11,
    repostCount: 6,
    shareCount: 4,
    insightCount: 33,
    viewCount: 540, media: [],
    authorFollowed: false,
    subscribed: false,
    liked: true,
    reposted: false,
    shared: true,
    insighted: true,
    createdAt: '2026-06-25T14:45:00.000Z',
  },
  {
    id: 'm5',
    category: 'Networking',
    content: 'Procuro parceiro de tecnologia em Fortaleza para projeto de logística. Já temos contrato fechado, falta time de dev. Chama no direct.',
    authorName: 'Juliana Castro',
    authorRoleTitle: 'COO · Rota Log',
    likeCount: 14,
    commentCount: 3,
    repostCount: 1,
    shareCount: 0,
    insightCount: 8,
    viewCount: 96, media: [],
    authorFollowed: false,
    subscribed: false,
    liked: false,
    reposted: false,
    shared: false,
    insighted: false,
    createdAt: '2026-06-24T20:05:00.000Z',
  },
];

const c = (over: Partial<Comment> & Pick<Comment, 'id' | 'postId' | 'authorName' | 'content' | 'createdAt'>): Comment => ({
  parentId: null, likeCount: 0, insightCount: 0, replyCount: 0, repostCount: 0, shareCount: 0,
  liked: false, insighted: false, reposted: false, shared: false, ...over,
});

export const mockComments: Record<string, Comment[]> = {
  m1: [
    c({ id: 'c1', postId: 'm1', authorName: 'Pedro Alves', authorRoleTitle: 'Gestor · Alves Móveis', content: 'Fizemos parecido aqui. O segredo foi indicador visível pra todo mundo, não só pro gestor.', createdAt: '2026-06-26T13:10:00.000Z', likeCount: 4, insightCount: 2, replyCount: 1 }),
    c({ id: 'c1r', postId: 'm1', parentId: 'c1', authorName: 'Ana Ribeiro', authorRoleTitle: 'CEO · Construtora Ribeiro', content: 'Exato. Visibilidade gera responsabilidade.', createdAt: '2026-06-26T13:25:00.000Z', likeCount: 1 }),
    c({ id: 'c2', postId: 'm1', authorName: 'Marina Souza', authorRoleTitle: 'Fundadora · Estúdio MS', content: 'Qual ferramenta vocês usam pra acompanhar os indicadores?', createdAt: '2026-06-26T13:40:00.000Z' }),
  ],
  m2: [
    c({ id: 'c3', postId: 'm2', authorName: 'Ana Ribeiro', authorRoleTitle: 'CEO · Construtora Ribeiro', content: 'Confirmo. Apresentação ao vivo muda tudo, mesmo que por vídeo.', createdAt: '2026-06-26T10:05:00.000Z', likeCount: 3, insightCount: 1 }),
  ],
};

export const mockGroups: Group[] = [
  { id: 'g1', name: 'Empresários do Varejo', segment: 'Varejo', city: null, memberCount: 1240, description: 'Donos de loja física e online trocando estratégia de venda, estoque e operação.', icon: 'bag', joined: true },
  { id: 'g2', name: 'Empresários de Fortaleza', segment: 'Regional', city: 'Fortaleza · CE', memberCount: 860, description: 'Networking local: parcerias, fornecedores e eventos na cidade.', icon: 'location', joined: false },
  { id: 'g3', name: 'Gestão Financeira', segment: 'Financeiro', city: null, memberCount: 2010, description: 'Fluxo de caixa, precificação, impostos e controle financeiro na prática.', icon: 'wallet', joined: false },
  { id: 'g4', name: 'Marketing e Vendas', segment: 'Comercial', city: null, memberCount: 3150, description: 'Aquisição, funil, tráfego e processo comercial para PMEs.', icon: 'chart', joined: true },
  { id: 'g5', name: 'Donos de Agência', segment: 'Serviços', city: null, memberCount: 540, description: 'Gestão de agência: contratos, time, escopo e retenção de cliente.', icon: 'work', joined: false },
];

export const mockGroupPosts: Record<string, FeedPost[]> = {
  g1: [mockFeed[1], mockFeed[0]],
  g4: [mockFeed[2], mockFeed[1]],
};

export const mockOpportunities: Opportunity[] = [
  { id: 'o1', kind: 'INDICACAO', title: 'Procuro indicação de contador para PME', description: 'Empresa de serviços, ~15 funcionários, precisa de contabilidade ágil em Fortaleza.', city: 'Fortaleza · CE', segment: 'Serviços', authorName: 'Ana Ribeiro', createdAt: '2026-06-29T11:00:00.000Z', likeCount: 8, commentCount: 3, insightCount: 17, liked: false, insighted: false, viewCount: 0, subscribed: false, authorFollowed: false },
  { id: 'o2', kind: 'PARCERIA', title: 'Busco parceria com agência de tráfego', description: 'Tenho base de clientes B2B e quero oferecer gestão de tráfego como serviço.', city: null, segment: 'Marketing', authorName: 'Carlos Pena', createdAt: '2026-06-29T08:30:00.000Z', likeCount: 12, commentCount: 5, insightCount: 28, liked: true, insighted: true, viewCount: 0, subscribed: false, authorFollowed: false },
  { id: 'o3', kind: 'FORNECEDOR', title: 'Fornecedor de embalagens sustentáveis', description: 'Disponho de embalagens recicláveis para food service, pronta-entrega no NE.', city: 'Recife · PE', segment: 'Indústria', authorName: 'Marina Souza', createdAt: '2026-06-28T19:10:00.000Z', likeCount: 4, commentCount: 1, insightCount: 9, liked: false, insighted: false, viewCount: 0, subscribed: false, authorFollowed: false },
  { id: 'o4', kind: 'VAGA', title: 'Vaga: vendedor(a) interno B2B', description: 'CLT + comissão, presencial. Experiência em prospecção ativa.', city: 'Fortaleza · CE', segment: 'Comercial', authorName: 'Rafael Lima', createdAt: '2026-06-28T14:00:00.000Z', likeCount: 6, commentCount: 2, insightCount: 12, liked: false, insighted: false, viewCount: 0, subscribed: false, authorFollowed: false },
  { id: 'o5', kind: 'EVENTO', title: 'Café empresarial — networking do varejo', description: 'Encontro presencial dia 15. Donos de loja e fornecedores. Vagas limitadas.', city: 'Fortaleza · CE', segment: 'Varejo', authorName: 'Juliana Castro', createdAt: '2026-06-27T16:45:00.000Z', likeCount: 21, commentCount: 7, insightCount: 45, liked: false, insighted: false, viewCount: 0, subscribed: false, authorFollowed: false },
];

export interface ProfileExtra {
  bio: string;
  company: string;
  title: string;
  segment: string;
  city: string;
  diagnosticScore: number;
  stats: { posts: number; connections: number; groups: number };
  badges: { label: string; icon: string; tone: 'accent' | 'navy' | 'muted' }[];
}

export const mockProfile: ProfileExtra = {
  bio: 'Fundador da GOX Tech Hub. Construindo a OnyLink — comunidade de crescimento empresarial. Foco em produto, vendas e comunidade.',
  company: 'GOX Tech Hub',
  title: 'Fundador',
  segment: 'Tecnologia',
  city: 'Fortaleza · CE',
  diagnosticScore: 72,
  stats: { posts: 12, connections: 248, groups: 4 },
  badges: [
    { label: 'Empresário Verificado', icon: 'verified', tone: 'navy' },
    { label: 'Conector', icon: 'connector', tone: 'accent' },
    { label: 'Autoridade em Marketing', icon: 'authority', tone: 'accent' },
  ],
};
