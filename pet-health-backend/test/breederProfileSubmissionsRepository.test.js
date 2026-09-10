import test from "node:test";
import assert from "node:assert/strict";

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const {
  adminUpdateBreederProfileStatus,
  adminReviewBreederProfileSubmission,
  createBreederProfileSubmission,
  getMyBreederProfile,
  listAdminBreederProfileSubmissions,
  listMyBreederProfileSubmissions,
  upsertMyBreederProfile,
} = await import("../src/repositories/petFeedRepository.js");

test("breeder profile submission flow approve merges metadata", async () => {
  const userId = `submission-user-${Date.now()}`;
  await upsertMyBreederProfile(userId, {
    displayName: "Farm A",
    location: "Hà Nội",
    verificationStatus: "pending_review",
  }, null);
  await adminUpdateBreederProfileStatus(userId, "verified");

  const created = await createBreederProfileSubmission(
    userId,
    {
      submissionType: "social_facebook",
      url: "https://facebook.com/farm-a",
    },
    null,
  );
  assert.equal(created.status, "pending");
  assert.equal(created.payload.url, "https://facebook.com/farm-a");

  const pending = await listAdminBreederProfileSubmissions("pending");
  assert.ok(pending.some((row) => row.id === created.id));

  const reviewed = await adminReviewBreederProfileSubmission(created.id, "approved");
  assert.equal(reviewed.status, "approved");
  assert.equal(reviewed.breeder_profile?.contact?.facebook, "https://facebook.com/farm-a");
  assert.equal(reviewed.breeder_profile?.metadata?.social_facebook_approved, true);
  assert.equal(reviewed.breeder_profile?.metadata?.social_facebook_trust_awarded, true);

  const profile = await getMyBreederProfile(userId, null);
  assert.equal(profile.contact.facebook, "https://facebook.com/farm-a");
  assert.equal(profile.metadata.social_facebook_approved, true);
  assert.equal(profile.metadata.social_facebook_trust_awarded, true);

  const mine = await listMyBreederProfileSubmissions(userId, null);
  assert.ok(mine.some((row) => row.id === created.id && row.status === "approved"));
});

test("approving a warranty policy file stores it on the breeder library", async () => {
  const userId = `submission-warranty-${Date.now()}`;
  await upsertMyBreederProfile(userId, {
    displayName: "Farm Warranty",
    location: "Hồ Chí Minh",
    verificationStatus: "pending_review",
  }, null);
  await adminUpdateBreederProfileStatus(userId, "verified");

  const created = await createBreederProfileSubmission(
    userId,
    {
      submissionType: "warranty_policy_file",
      url: "https://cdn.example/farm-policy.pdf",
      title: "Chính sách trại",
      content_type: "application/pdf",
    },
    null,
  );
  const reviewed = await adminReviewBreederProfileSubmission(created.id, "approved");
  assert.equal(reviewed.status, "approved");
  assert.equal(reviewed.breeder_profile?.metadata?.warranty_policies?.length, 1);
  assert.equal(
    reviewed.breeder_profile.metadata.warranty_policies[0].file_url,
    "https://cdn.example/farm-policy.pdf",
  );

  const profile = await getMyBreederProfile(userId, null);
  assert.equal(profile.metadata.warranty_policies.length, 1);
  assert.equal(profile.metadata.warranty_policy_trust_awarded, true);
  assert.equal(profile.warranty_policies.length, 1);
});

test("reject submission requires rejection reason at route layer", async () => {
  const userId = `submission-reject-${Date.now()}`;
  await upsertMyBreederProfile(userId, {
    displayName: "Farm B",
    location: "Đà Nẵng",
    verificationStatus: "pending_review",
  }, null);
  await adminUpdateBreederProfileStatus(userId, "verified");
  const created = await createBreederProfileSubmission(
    userId,
    { submissionType: "business_license", url: "https://cdn.example/license.jpg" },
    null,
  );
  await assert.rejects(
    () => adminReviewBreederProfileSubmission(created.id, "rejected", {}),
    (err) => err.code === "MISSING_REJECTION_REASON",
  );
  const rejected = await adminReviewBreederProfileSubmission(created.id, "rejected", {
    rejectionReason: "Unreadable document",
  });
  assert.equal(rejected.status, "rejected");
  const profile = await getMyBreederProfile(userId, null);
  assert.notEqual(profile.metadata.business_license_verified, true);
});

test("createBreederProfileSubmission rejects a second pending update", async () => {
  const userId = `submission-pending-${Date.now()}`;
  await upsertMyBreederProfile(userId, {
    displayName: "Farm C",
    location: "Hà Nội",
    verificationStatus: "pending_review",
  }, null);
  await adminUpdateBreederProfileStatus(userId, "verified");
  await createBreederProfileSubmission(
    userId,
    { submissionType: "social_facebook", url: "https://facebook.com/first" },
    null,
  );
  await assert.rejects(
    () =>
      createBreederProfileSubmission(
        userId,
        { submissionType: "social_facebook", url: "https://facebook.com/second" },
        null,
      ),
    (err) => err.code === "SUBMISSION_ALREADY_PENDING",
  );
});
