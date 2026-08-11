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
  requestListingCancelDeposit,
  confirmListingCancelDeposit,
  requestListingComplete,
  confirmListingComplete,
  requestListingDispute,
  adminForceCompleteListing,
  adminForceCancelListing,
  autoCompleteExpiredHandoffs,
  isListingEligibleForHandoffAutoComplete,
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
  // Breeder attestation with selected Sen locks soft deposit immediately.
  assert.equal(firstConfirm.both_confirmed, true);
  assert.equal(firstConfirm.post.status, 'deposit_hold');
  assert.equal(firstConfirm.post.deal?.sen_user_id || firstConfirm.post.metadata?.deal?.sen_user_id, senId);

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

  await assert.rejects(
    () => requestListingCancelDeposit(breederId, post.id, {}, null),
    (err) => err.code === 'DEPOSIT_CANCEL_REASON_REQUIRED',
  );

  const cancelRequested = await requestListingCancelDeposit(
    breederId,
    post.id,
    { reason: 'Sen không liên lạc được' },
    null,
  );
  assert.equal(cancelRequested.post.status, 'deposit_hold');
  assert.equal(cancelRequested.post.metadata?.deal?.status, 'pending_cancel_confirm');
  assert.equal(cancelRequested.post.metadata?.deal?.cancel_reason, 'Sen không liên lạc được');
  assert.ok(cancelRequested.post.metadata?.warranty_policy_snapshot);

  await assert.rejects(
    () => confirmListingCancelDeposit(breederId, post.id, null),
    (err) => err.code === 'DEPOSIT_CANCEL_CONFIRM_FORBIDDEN',
  );

  const cancelled = await confirmListingCancelDeposit(senId, post.id, null);
  assert.equal(cancelled.post.status, 'sold');
  assert.equal(cancelled.post.metadata?.listing_outcome, 'sold');
  assert.equal(cancelled.post.metadata?.warranty_policy_snapshot, undefined);
  assert.equal(cancelled.post.metadata?.deal?.status, 'cancelled');
  assert.ok(cancelled.post.metadata?.deal?.completed_at);
  assert.equal(cancelled.post.metadata?.deal?.dispute ?? null, null);

  await assert.rejects(
    () => requestListingCancelDeposit(senId, post.id, { reason: 'Sen try cancel' }, null),
    (err) => err.code === 'DEPOSIT_CANCEL_FORBIDDEN' || err.code === 'DEPOSIT_CANCEL_NOT_ALLOWED',
  );

  await assert.rejects(
    () => confirmListingDeposit(senId, post.id, { acknowledge: true }, null),
    (err) => err.code === 'DEPOSIT_NOT_ALLOWED',
  );

  const publicProfile = await getPublicBreederProfile(profile.id);
  assert.ok(publicProfile.profile.warranty_policies.length >= 1);
});

test('breeder handoff then sen confirm moves deposit_hold to sold', async () => {
  const breederId = `wp-ok-${Date.now()}`;
  const senId = `wp-ok-sen-${Date.now()}`;
  await seedVerifiedBreeder(breederId);
  const created = await createMyWarrantyPolicy(breederId, {
    ...samplePolicy,
    title: 'Policy OK',
  }, null);
  let post = await createPetFeedPost(breederId, {
    title: 'Cat OK',
    species: 'cat',
    status: 'draft',
    mediaUrls: ['https://cdn.example.com/ok.jpg'],
    videoUrl: 'https://cdn.example.com/ok.mp4',
    metadata: { warranty_policy_id: created.policy.id },
  }, null);
  post = await adminUpdatePetFeedPostStatus(post.id, 'published');
  await confirmListingDeposit(breederId, post.id, { senUserId: senId, acknowledge: true }, null);
  await requestListingComplete(
    breederId,
    post.id,
    { handoffPhotoUrls: ['https://cdn.example.com/handoff-ok.jpg'] },
    null,
  );
  const done = await confirmListingComplete(senId, post.id, null);
  assert.equal(done.both_confirmed, true);
  assert.equal(done.post.status, 'sold');
});

