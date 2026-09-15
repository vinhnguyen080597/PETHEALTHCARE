import test from "node:test";
import assert from "node:assert/strict";
import {
  historyChangeSummary,
  historyRejectionReason,
  historyTargetHref,
} from "../src/lib/admin/history";
import { ADMIN_CONSOLE_PATH } from "../src/lib/admin/consoleNav";

test("historyChangeSummary shows account suspend, not only role", () => {
  assert.equal(
    historyChangeSummary({
      action: "account.update",
      target_id: "u-1",
      before_state: {
        display_name: "Mai",
        primary_role: "sen",
        account_status: "active",
      },
      after_state: {
        display_name: "Mai",
        primary_role: "sen",
        account_status: "suspended",
      },
    }),
    "Mai · active → suspended",
  );
  assert.equal(
    historyChangeSummary({
      action: "account.update",
      before_state: { display_name: "Lan", primary_role: "sen" },
      after_state: { display_name: "Lan", primary_role: "admin" },
    }),
    "Lan · sen → admin",
  );
});

test("historyChangeSummary covers flags, news, and status fallbacks", () => {
  assert.equal(
    historyChangeSummary({
      action: "feature_flags.update",
      metadata: { changed_keys: ["marketplace", "news"] },
    }),
    "marketplace, news",
  );
  assert.equal(
    historyChangeSummary({
      action: "announcement.update",
      target_id: "n-1",
      after_state: { title: "Spring checkup" },
    }),
    "Spring checkup",
  );
  assert.equal(
    historyChangeSummary({
      action: "post.archive",
      target_id: "p-1",
      before_state: { status: "pending_review" },
      after_state: { status: "archived", title: "Poodle pup" },
    }),
    "pending_review → archived · Poodle pup",
  );
  assert.equal(
    historyChangeSummary({
      action: "unknown.action",
      target_id: "x-9",
    }),
    "x-9",
  );
});

test("historyTargetHref deep-links listings, farms, and request queue rows", () => {
  assert.equal(
    historyTargetHref({ target_type: "post", target_id: "post 1" }),
    "/app/pet-feed/posts/post%201",
  );
  assert.equal(
    historyTargetHref({ target_type: "breeder_profile", target_id: "bp-1" }),
    "/app/breeders/bp-1",
  );
  assert.equal(
    historyTargetHref({ target_type: "report", target_id: "rep-1" }),
    `${ADMIN_CONSOLE_PATH}?section=requests&type=report&focus=rep-1`,
  );
  assert.equal(
    historyTargetHref({ target_type: "farm_review", target_id: "fr-1" }),
    `${ADMIN_CONSOLE_PATH}?section=requests&type=farm_review&focus=fr-1`,
  );
  assert.equal(
    historyTargetHref({
      target_type: "breeder_submission",
      target_id: "sub-1",
    }),
    `${ADMIN_CONSOLE_PATH}?section=requests&type=detail&focus=sub-1`,
  );
  assert.equal(
    historyTargetHref({
      target_type: "transparency_warning",
      target_id: "tw-1",
    }),
    `${ADMIN_CONSOLE_PATH}?section=requests&type=appeal&focus=tw-1`,
  );
  assert.equal(
    historyTargetHref({
      target_type: "support_ticket",
      target_id: "t-scam",
      after_state: { kind: "scam" },
    }),
    `${ADMIN_CONSOLE_PATH}?section=requests&type=scam&focus=t-scam`,
  );
  assert.equal(
    historyTargetHref({
      target_type: "support_ticket",
      target_id: "t-fb",
    }),
    `${ADMIN_CONSOLE_PATH}?section=requests&type=feedback&focus=t-fb`,
  );
  assert.equal(
    historyTargetHref({ target_type: "announcement", target_id: "news-1" }),
    "/app/news?post=news-1",
  );
  assert.equal(
    historyTargetHref({ target_type: "account", target_id: "u-1" }),
    null,
  );
});

test("historyRejectionReason reads snake and camel keys", () => {
  assert.equal(
    historyRejectionReason({ rejection_reason: "Incomplete photos" }),
    "Incomplete photos",
  );
  assert.equal(
    historyRejectionReason({ rejectionReason: "  Missing papers  " }),
    "Missing papers",
  );
  assert.equal(historyRejectionReason({ rejection_reason: 12 }), "");
  assert.equal(historyRejectionReason(null), "");
});
