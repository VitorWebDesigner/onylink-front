import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Armazenamento seguro de tokens. SecureStore no device; localStorage no web
 * (SecureStore não existe na web).
 */
const ACCESS = 'onylink.accessToken';
const REFRESH = 'onylink.refreshToken';

const isWeb = Platform.OS === 'web';

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function delItem(key: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const tokenStore = {
  async save(access: string, refresh: string): Promise<void> {
    await Promise.all([setItem(ACCESS, access), setItem(REFRESH, refresh)]);
  },
  getAccess: () => getItem(ACCESS),
  getRefresh: () => getItem(REFRESH),
  async clear(): Promise<void> {
    await Promise.all([delItem(ACCESS), delItem(REFRESH)]);
  },
};
