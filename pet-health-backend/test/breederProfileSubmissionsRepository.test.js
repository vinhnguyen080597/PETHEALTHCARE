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
