import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { Base64 } from 'js-base64';
import { config } from './config';
import { encodeRequest, decodeResponse } from './transport';
import { tokenStore } from './storage';

/** Lê o exp do access token (JWT) sem verificar — só pra saber se expirou. */
function accessExpired(token: string): boolean {
  try {
    const part = token.split('.')[1];
    if (!part) return false;
    const { exp } = JSON.parse(Base64.decode(part)) as { exp?: number };
    return typeof exp === 'number' && exp * 1000 <= Date.now() + 10_000; // 10s de folga
  } catch {
    return false;
  }
}

/**
 * Único ponto de contato com o backend (CLAUDE.md §9).
 * - Embrulha o corpo no envelope payload-in-JWT (§5.1).
 * - Injeta Authorization: Bearer <accessToken> (§5.2).
 * - Decodifica a response e normaliza em { boleano, obj, mensagem }.
 * - Faz refresh automático uma vez em 401.
 */
export class ApiError extends Error {
  constructor(public mensagem: string, public obj: unknown = {}) {
    super(mensagem);
    this.name = 'ApiError';
  }
}

const http: AxiosInstance = axios.create({
  baseURL: config.apiUrl,
  timeout: 20_000,
  // não jogamos exceção por status — tratamos o envelope manualmente
  validateStatus: () => true,
});

http.interceptors.request.use(async (req: InternalAxiosRequestConfig) => {
  const isRefreshCall = (req.url ?? '').includes('/auth/refresh');
  let access = await tokenStore.getAccess();
  // Renova proativamente se expirou — senão rotas optionalAuth (feed) perdem a
  // identidade do viewer e o estado das reações (liked/insighted/...) some.
  if (access && !isRefreshCall && accessExpired(access)) {
    const ok = await tryRefresh();
    if (ok) access = await tokenStore.getAccess();
  }
  if (access) req.headers.Authorization = `Bearer ${access}`;
  // embrulha o corpo (se houver) no envelope
  if (req.data !== undefined && req.method && req.method.toLowerCase() !== 'get') {
    req.data = { payload: encodeRequest(req.data) };
  }
  return req;
});

interface Decoded<T> {
  boleano: boolean;
  obj: T;
  mensagem: string;
}

function decode<T>(raw: unknown): Decoded<T> {
  const payload = (raw as { payload?: string })?.payload;
  if (!payload) throw new ApiError('Resposta inesperada do servidor');
  return decodeResponse<T>(payload);
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = await tokenStore.getRefresh();
      if (!refreshToken) return false;
      const res = await http.post('/web/auth/refresh', { refreshToken });
      const decoded = decode<{ accessToken: string; refreshToken: string }>(res.data);
      if (!decoded.boleano) return false;
      await tokenStore.save(decoded.obj.accessToken, decoded.obj.refreshToken);
      return true;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

type Method = 'get' | 'post' | 'patch' | 'delete';

/** Faz a chamada, trata refresh e devolve `obj` em sucesso; lança ApiError em falha. */
export async function apiRequest<T = unknown>(method: Method, url: string, data?: unknown): Promise<T> {
  const res = await http.request({ method, url, data });

  if (res.status === 401) {
    const ok = await tryRefresh();
    if (ok) {
      const retry = await http.request({ method, url, data });
      const decoded = decode<T>(retry.data);
      if (!decoded.boleano) throw new ApiError(decoded.mensagem, decoded.obj);
      return decoded.obj;
    }
    await tokenStore.clear();
    throw new ApiError('Sessão expirada. Faça login novamente.');
  }

  const decoded = decode<T>(res.data);
  if (!decoded.boleano) throw new ApiError(decoded.mensagem, decoded.obj);
  return decoded.obj;
}

export const api = {
  get: <T>(url: string) => apiRequest<T>('get', url),
  post: <T>(url: string, data?: unknown) => apiRequest<T>('post', url, data),
  patch: <T>(url: string, data?: unknown) => apiRequest<T>('patch', url, data),
  delete: <T>(url: string, data?: unknown) => apiRequest<T>('delete', url, data),
};
