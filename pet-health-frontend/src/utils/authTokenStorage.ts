import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { AUTH_SESSION_STORAGE_KEY, TOKEN_STORAGE_KEY } from '../constants/auth';
import type { AuthSession } from '../types';
import { buildLegacyAuthSession, normalizeAuthSession } from './authSession';

const useSecureStore = Platform.OS !== 'web';

async function readSecureOrAsync(key: string): Promise<string | null> {
  if (!useSecureStore) {
    return AsyncStorage.getItem(key);
  }
  const secureValue = await SecureStore.getItemAsync(key);
  if (secureValue) return secureValue;
  return AsyncStorage.getItem(key);
}

async function writeSecureOrAsync(key: string, value: string): Promise<void> {
  if (!useSecureStore) {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
  await AsyncStorage.removeItem(key);
}

async function removeSecureOrAsync(key: string): Promise<void> {
  if (useSecureStore) {
    await SecureStore.deleteItemAsync(key);
  }
  await AsyncStorage.removeItem(key);
}

function parseStoredSession(raw: string | null): AuthSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    const normalized = normalizeAuthSession(parsed);
    if (normalized) return normalized;

    const accessToken = typeof parsed.access_token === 'string' ? parsed.access_token.trim() : '';
    const refreshToken = typeof parsed.refresh_token === 'string' ? parsed.refresh_token : '';
    const expiresAt = typeof parsed.expires_at === 'number' ? parsed.expires_at : null;
    if (accessToken && expiresAt) {
      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
      };
    }
    return buildLegacyAuthSession(accessToken);
  } catch {
    return null;
  }
}

async function migrateLegacyAccessToken(): Promise<AuthSession | null> {
  const legacyToken = await readSecureOrAsync(TOKEN_STORAGE_KEY);
  if (!legacyToken) return null;

  const session = buildLegacyAuthSession(legacyToken);
  if (!session) {
    await removeSecureOrAsync(TOKEN_STORAGE_KEY);
    return null;
  }
  return session;
}

export async function getStoredAuthSession(): Promise<AuthSession | null> {
  const stored = parseStoredSession(await readSecureOrAsync(AUTH_SESSION_STORAGE_KEY));
  if (stored) return stored;

  return migrateLegacyAccessToken();
}

export async function setStoredAuthSession(session: AuthSession): Promise<void> {
  const normalized = session.refresh_token ? normalizeAuthSession(session) : session;
  if (!normalized?.access_token) return;
  await writeSecureOrAsync(AUTH_SESSION_STORAGE_KEY, JSON.stringify(normalized));
  await removeSecureOrAsync(TOKEN_STORAGE_KEY);
}

export async function removeStoredAuthSession(): Promise<void> {
  await removeSecureOrAsync(AUTH_SESSION_STORAGE_KEY);
  await removeSecureOrAsync(TOKEN_STORAGE_KEY);
}

/** @deprecated Prefer getStoredAuthSession(). */
export async function getStoredAuthToken(): Promise<string | null> {
  const session = await getStoredAuthSession();
  return session?.access_token ?? null;
}

/** @deprecated Prefer setStoredAuthSession(). */
export async function setStoredAuthToken(token: string): Promise<void> {
  const existing = await getStoredAuthSession();
  if (existing?.refresh_token) {
    await setStoredAuthSession({
      access_token: token,
      refresh_token: existing.refresh_token,
      expires_at: existing.expires_at,
    });
    return;
  }
  const normalized = normalizeAuthSession({ access_token: token, refresh_token: '' });
  if (!normalized) return;
  await writeSecureOrAsync(TOKEN_STORAGE_KEY, token);
}

/** @deprecated Prefer removeStoredAuthSession(). */
export async function removeStoredAuthToken(): Promise<void> {
  await removeStoredAuthSession();
}
