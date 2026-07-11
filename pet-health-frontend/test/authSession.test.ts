import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLegacyAuthSession,
  getRefreshDelayMs,
  isAuthSessionExpired,
  normalizeAuthSession,
  shouldRefreshAuthSession,
} from '../src/utils/authSession.ts';

function makeJwt(exp: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
  return `${header}.${payload}.signature`;
}

test('normalizes a full Supabase session payload', () => {
    const now = 1_700_000_000;
    const session = normalizeAuthSession(
      {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_at: now + 3600,
        expires_in: 3600,
      },
      now,
    );

    assert.deepEqual(session, {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_at: now + 3600,
      expires_in: 3600,
    });
});

test('derives expires_at from expires_in when missing', () => {
    const now = 1_700_000_000;
    const session = normalizeAuthSession(
      {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 1800,
      },
      now,
    );

    assert.equal(session?.expires_at, now + 1800);
});

test('builds a legacy access-token-only session from JWT exp', () => {
    const exp = 1_800_000_000;
    const session = buildLegacyAuthSession(makeJwt(exp));
    assert.deepEqual(session, {
      access_token: makeJwt(exp),
      refresh_token: '',
      expires_at: exp,
    });
});

test('detects expiry and refresh windows', () => {
    const now = 1_000;
    const session = {
      access_token: 'access',
      refresh_token: 'refresh',
      expires_at: now + 3600,
    };

    assert.equal(isAuthSessionExpired(session, now + 3600), true);
    assert.equal(isAuthSessionExpired(session, now + 3599), false);
    assert.equal(shouldRefreshAuthSession(session, now + 3299, 300), false);
    assert.equal(shouldRefreshAuthSession(session, now + 3300, 300), true);
    assert.equal(getRefreshDelayMs(session, (now + 3300) * 1000, 300), 0);
    assert.equal(getRefreshDelayMs(session, now * 1000, 300), 3_300_000);
});
