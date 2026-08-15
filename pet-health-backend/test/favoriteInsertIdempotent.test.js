import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Mirrors favoritePetFeedPost conflict handling without hitting Supabase.
 * Duplicate unique violations must be treated as success (idempotent like).
 */
function resolveFavoriteInsertError(error) {
  if (!error) return { ok: true, duplicate: false };
  if (error.code === '23505') return { ok: true, duplicate: true };
  if (/duplicate|unique/i.test(String(error.message || ''))) {
    return { ok: true, duplicate: true };
  }
  return { ok: false, duplicate: false };
}

test('favorite insert treats unique conflict as success', () => {
  assert.deepEqual(resolveFavoriteInsertError(null), { ok: true, duplicate: false });
  assert.deepEqual(
    resolveFavoriteInsertError({ code: '23505', message: 'duplicate key' }),
    { ok: true, duplicate: true },
  );
  assert.deepEqual(
    resolveFavoriteInsertError({ code: '42501', message: 'new row violates row-level security' }),
    { ok: false, duplicate: false },
  );
});
