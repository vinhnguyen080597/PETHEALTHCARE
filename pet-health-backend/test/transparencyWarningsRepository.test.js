import test from 'node:test';
import assert from 'node:assert/strict';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const {
  adminUpdateBreederProfileStatus,
  adminUpdatePetFeedReportStatus,
  reportBreederProfile,
  upsertMyBreederProfile,
  getMyBreederProfile,
} = await import('../src/repositories/petFeedRepository.js');
const {
  appealTransparencyWarning,
  confirmTransparencyWarning,
  getMyOpenTransparencyWarning,
  adminResolveTransparencyWarning,
  resetTransparencyWarningMemoryForTests,
} = await import('../src/repositories/transparencyWarningsRepository.js');
const { getAccountProfile, ensureAccountProfile } = await import('../src/repositories/accountRepository.js');

test('two report penalties trigger warning; confirm suspends account', async () => {
  resetTransparencyWarningMemoryForTests();
  const breederId = `warn-breeder-${Date.now()}`;
  const reporterId = `warn-reporter-${Date.now()}`;
  await ensureAccountProfile({ userId: breederId, displayName: 'Warn Farm', primaryRole: 'breeder' });
  await upsertMyBreederProfile(breederId, {
    displayName: 'Warn Farm',
    location: 'Hà Nội',
    verificationStatus: 'pending_review',
  }, null);
  await adminUpdateBreederProfileStatus(breederId, 'verified');
  const profile = await getMyBreederProfile(breederId, null);

  // First 10-pt penalty → score 20 — no warning yet
  const report1 = await reportBreederProfile(reporterId, profile.id, { reason: 'spam' }, null);
  const reviewed1 = await adminUpdatePetFeedReportStatus(report1.id, 'reviewed');
  assert.equal(reviewed1.transparency_warning, null);
  assert.equal((await getMyOpenTransparencyWarning(breederId, null)), null);

  // Second 10-pt penalty → score 10 — warning
  const report2 = await reportBreederProfile(`r2-${Date.now()}`, profile.id, { reason: 'scam' }, null);
  const reviewed2 = await adminUpdatePetFeedReportStatus(report2.id, 'reviewed');
  assert.ok(reviewed2.transparency_warning?.id);
  assert.equal(reviewed2.transparency_warning.score_at_trigger, 10);

  const open = await getMyOpenTransparencyWarning(breederId, null);
  assert.equal(open?.status, 'pending_breeder_action');

  await confirmTransparencyWarning(breederId, open.id, null);
  const account = await getAccountProfile(breederId);
  assert.equal(account.account_status, 'suspended');
  const after = await getMyBreederProfile(breederId, null);
  assert.equal(after.verification_status, 'suspended');
});

test('appeal then admin restore waives penalty and keeps account active', async () => {
  resetTransparencyWarningMemoryForTests();
  const breederId = `appeal-breeder-${Date.now()}`;
  await ensureAccountProfile({ userId: breederId, displayName: 'Appeal Farm', primaryRole: 'breeder' });
  await upsertMyBreederProfile(breederId, {
    displayName: 'Appeal Farm',
    location: 'Huế',
    verificationStatus: 'pending_review',
  }, null);
  await adminUpdateBreederProfileStatus(breederId, 'verified');
  const profile = await getMyBreederProfile(breederId, null);

  const r1 = await reportBreederProfile(`a1-${Date.now()}`, profile.id, { reason: 'x' }, null);
  await adminUpdatePetFeedReportStatus(r1.id, 'reviewed');
  const r2 = await reportBreederProfile(`a2-${Date.now()}`, profile.id, { reason: 'y' }, null);
  const reviewed = await adminUpdatePetFeedReportStatus(r2.id, 'reviewed');
  const warningId = reviewed.transparency_warning.id;

  await appealTransparencyWarning(breederId, warningId, null);
  const restored = await adminResolveTransparencyWarning(warningId, 'restore', {
    adminNote: 'Good faith',
    adminUserId: 'admin',
  });
  assert.equal(restored.status, 'restored');
  const account = await getAccountProfile(breederId);
  assert.equal(account.account_status, 'active');
  const after = await getMyBreederProfile(breederId, null);
  assert.ok((after.metadata?.penaltyPoints ?? 0) < 20);
});
