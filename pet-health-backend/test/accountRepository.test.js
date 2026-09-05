import test from 'node:test';
import assert from 'node:assert/strict';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const {
  adminUpdateAccountProfile,
  ensureAccountProfile,
  getAccountProfile,
} = await import('../src/repositories/accountRepository.js');

test('account profiles default isForTesting to false and allow admin updates', async () => {
  const userId = `test-account-${Date.now()}`;

  const created = await ensureAccountProfile({
    userId,
    email: 'tester@example.com',
    loginIdentifier: 'tester@example.com',
    displayName: 'Tester',
    primaryRole: 'sen',
  });

  assert.equal(created.isForTesting, false);

  const updated = await adminUpdateAccountProfile(userId, { isForTesting: true });
  assert.equal(updated?.isForTesting, true);

  const loaded = await getAccountProfile(userId);
  assert.equal(loaded?.isForTesting, true);
});
