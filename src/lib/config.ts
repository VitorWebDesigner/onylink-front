import Constants from 'expo-constants';

type Extra = { apiUrl?: string; transportSecret?: string };
const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

// Backend de PRODUÇÃO (servidor). Builds de loja (APK/IPA) usam este.
const PROD_API_URL = 'http://212.85.2.32:4128';
// Porta do backend rodando LOCAL na sua máquina (npm run dev).
const LOCAL_API_PORT = 4444;

/**
 * Resolve a URL do backend AUTOMATICAMENTE (padrão app-imperium) — não precisa
 * comentar/descomentar pra buildar:
 *  1) EXPO_PUBLIC_API_URL no .env → override manual (força uma URL específica).
 *  2) Expo Go / dev client (tem host do Metro) → back LOCAL no IP da sua máquina
 *     na porta 4444 (mesma WiFi do celular).
 *  3) Build de produção (sem Metro) → servidor de produção.
 */
function resolveApiUrl(): string {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return override;

  // Em dev, o Metro expõe o host (ex.: "192.168.0.10:8081"). Cobre as duas APIs.
  const devHost =
    Constants.expoConfig?.hostUri ??
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost;

  if (devHost) return `http://${devHost.split(':')[0]}:${LOCAL_API_PORT}`;

  return extra.apiUrl ?? PROD_API_URL;
}

const apiUrl = resolveApiUrl();
// eslint-disable-next-line no-console
console.log('🚀 [API] backend:', apiUrl);

// EXPO_PUBLIC_MOCK=1 → tudo mock (sem backend). =0/ausente → real onde o back existe.
const all = process.env.EXPO_PUBLIC_MOCK === '1';

export const config = {
  apiUrl,
  transportSecret: process.env.EXPO_PUBLIC_TRANSPORT_SECRET ?? extra.transportSecret ?? 'change-me-transport',
  /**
   * Mock POR DOMÍNIO. Backend pronto = auth/feed/diagnostics/opportunities/
   * comments/profile (real). groups ainda não existe no back → segue mock;
   * troque o `true` por `all` quando o back tiver o módulo.
   */
  mock: {
    auth: all,
    feed: all,
    diagnostics: all,
    opportunities: all,
    comments: all,
    profile: all,
    groups: true,
  },
};