test('sen dispute then admin force-complete resolves deal', async () => {
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

  await assert.rejects(
    () => requestListingComplete(breederId, post.id, { handoffPhotoUrls: [] }, null),
    (err) => err.code === 'COMPLETE_PHOTOS_REQUIRED',
  );

  const requested = await requestListingComplete(
    breederId,
    post.id,
    { handoffPhotoUrls: ['https://cdn.example.com/handoff.jpg'] },
    null,
  );
  assert.equal(requested.both_confirmed, false);
  assert.equal(requested.post.status, 'deposit_hold');
  assert.equal(requested.post.metadata?.deal?.status, 'pending_sen_complete');
  assert.ok(requested.post.metadata?.deal?.complete_deadline_at);
  assert.equal(requested.post.metadata?.deal?.handoff_photos?.length, 1);

  await assert.rejects(
    () => cancelListingDeposit(breederId, post.id, null, { reason: 'too late' }),
    (err) => err.code === 'DEPOSIT_CANCEL_HANDOFF_PENDING',
  );

  await assert.rejects(
    () => requestListingDispute(senId, post.id, { message: '', disputePhotoUrls: [] }, null),
    (err) => err.code === 'DISPUTE_MESSAGE_REQUIRED' || err.code === 'DISPUTE_PHOTOS_REQUIRED',
  );

  const disputed = await requestListingDispute(
    senId,
    post.id,
    {
      message: 'Chưa nhận được bé',
      disputePhotoUrls: ['https://cdn.example.com/dispute.jpg'],
    },
    null,
  );
  assert.equal(disputed.post.metadata?.deal?.status, 'dispute_open');
  assert.equal(disputed.report?.reason, 'deal_dispute');
  assert.ok(disputed.post.metadata?.deal?.dispute?.report_id);

  await assert.rejects(
    () => confirmListingComplete(senId, post.id, null),
    (err) => err.code === 'COMPLETE_DISPUTE_OPEN',
  );

  const forced = await adminForceCompleteListing(breederId, post.id, { note: 'ok' }, null);
  assert.equal(forced.post.status, 'sold');
  assert.equal(forced.post.metadata?.deal?.admin_resolution, 'force_complete');

  const publicPost = await getPublicPetFeedPost(post.id);
  assert.equal(publicPost.status, 'sold');
  assert.ok(publicPost.warranty_policy?.frozen);

  await assert.rejects(
    () => deleteMyWarrantyPolicy(breederId, created.policy.id, null),
    (err) => err.code === 'WARRANTY_POLICY_IN_USE',
  );
});

