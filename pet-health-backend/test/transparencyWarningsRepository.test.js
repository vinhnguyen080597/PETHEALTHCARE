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
  getMyOpenTransparencyWarning,
  resetTransparencyWarningMemoryForTests,
  maybeCreateTransparencyWarningAfterPenalty,
} = await import('../src/repositories/transparencyWarningsRepository.js');
const { getAccountProfile, ensureAccountProfile } = await import('../src/repositories/accountRepository.js');

test('reviewed reports apply compliance and no longer create transparency warnings', async () => {
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

  const report1 = await reportBreederProfile(reporterId, profile.id, { reason: 'stock_photo_spam' }, null);
  const reviewed1 = await adminUpdatePetFeedReportStatus(report1.id, 'reviewed');
  assert.equal(reviewed1.transparency_warning, null);
  assert.equal(reviewed1.compliance_penalty?.scoreAfter, 95);
  assert.equal((await getMyOpenTransparencyWarning(breederId, null)), null);

  const report2 = await reportBreederProfile(`r2-${Date.now()}`, profile.id, { reason: 'inaccurate_listing' }, null);
  const reviewed2 = await adminUpdatePetFeedReportStatus(report2.id, 'reviewed');
  assert.equal(reviewed2.transparency_warning, null);
  assert.equal(reviewed2.compliance_penalty?.scoreAfter, 85);
});

test('tier-4 confirmed_scam permanently suspends via compliance', async () => {
  resetTransparencyWarningMemoryForTests();
  const breederId = `scam-breeder-${Date.now()}`;
  await ensureAccountProfile({ userId: breederId, displayName: 'Scam Farm', primaryRole: 'breeder' });
  await upsertMyBreederProfile(breederId, {
    displayName: 'Scam Farm',
    location: 'Huế',
    verificationStatus: 'pending_review',
  }, null);
  await adminUpdateBreederProfileStatus(breederId, 'verified');
  const profile = await getMyBreederProfile(breederId, null);

  const report = await reportBreederProfile(`scam-${Date.now()}`, profile.id, { reason: 'confirmed_scam' }, null);
  const reviewed = await adminUpdatePetFeedReportStatus(report.id, 'reviewed');
  assert.equal(reviewed.compliance_penalty?.scoreAfter, 50);
  assert.equal(reviewed.compliance_penalty?.mapping?.tier, 4);
  assert.ok(reviewed.compliance_penalty?.actions?.includes('permanent_suspend'));

  const account = await getAccountProfile(breederId);
  assert.equal(account.account_status, 'suspended');
  const after = await getMyBreederProfile(breederId, null);
  assert.equal(after.verification_status, 'suspended');
  assert.equal(after.metadata?.compliance?.restrictions?.permanentBan, true);
});

test('legacy maybeCreateTransparencyWarningAfterPenalty no longer fires from penalty metadata alone', async () => {
  resetTransparencyWarningMemoryForTests();
  const breederId = `legacy-warn-${Date.now()}`;
  await ensureAccountProfile({ userId: breederId, displayName: 'Legacy Farm', primaryRole: 'breeder' });
  await upsertMyBreederProfile(breederId, {
    displayName: 'Legacy Farm',
    location: 'Đà Nẵng',
    verificationStatus: 'pending_review',
  }, null);
  await adminUpdateBreederProfileStatus(breederId, 'verified');
  const profile = await getMyBreederProfile(breederId, null);

  const warning = await maybeCreateTransparencyWarningAfterPenalty({
    profileBefore: { ...profile, metadata: { ...profile.metadata, penaltyPoints: 0 } },
    profileAfter: {
      ...profile,
      metadata: {
        ...profile.metadata,
        penaltyPoints: 20,
        violations: [{ id: 'legacy-v1', points: 20, status: 'active' }],
      },
    },
    triggerViolationId: 'legacy-v1',
  });
  assert.equal(warning, null);
});
