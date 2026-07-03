import { create } from 'zustand';
import { api } from '../lib/api';
import { tokenStore } from '../lib/storage';
import { config } from '../lib/config';
import { mockUser } from '../lib/mock';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  handle: string;
  role: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

interface AuthState {
  user: SessionUser | null;
  status: 'loading' | 'authenticated' | 'guest';
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; handle: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  /** Sincroniza dados da sessão após edição de perfil (ex.: nome). */
  updateUser: (patch: Partial<SessionUser>) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: 'loading',

  updateUser(patch) {
    set((s) => (s.user ? { user: { ...s.user, ...patch } } : s));
  },

  /** Restaura sessão no boot do app (valida token chamando /me). */
  async bootstrap() {
    const access = await tokenStore.getAccess();
    if (!access) {
      set({ status: 'guest', user: null });
      return;
    }
    try {
      const me = await api.get<SessionUser & Record<string, unknown>>('/web/auth/me');
      set({ status: 'authenticated', user: { id: me.id, name: me.name, email: me.email, handle: me.handle, role: me.role } });
    } catch {
      await tokenStore.clear();
      set({ status: 'guest', user: null });
    }
  },

  async login(email, password) {
    // Modo demo: aceita qualquer credencial e abre sessão fake (sem backend).
    if (config.mock.auth) {
      set({ status: 'authenticated', user: { ...mockUser, email: email.trim() || mockUser.email } });
      return;
    }
    const data = await api.post<AuthTokens>('/web/auth/login', { email, password });
    await tokenStore.save(data.accessToken, data.refreshToken);
    set({ status: 'authenticated', user: data.user });
  },

  async register(input) {
    if (config.mock.auth) {
      set({ status: 'authenticated', user: { ...mockUser, name: input.name || mockUser.name, email: input.email || mockUser.email, handle: input.handle || mockUser.handle } });
      return;
    }
    const data = await api.post<AuthTokens>('/web/auth/register', input);
    await tokenStore.save(data.accessToken, data.refreshToken);
    set({ status: 'authenticated', user: data.user });
  },

  async logout() {
    if (config.mock.auth) {
      set({ status: 'guest', user: null });
      return;
    }
    const refreshToken = await tokenStore.getRefresh();
    try {
      await api.post('/web/auth/logout', { refreshToken });
    } catch {
      /* best-effort */
    }
    await tokenStore.clear();
    set({ status: 'guest', user: null });
  },
}));