test('admin force-cancel after dispute reopens listing', async () => {
  const breederId = `wp-fc-${Date.now()}`;
  const senId = `wp-fc-sen-${Date.now()}`;
  await seedVerifiedBreeder(breederId);
  const created = await createMyWarrantyPolicy(breederId, {
    ...samplePolicy,
    title: 'Policy FC',
  }, null);
  let post = await createPetFeedPost(breederId, {
    title: 'Cat FC',
    species: 'cat',
    status: 'draft',
    mediaUrls: ['https://cdn.example.com/fc.jpg'],
    videoUrl: 'https://cdn.example.com/fc.mp4',
    metadata: { warranty_policy_id: created.policy.id },
  }, null);
  post = await adminUpdatePetFeedPostStatus(post.id, 'published');
  await confirmListingDeposit(breederId, post.id, { senUserId: senId, acknowledge: true }, null);
  await requestListingComplete(
    breederId,
    post.id,
    { handoffPhotoUrls: ['https://cdn.example.com/h2.jpg'] },
    null,
  );
  await requestListingDispute(
    senId,
    post.id,
    {
      message: 'Không nhận được',
      disputePhotoUrls: ['https://cdn.example.com/d2.jpg'],
    },
    null,
  );
  const cancelled = await adminForceCancelListing(breederId, post.id, { note: 'cancel' }, null);
  assert.equal(cancelled.post.status, 'published');
  assert.equal(cancelled.post.metadata?.deal?.admin_resolution, 'force_cancel');
  assert.equal(cancelled.post.metadata?.warranty_policy_snapshot, undefined);
  assert.equal(cancelled.post.metadata?.deal?.dispute ?? null, null);
  assert.ok(cancelled.post.metadata?.deal?.last_closed_dispute?.opened_at);

  // Redeposit → handoff → dispute again must succeed (no leftover opened_at poison).
  await confirmListingDeposit(breederId, post.id, { senUserId: senId, acknowledge: true }, null);
  await requestListingComplete(
    breederId,
    post.id,
    { handoffPhotoUrls: ['https://cdn.example.com/h2-again.jpg'] },
    null,
  );
  await assert.rejects(
    () => requestListingDispute(breederId, post.id, {
      message: 'breeder cannot dispute',
      disputePhotoUrls: ['https://cdn.example.com/no.jpg'],
    }, null),
    (err) => err.code === 'DISPUTE_FORBIDDEN',
  );
  await assert.rejects(
    () => requestListingDispute(senId, post.id, {
      message: 'missing photos',
      disputePhotoUrls: [],
    }, null),
    (err) => err.code === 'DISPUTE_PHOTOS_REQUIRED',
  );
  const disputedAgain = await requestListingDispute(
    senId,
    post.id,
    {
      message: 'Vẫn chưa nhận được sau chu kỳ mới',
      disputePhotoUrls: ['https://cdn.example.com/d2-again.jpg'],
    },
    null,
  );
  assert.equal(disputedAgain.post.metadata?.deal?.status, 'dispute_open');
  assert.ok(disputedAgain.post.metadata?.deal?.dispute?.opened_at);

  await assert.rejects(
    () => requestListingCancelDeposit(breederId, post.id, { reason: 'too late' }, null),
    (err) => err.code === 'DEPOSIT_CANCEL_HANDOFF_PENDING',
  );
});

