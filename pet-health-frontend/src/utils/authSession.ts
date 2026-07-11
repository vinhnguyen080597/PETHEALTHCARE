import type { AuthSession } from '../types';

export const SESSION_REFRESH_BUFFER_SECONDS = 300;

type RawAuthSession = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_at?: unknown;
  expires_in?: unknown;
};

function decodeJwtExpirySeconds(accessToken: string): number | null {
  const parts = accessToken.split('.');
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export function normalizeAuthSession(raw: RawAuthSession | null | undefined, nowSeconds = Math.floor(Date.now() / 1000)): AuthSession | null {
  const accessToken = typeof raw?.access_token === 'string' ? raw.access_token.trim() : '';
  const refreshToken = typeof raw?.refresh_token === 'string' ? raw.refresh_token.trim() : '';
  if (!accessToken || !refreshToken) return null;

  let expiresAt = typeof raw?.expires_at === 'number' ? raw.expires_at : null;
  if (!expiresAt) {
    const expiresIn = typeof raw?.expires_in === 'number' ? raw.expires_in : null;
    if (expiresIn && expiresIn > 0) {
      expiresAt = nowSeconds + expiresIn;
    }
  }
  if (!expiresAt) {
    expiresAt = decodeJwtExpirySeconds(accessToken);
  }
  if (!expiresAt) return null;

  const expiresIn = typeof raw?.expires_in === 'number' ? raw.expires_in : undefined;
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    ...(expiresIn !== undefined ? { expires_in: expiresIn } : {}),
  };
}

export function isAuthSessionExpired(session: AuthSession, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  return session.expires_at <= nowSeconds;
}

export function shouldRefreshAuthSession(
  session: AuthSession,
  nowSeconds = Math.floor(Date.now() / 1000),
  bufferSeconds = SESSION_REFRESH_BUFFER_SECONDS,
): boolean {
  return session.expires_at - nowSeconds <= bufferSeconds;
}

export function decodeAccessTokenExpirySeconds(accessToken: string): number | null {
  return decodeJwtExpirySeconds(accessToken);
}

export function buildLegacyAuthSession(accessToken: string): AuthSession | null {
  const token = accessToken.trim();
  const expiresAt = decodeJwtExpirySeconds(token);
  if (!token || !expiresAt) return null;
  return {
    access_token: token,
    refresh_token: '',
    expires_at: expiresAt,
  };
}

export function getRefreshDelayMs(
  session: AuthSession,
  nowMs = Date.now(),
  bufferSeconds = SESSION_REFRESH_BUFFER_SECONDS,
): number {
  const refreshAtMs = (session.expires_at - bufferSeconds) * 1000;
  return Math.max(0, refreshAtMs - nowMs);
}
