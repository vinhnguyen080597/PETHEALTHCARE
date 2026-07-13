import { AppState, Platform } from 'react-native';
import { API_BASE_URL } from '../config';
import type { AuthSession } from '../types';
import {
  getRefreshDelayMs,
  isAuthSessionExpired,
  normalizeAuthSession,
  shouldRefreshAuthSession,
} from './authSession';
import { getStoredAuthSession, removeStoredAuthSession, setStoredAuthSession } from './authTokenStorage';

type SessionListener = (session: AuthSession | null) => void;

type RefreshResult = {
  session: AuthSession | null;
  code?: string;
};

let activeSession: AuthSession | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshInFlight: Promise<AuthSession | null> | null = null;
let sessionListener: SessionListener | null = null;
let lifecycleInstalled = false;
let lifecycleTeardown: (() => void) | null = null;

function clearRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

function notifySessionListener() {
  sessionListener?.(activeSession);
}

function scheduleProactiveRefresh(session: AuthSession) {
  clearRefreshTimer();
  if (!session.refresh_token) return;
  const delayMs = getRefreshDelayMs(session);
  refreshTimer = setTimeout(() => {
    void tryRefreshAuthSession();
  }, delayMs);
}

async function syncActiveSessionFromStorage(): Promise<AuthSession | null> {
  const stored = await getStoredAuthSession();
  activeSession = stored;
  return stored;
}

function shouldAttemptRefresh(session: AuthSession | null): boolean {
  if (!session?.refresh_token) return false;
  return shouldRefreshAuthSession(session) || isAuthSessionExpired(session);
}

async function refreshIfSessionNeedsIt(): Promise<void> {
  await syncActiveSessionFromStorage();
  if (!shouldAttemptRefresh(activeSession)) return;
  await tryRefreshAuthSession();
}

function installLifecycleHandlers() {
  if (lifecycleInstalled) return;
  lifecycleInstalled = true;

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshIfSessionNeedsIt();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    lifecycleTeardown = () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
    return;
  }

  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void refreshIfSessionNeedsIt();
    }
  });
  lifecycleTeardown = () => subscription.remove();
}

async function persistSession(session: AuthSession | null) {
  activeSession = session;
  if (session) {
    await setStoredAuthSession(session);
    scheduleProactiveRefresh(session);
    installLifecycleHandlers();
  } else {
    clearRefreshTimer();
    await removeStoredAuthSession();
  }
  notifySessionListener();
}

export function bindAuthSessionListener(listener: SessionListener | null) {
  sessionListener = listener;
  listener?.(activeSession);
}

export function getActiveAuthSession(): AuthSession | null {
  return activeSession;
}

export function getActiveAccessToken(): string | null {
  return activeSession?.access_token ?? null;
}

export async function activateAuthSession(session: AuthSession | null) {
  const normalized = session ? normalizeAuthSession(session) : null;
  await persistSession(normalized);
  return normalized;
}

export async function hydrateAuthSessionFromStorage(): Promise<AuthSession | null> {
  const stored = await syncActiveSessionFromStorage();
  if (!stored) {
    await persistSession(null);
    return null;
  }
  scheduleProactiveRefresh(stored);
  installLifecycleHandlers();
  notifySessionListener();
  return stored;
}

async function requestSessionRefresh(refreshToken: string): Promise<RefreshResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    let body: unknown = null;
    const text = await response.text();
    if (text.length > 0) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        body = text;
      }
    }

    if (!response.ok) {
      const code =
        body && typeof body === 'object' && 'code' in body && typeof (body as { code: unknown }).code === 'string'
          ? (body as { code: string }).code
          : undefined;
      return { session: null, code };
    }

    const sessionRaw =
      body && typeof body === 'object' && 'data' in body
        ? (body as { data?: { session?: unknown } }).data?.session
        : null;
    return { session: normalizeAuthSession(sessionRaw as AuthSession | null | undefined) };
  } catch {
    return { session: null };
  }
}

export async function tryRefreshAuthSession(): Promise<AuthSession | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    await syncActiveSessionFromStorage();
    const initialRefreshToken = activeSession?.refresh_token?.trim();
    if (!initialRefreshToken) return null;

    let result = await requestSessionRefresh(initialRefreshToken);
    if (!result.session && result.code === 'invalid_refresh_token') {
      await syncActiveSessionFromStorage();
      const latestRefreshToken = activeSession?.refresh_token?.trim();
      if (latestRefreshToken && latestRefreshToken !== initialRefreshToken) {
        result = await requestSessionRefresh(latestRefreshToken);
      }
    }

    if (!result.session) {
      if (result.code === 'invalid_refresh_token') {
        await persistSession(null);
      }
      return null;
    }

    await persistSession(result.session);
    return result.session;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function ensureFreshAccessToken(options?: { preferMemory?: boolean }): Promise<string | null> {
  if (!options?.preferMemory || !activeSession) {
    await syncActiveSessionFromStorage();
  }
  if (!activeSession) return null;

  if (!activeSession.refresh_token) {
    if (isAuthSessionExpired(activeSession)) {
      await persistSession(null);
      return null;
    }
    return activeSession.access_token;
  }

  if (shouldRefreshAuthSession(activeSession) || isAuthSessionExpired(activeSession)) {
    const refreshed = await tryRefreshAuthSession();
    return refreshed?.access_token ?? null;
  }

  return activeSession.access_token;
}

export async function clearAuthSession() {
  await persistSession(null);
}

export async function resolveAuthorizedToken(token: string): Promise<string> {
  // Hot path: reuse in-memory session and skip SecureStore on every API call.
  if (activeSession?.access_token === token) {
    if (!shouldRefreshAuthSession(activeSession) && !isAuthSessionExpired(activeSession)) {
      return activeSession.access_token;
    }
    const fresh = await ensureFreshAccessToken({ preferMemory: true });
    if (fresh) return fresh;
    if (!isAuthSessionExpired(activeSession)) return activeSession.access_token;
    return token;
  }

  await syncActiveSessionFromStorage();
  if (!activeSession) return token;

  const isAppToken = token === activeSession.access_token;
  if (!isAppToken) return token;

  const fresh = await ensureFreshAccessToken({ preferMemory: true });
  if (fresh) return fresh;
  if (!isAuthSessionExpired(activeSession)) return activeSession.access_token;
  return token;
}

export async function retryAfterUnauthorized(token: string): Promise<string | null> {
  await syncActiveSessionFromStorage();
  if (!activeSession?.refresh_token) return null;
  if (token !== activeSession.access_token) return null;
  const refreshed = await tryRefreshAuthSession();
  return refreshed?.access_token ?? null;
}

export function teardownAuthSessionLifecycle() {
  lifecycleTeardown?.();
  lifecycleTeardown = null;
  lifecycleInstalled = false;
  clearRefreshTimer();
}
