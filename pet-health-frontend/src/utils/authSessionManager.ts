import { API_BASE_URL } from '../config';
import type { AuthSession } from '../types';
import { getRefreshDelayMs, isAuthSessionExpired, normalizeAuthSession, shouldRefreshAuthSession } from './authSession';
import { getStoredAuthSession, removeStoredAuthSession, setStoredAuthSession } from './authTokenStorage';

type SessionListener = (session: AuthSession | null) => void;

let activeSession: AuthSession | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshInFlight: Promise<AuthSession | null> | null = null;
let sessionListener: SessionListener | null = null;

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

async function persistSession(session: AuthSession | null) {
  activeSession = session;
  if (session) {
    await setStoredAuthSession(session);
    scheduleProactiveRefresh(session);
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
  const stored = await getStoredAuthSession();
  if (!stored) {
    await persistSession(null);
    return null;
  }
  activeSession = stored;
  scheduleProactiveRefresh(stored);
  notifySessionListener();
  return stored;
}

async function requestSessionRefresh(refreshToken: string): Promise<AuthSession | null> {
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

  if (!response.ok) return null;

  const sessionRaw =
    body && typeof body === 'object' && 'data' in body
      ? (body as { data?: { session?: unknown } }).data?.session
      : null;
  return normalizeAuthSession(sessionRaw as AuthSession | null | undefined);
}

export async function tryRefreshAuthSession(): Promise<AuthSession | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = activeSession?.refresh_token?.trim();
    if (!refreshToken) return null;

    const refreshed = await requestSessionRefresh(refreshToken);
    if (!refreshed) {
      await persistSession(null);
      return null;
    }

    await persistSession(refreshed);
    return refreshed;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function ensureFreshAccessToken(): Promise<string | null> {
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
  const active = getActiveAccessToken();
  if (!active || token !== active) return token;
  const fresh = await ensureFreshAccessToken();
  return fresh ?? token;
}

export async function retryAfterUnauthorized(token: string): Promise<string | null> {
  const active = getActiveAccessToken();
  if (!active || token !== active || !activeSession?.refresh_token) return null;
  const refreshed = await tryRefreshAuthSession();
  return refreshed?.access_token ?? null;
}