test('dispute before handoff and cancel while dispute are blocked', async () => {
  const breederId = `wp-gates-${Date.now()}`;
  const senId = `wp-gates-sen-${Date.now()}`;
  await seedVerifiedBreeder(breederId);
  const created = await createMyWarrantyPolicy(breederId, {
    ...samplePolicy,
    title: 'Policy Gates',
  }, null);
  let post = await createPetFeedPost(breederId, {
    title: 'Cat Gates',
    species: 'cat',
    status: 'draft',
    mediaUrls: ['https://cdn.example.com/g.jpg'],
    videoUrl: 'https://cdn.example.com/g.mp4',
    metadata: { warranty_policy_id: created.policy.id },
  }, null);
  post = await adminUpdatePetFeedPostStatus(post.id, 'published');
  await confirmListingDeposit(breederId, post.id, { senUserId: senId, acknowledge: true }, null);

  await assert.rejects(
    () => requestListingDispute(senId, post.id, {
      message: 'too early',
      disputePhotoUrls: ['https://cdn.example.com/early.jpg'],
    }, null),
    (err) => err.code === 'DISPUTE_NOT_ALLOWED',
  );

  await requestListingComplete(
    breederId,
    post.id,
    { handoffPhotoUrls: ['https://cdn.example.com/g-h.jpg'] },
    null,
  );
  await assert.rejects(
    () => requestListingComplete(breederId, post.id, {
      handoffPhotoUrls: ['https://cdn.example.com/again.jpg'],
    }, null),
    (err) => err.code === 'COMPLETE_ALREADY_REQUESTED',
  );

  // Force into cancel-pending then ensure handoff is blocked on another post path:
  // here handoff already pending; cancel must be blocked.
  await assert.rejects(
    () => requestListingCancelDeposit(breederId, post.id, { reason: 'no' }, null),
    (err) => err.code === 'DEPOSIT_CANCEL_HANDOFF_PENDING',
  );

  await requestListingDispute(
    senId,
    post.id,
    {
      message: 'dispute now',
      disputePhotoUrls: ['https://cdn.example.com/g-d.jpg'],
    },
    null,
  );
  await assert.rejects(
    () => requestListingCancelDeposit(breederId, post.id, { reason: 'during dispute' }, null),
    (err) => err.code === 'DEPOSIT_CANCEL_HANDOFF_PENDING',
  );
});
test('auto-complete expires pending_sen_complete after deadline; skips disputes', async () => {
  const breederId = `wp-auto-${Date.now()}`;
  const senId = `wp-auto-sen-${Date.now()}`;
  await seedVerifiedBreeder(breederId);
  const created = await createMyWarrantyPolicy(breederId, {
    ...samplePolicy,
    title: 'Policy Auto',
  }, null);
  let post = await createPetFeedPost(breederId, {
    title: 'Cat Auto',
    species: 'cat',
    status: 'draft',
    mediaUrls: ['https://cdn.example.com/auto.jpg'],
    videoUrl: 'https://cdn.example.com/auto.mp4',
    metadata: { warranty_policy_id: created.policy.id },
  }, null);
  post = await adminUpdatePetFeedPostStatus(post.id, 'published');
  await confirmListingDeposit(breederId, post.id, { senUserId: senId, acknowledge: true }, null);
  const requested = await requestListingComplete(
    breederId,
    post.id,
    { handoffPhotoUrls: ['https://cdn.example.com/handoff-auto.jpg'] },
    null,
  );
  assert.equal(
    isListingEligibleForHandoffAutoComplete(requested.post, Date.now()),
    false,
  );

  const early = await autoCompleteExpiredHandoffs(null, { nowMs: Date.now() });
  assert.equal(early.completed.length, 0);

  const overdue = await autoCompleteExpiredHandoffs(null, {
    nowMs: Date.now() + 8 * 86400000,
  });
  assert.equal(overdue.completed.length, 1);
  assert.equal(overdue.completed[0].post.status, 'sold');
  assert.equal(overdue.completed[0].post.metadata?.deal?.completed_by_system, true);
  assert.equal(overdue.completed[0].notify_sen_user_id, senId);

  const breeder2 = `wp-auto2-${Date.now()}`;
  const sen2 = `wp-auto2-sen-${Date.now()}`;
  await seedVerifiedBreeder(breeder2);
  const created2 = await createMyWarrantyPolicy(breeder2, {
    ...samplePolicy,
    title: 'Policy Auto2',
  }, null);
  let post2 = await createPetFeedPost(breeder2, {
    title: 'Cat Dispute',
    species: 'cat',
    status: 'draft',
    mediaUrls: ['https://cdn.example.com/auto2.jpg'],
    videoUrl: 'https://cdn.example.com/auto2.mp4',
    metadata: { warranty_policy_id: created2.policy.id },
  }, null);
  post2 = await adminUpdatePetFeedPostStatus(post2.id, 'published');
  await confirmListingDeposit(breeder2, post2.id, { senUserId: sen2, acknowledge: true }, null);
  await requestListingComplete(
    breeder2,
    post2.id,
    { handoffPhotoUrls: ['https://cdn.example.com/h2.jpg'] },
    null,
  );
  await requestListingDispute(
    sen2,
    post2.id,
    {
      message: 'Chưa nhận',
      disputePhotoUrls: ['https://cdn.example.com/d-auto.jpg'],
    },
    null,
  );
  const skipDispute = await autoCompleteExpiredHandoffs(null, {
    nowMs: Date.now() + 8 * 86400000,
  });
  assert.equal(
    skipDispute.completed.some((item) => item.post.id === post2.id),
    false,
  );
});
