import test from "node:test";
import assert from "node:assert/strict";
import {
  adminRequestHref,
  breederTransparencyNotificationHref,
  isAdminQueueNotification,
  isDepositCancelRequestNotification,
  listingNotificationHref,
  notificationInboxCta,
  isNotificationUnread,
  notificationType,
} from "../src/lib/notifications/deepLinks";

const CTA_FALLBACKS = {
  verified: "View farm",
  rejected: "View reason",
  listingApproved: "View listing",
  listingRejected: "View account",
  adminRequest: "View request",
  detailApproved: "View farm profile",
  detailRejected: "View reason",
  transparencyWarning: "Review warning",
  transparencyResolved: "View farm profile",
  depositCancelConfirm: "Confirm cancel deposit",
  depositConfirm: "Confirm deposit",
  dealCompleteConfirm: "Confirm handoff",
  viewListing: "View listing",
};

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
  assert.equal(
    adminRequestHref({
      type: "admin_breeder_detail_pending",
      metadata: { submission_id: "sub-1" },
    }),
    "/app/admin?section=requests&type=detail&focus=sub-1",
  );
  assert.equal(
    adminRequestHref({
      type: "admin_transparency_appeal",
      metadata: { warning_id: "warn-2" },
    }),
    "/app/admin?section=requests&type=appeal&focus=warn-2",
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
  assert.equal(
    adminRequestHref({ type: "admin_breeder_detail_pending" }),
    "/app/admin?section=requests&type=detail",
  );
  assert.equal(
    adminRequestHref({ type: "admin_transparency_appeal" }),
    "/app/admin?section=requests&type=appeal",
  );
  assert.equal(adminRequestHref({ type: "post_comment" }), "/app/admin?section=requests");
});

test("listing review notification types are distinct from admin queue types", () => {
  assert.equal(notificationType({ type: "listing_approved" }), "listing_approved");
  assert.equal(notificationType({ type: "listing_rejected" }), "listing_rejected");
});

test("transparency notification deep links and CTAs", () => {
  assert.equal(isAdminQueueNotification("admin_breeder_detail_pending"), true);
  assert.equal(isAdminQueueNotification("admin_transparency_appeal"), true);
  assert.equal(
    breederTransparencyNotificationHref({ type: "transparency_warning" }),
    "/app/account/breeder",
  );
  assert.equal(
    breederTransparencyNotificationHref({
      type: "breeder_detail_approved",
      breeder_profile_id: "bp-9",
    }),
    "/app/breeders/bp-9",
  );
  assert.equal(
    notificationInboxCta({ type: "transparency_warning" }, CTA_FALLBACKS),
    "Review warning",
  );
  assert.equal(
    notificationInboxCta({ type: "breeder_detail_approved" }, CTA_FALLBACKS),
    "View farm profile",
  );
  assert.equal(
    notificationInboxCta({ type: "admin_transparency_appeal" }, CTA_FALLBACKS),
    "View request",
  );
});

test("deposit cancel notification shows a confirm CTA", () => {
  assert.equal(
    notificationInboxCta({ type: "deposit_cancel_request" }, CTA_FALLBACKS),
    "Confirm cancel deposit",
  );
  assert.equal(
    notificationInboxCta(
      {
        type: "deposit_cancel_request",
        cta_label: "Xác nhận hủy cọc",
      },
      CTA_FALLBACKS,
    ),
    "Xác nhận hủy cọc",
  );
  assert.equal(notificationInboxCta({ type: "post_comment" }, CTA_FALLBACKS), null);
});

test("listingNotificationHref rewrites legacy /app/posts and adds cancel action", () => {
  assert.equal(
    listingNotificationHref({
      type: "deposit_cancel_request",
      post_id: "post-1",
    }),
    "/app/pet-feed/posts/post-1?dealAction=confirm-cancel",
  );
  assert.equal(
    listingNotificationHref({
      type: "deposit_cancel_request",
      post_id: "post-1",
      metadata: { cta_href: "/app/posts/post-1" },
    }),
    "/app/pet-feed/posts/post-1?dealAction=confirm-cancel",
  );
  assert.equal(
    listingNotificationHref({
      type: "deposit_confirmed",
      post_id: "post-2",
    }),
    "/app/pet-feed/posts/post-2",
  );
  assert.equal(isDepositCancelRequestNotification("deposit_cancel_request"), true);
});
