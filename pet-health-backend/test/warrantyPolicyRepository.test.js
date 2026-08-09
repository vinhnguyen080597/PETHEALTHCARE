import test from 'node:test';
import assert from 'node:assert/strict';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const {
  upsertMyBreederProfile,
  adminUpdateBreederProfileStatus,
  createPetFeedPost,
  adminUpdatePetFeedPostStatus,
  createMyWarrantyPolicy,
  deleteMyWarrantyPolicy,
  updateMyWarrantyPolicy,
  updatePetFeedPost,
  confirmListingDeposit,
  cancelListingDeposit,
  confirmListingComplete,
  getPublicBreederProfile,
  getPublicPetFeedPost,
} = await import('../src/repositories/petFeedRepository.js');

const samplePolicy = {
  title: 'Care 14 days',
  vaccine_shots_count: 2,
  vaccine_types: '5-in-1',
  deworming_note: 'Dewormed 7 days ago',
  has_health_book: true,
  care_parvo_coverage_days: 14,
  respiratory_skin_coverage_days: 3,
  congenital_coverage_days: 30,
  report_within_hours: 24,
  vet_requirement: 'licensed',
  buyer_guidelines: ['keep_farm_diet_3_5_days', 'no_bath_7_days'],
  exclusions: ['accident_trauma', 'poisoning_wrong_food'],
  medical_fee_support_percent: 50,
  allow_equivalent_swap: true,
  shipping_party: 'split',
  evidence_required: ['symptom_video', 'rapid_test_photo'],
  breeder_response_hours: 24,
};

async function seedVerifiedBreeder(userId) {
  const profile = await upsertMyBreederProfile(userId, {
    displayName: `Farm ${userId}`,
    location: 'HCM',
    metadata: {},
  }, null);
  await adminUpdateBreederProfileStatus(userId, 'verified');
  return profile;
}

test('first warranty policy awards trust flag; second does not', async () => {
  const userId = `wp-trust-${Date.now()}`;
  await seedVerifiedBreeder(userId);

  const first = await createMyWarrantyPolicy(userId, samplePolicy, null);
  assert.equal(first.trust_awarded, true);
  assert.equal(first.profile.warranty_policy_trust_awarded, true);
  assert.equal(first.profile.warranty_policies.length, 1);
  assert.equal(first.policy.care_parvo_coverage_days, 14);
  assert.equal(first.policy.medical_fee_support_percent, 50);
  assert.ok(!first.policy.file_url);

  const second = await createMyWarrantyPolicy(userId, {
    ...samplePolicy,
    title: 'Care 7 days',
    care_parvo_coverage_days: 7,
  }, null);
  assert.equal(second.trust_awarded, false);
  assert.equal(second.profile.warranty_policies.length, 2);
  assert.equal(second.profile.warranty_policy_trust_awarded, true);
});

test('update warranty policy keeps id and replaces fields', async () => {
  const userId = `wp-update-${Date.now()}`;
  await seedVerifiedBreeder(userId);
  const created = await createMyWarrantyPolicy(userId, samplePolicy, null);
  const updated = await updateMyWarrantyPolicy(
    userId,
    created.policy.id,
    {
      ...samplePolicy,
      title: 'Care 30 days',
      care_parvo_coverage_days: 30,
      medical_fee_support_percent: 100,
    },
    null,
  );
  assert.equal(updated.policy.id, created.policy.id);
  assert.equal(updated.policy.title, 'Care 30 days');
  assert.equal(updated.policy.care_parvo_coverage_days, 30);
  assert.equal(updated.policy.medical_fee_support_percent, 100);
  assert.equal(updated.profile.warranty_policies.length, 1);
});

test('dual deposit confirm freezes policy snapshot; cancel unfreezes', async () => {
  const breederId = `wp-breeder-${Date.now()}`;
  const senId = `wp-sen-${Date.now()}`;
  const profile = await seedVerifiedBreeder(breederId);
  const created = await createMyWarrantyPolicy(breederId, samplePolicy, null);

  let post = await createPetFeedPost(breederId, {
    title: 'Poodle pup',
    species: 'dog',
    status: 'draft',
    mediaUrls: ['https://cdn.example.com/p.jpg'],
    videoUrl: 'https://cdn.example.com/p.mp4',
    metadata: { warranty_policy_id: created.policy.id },
  }, null);
  post = await adminUpdatePetFeedPostStatus(post.id, 'published');
  assert.equal(post.warranty_policy?.id, created.policy.id);
  assert.equal(post.warranty_policy?.frozen, false);
  assert.equal(post.warranty_policy?.care_parvo_coverage_days, 14);

  const firstConfirm = await confirmListingDeposit(breederId, post.id, {
    senUserId: senId,
    acknowledge: true,
  }, null);
  assert.equal(firstConfirm.both_confirmed, false);
  assert.equal(firstConfirm.post.status, 'published');

  const secondConfirm = await confirmListingDeposit(senId, post.id, {
    acknowledge: true,
  }, null);
  assert.equal(secondConfirm.both_confirmed, true);
  assert.equal(secondConfirm.post.status, 'deposit_hold');
  assert.ok(secondConfirm.post.warranty_policy?.frozen);
  assert.equal(secondConfirm.post.metadata?.warranty_policy_snapshot?.title, 'Care 14 days');
  assert.equal(secondConfirm.post.metadata?.warranty_policy_snapshot?.care_parvo_coverage_days, 14);

  await assert.rejects(
    () => updatePetFeedPost(breederId, post.id, {
      metadata: { warranty_policy_id: 'other' },
    }, null),
    (err) => err.code === 'LISTING_LOCKED' || err.code === 'WARRANTY_POLICY_FROZEN',
  );

  const cancelled = await cancelListingDeposit(breederId, post.id, null);
  assert.equal(cancelled.post.status, 'published');
  assert.equal(cancelled.post.metadata?.warranty_policy_snapshot, undefined);

  const publicProfile = await getPublicBreederProfile(profile.id);
  assert.ok(publicProfile.profile.warranty_policies.length >= 1);
});

test('dual complete moves deposit_hold to sold', async () => {
  const breederId = `wp-done-${Date.now()}`;
  const senId = `wp-done-sen-${Date.now()}`;
  await seedVerifiedBreeder(breederId);
  const created = await createMyWarrantyPolicy(breederId, {
    ...samplePolicy,
    title: 'Policy Done',
  }, null);
  let post = await createPetFeedPost(breederId, {
    title: 'Cat',
    species: 'cat',
    status: 'draft',
    mediaUrls: ['https://cdn.example.com/c.jpg'],
    videoUrl: 'https://cdn.example.com/c.mp4',
    metadata: { warranty_policy_id: created.policy.id },
  }, null);
  post = await adminUpdatePetFeedPostStatus(post.id, 'published');
  await confirmListingDeposit(breederId, post.id, { senUserId: senId, acknowledge: true }, null);
  await confirmListingDeposit(senId, post.id, { acknowledge: true }, null);

  const partial = await confirmListingComplete(breederId, post.id, null);
  assert.equal(partial.both_confirmed, false);
  assert.equal(partial.post.status, 'deposit_hold');

  const done = await confirmListingComplete(senId, post.id, null);
  assert.equal(done.both_confirmed, true);
  assert.equal(done.post.status, 'sold');

  const publicPost = await getPublicPetFeedPost(post.id);
  assert.equal(publicPost.status, 'sold');
  assert.ok(publicPost.warranty_policy?.frozen);

  await assert.rejects(
    () => deleteMyWarrantyPolicy(breederId, created.policy.id, null),
    (err) => err.code === 'WARRANTY_POLICY_IN_USE',
  );
});
