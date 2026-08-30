import test from "node:test";
import assert from "node:assert/strict";
import {
  clampInt,
  NOTIFICATIONS_LIMIT_DEFAULT,
  NOTIFICATIONS_LIMIT_MAX,
} from "../src/lib/api/validation/common";
import { parseNotificationsLimit } from "../src/lib/api/validation/common";
import {
  dealCancelBodySchema,
  dealDisputeBodySchema,
  dealReviewBodySchema,
  listingCreateBodySchema,
  listingPatchBodySchema,
  markNotificationsReadBodySchema,
  postCommentBodySchema,
  sendMessageBodySchema,
  supportTicketBodySchema,
  warrantyPolicyBodySchema,
} from "../src/lib/api/validation/schemas";

test("listingCreateBodySchema rejects unknown keys and strips unsafe metadata", () => {
  const fail = listingCreateBodySchema.safeParse({
    title: "Kitten",
    species: "cat",
    metadata: { deal: { status: "deposit_hold" } },
  });
  assert.equal(fail.success, false);

  const ok = listingCreateBodySchema.safeParse({
    title: "Kitten",
    species: "cat",
    mediaUrls: ["https://cdn.example/a.jpg"],
    metadata: { warranty_policy_id: "wp-1" },
  });
  assert.equal(ok.success, true);
  if (ok.success) {
    assert.equal(ok.data.metadata?.warranty_policy_id, "wp-1");
    assert.equal(ok.data.status, undefined);
  }
});

test("listingPatchBodySchema allows partial updates", () => {
  const ok = listingPatchBodySchema.safeParse({ title: "Updated title" });
  assert.equal(ok.success, true);
  if (ok.success) assert.equal(ok.data.title, "Updated title");
});

test("supportTicketBodySchema validates feedback and scam shapes", () => {
  const feedback = supportTicketBodySchema.safeParse({
    kind: "feedback",
    category: "bug",
    title: "Broken button",
    body: "Steps to reproduce",
  });
  assert.equal(feedback.success, true);

  const scamFail = supportTicketBodySchema.safeParse({
    kind: "scam",
    scam_target_type: "phone",
    identifier: "090",
    body: "Scammer",
    evidence_confirmed: true,
    evidence_urls: [],
  });
  assert.equal(scamFail.success, false);
});

test("dealReviewBodySchema enforces rating range", () => {
  assert.equal(dealReviewBodySchema.safeParse({ rating: 0 }).success, false);
  assert.equal(dealReviewBodySchema.safeParse({ rating: 6 }).success, false);
  const ok = dealReviewBodySchema.safeParse({ rating: 5, body: "Great farm" });
  assert.equal(ok.success, true);
});

test("sendMessageBodySchema requires body or media", () => {
  assert.equal(sendMessageBodySchema.safeParse({ body: "" }).success, false);
  const ok = sendMessageBodySchema.safeParse({
    body: "Hello",
    media_urls: ["https://cdn.example/chat.jpg"],
  });
  assert.equal(ok.success, true);
});

test("postCommentBodySchema requires non-empty body", () => {
  assert.equal(postCommentBodySchema.safeParse({ body: "  " }).success, false);
  const ok = postCommentBodySchema.safeParse({ text: "Nice kitten" });
  assert.equal(ok.success, true);
  if (ok.success) assert.equal(ok.data.body, "Nice kitten");
});

test("deal dispute and cancel schemas bound photos and reason", () => {
  const cancel = dealCancelBodySchema.safeParse({ reason: "Buyer no-show" });
  assert.equal(cancel.success, true);

  const disputeFail = dealDisputeBodySchema.safeParse({
    message: "Never received pet",
    disputePhotoUrls: [],
  });
  assert.equal(disputeFail.success, false);

  const disputeOk = dealDisputeBodySchema.safeParse({
    message: "Never received pet",
    disputePhotoUrls: ["https://cdn.example/proof.jpg"],
  });
  assert.equal(disputeOk.success, true);
});

test("warrantyPolicyBodySchema rejects invalid enum values", () => {
  const fail = warrantyPolicyBodySchema.safeParse({
    title: "Care plan",
    vaccine_shots_count: 9,
    care_parvo_coverage_days: 14,
    respiratory_skin_coverage_days: 3,
    congenital_coverage_days: 30,
    report_within_hours: 24,
    vet_requirement: "licensed",
    medical_fee_support_percent: 50,
    shipping_party: "split",
    breeder_response_hours: 24,
  });
  assert.equal(fail.success, false);
});

test("markNotificationsReadBodySchema caps id count", () => {
  const ids = Array.from({ length: 120 }, (_, i) => `id-${i}`);
  assert.equal(markNotificationsReadBodySchema.safeParse({ ids }).success, false);
});

test("parseNotificationsLimit clamps query values", () => {
  assert.equal(parseNotificationsLimit(null), NOTIFICATIONS_LIMIT_DEFAULT);
  assert.equal(parseNotificationsLimit("999"), NOTIFICATIONS_LIMIT_MAX);
  assert.equal(parseNotificationsLimit("0"), 1);
  assert.equal(clampInt("abc", 12, 1, 100), 12);
});
