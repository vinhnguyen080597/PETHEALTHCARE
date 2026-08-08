import test from "node:test";
import assert from "node:assert/strict";
import {
  adminRequestHref,
  isNotificationUnread,
  notificationType,
} from "../src/lib/notifications/deepLinks";

test("notificationType defaults to post_comment", () => {
  assert.equal(notificationType({}), "post_comment");
  assert.equal(notificationType({ type: "admin_breeder_pending" }), "admin_breeder_pending");
});

test("isNotificationUnread respects read_at and is_unread", () => {
  assert.equal(isNotificationUnread({ read_at: "2026-08-01T00:00:00.000Z" }), false);
  assert.equal(isNotificationUnread({ is_unread: false }), false);
  assert.equal(isNotificationUnread({ is_unread: true }), true);
  assert.equal(isNotificationUnread({}), true);
});

test("adminRequestHref builds focused breeder/listing/report links", () => {
  assert.equal(
    adminRequestHref({
      type: "admin_breeder_pending",
      breeder_profile_id: "bp-1",
    }),
    "/app/admin?section=requests&type=breeder&focus=bp-1",
  );
  assert.equal(
    adminRequestHref({
      type: "admin_listing_pending",
      post_id: "post-9",
    }),
    "/app/admin?section=requests&type=post&focus=post-9",
  );
  assert.equal(
    adminRequestHref({
      type: "admin_report_open",
      metadata: { report_id: "rep-3" },
    }),
    "/app/admin?section=requests&type=report&focus=rep-3",
  );
});

test("adminRequestHref prefers metadata.cta_href when it includes focus", () => {
  assert.equal(
    adminRequestHref({
      type: "admin_breeder_pending",
      breeder_profile_id: "bp-1",
      metadata: {
        cta_href: "/app/admin?section=requests&type=breeder&focus=stored-id",
      },
    }),
    "/app/admin?section=requests&type=breeder&focus=stored-id",
  );
});

test("adminRequestHref falls back without focus ids", () => {
  assert.equal(
    adminRequestHref({ type: "admin_breeder_pending" }),
    "/app/admin?section=requests&type=breeder",
  );
  assert.equal(
    adminRequestHref({ type: "admin_listing_pending" }),
    "/app/admin?section=requests&type=post",
  );
  assert.equal(
    adminRequestHref({ type: "admin_report_open" }),
    "/app/admin?section=requests&type=report",
  );
  assert.equal(adminRequestHref({ type: "post_comment" }), "/app/admin?section=requests");
});
