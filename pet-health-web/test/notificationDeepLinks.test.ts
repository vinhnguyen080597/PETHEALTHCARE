import test from "node:test";
import assert from "node:assert/strict";
import {
  adminRequestHref,
  breederTransparencyNotificationHref,
  farmProfileNotificationHref,
  farmSaleReviewNotificationHref,
  farmReviewedNotificationHref,
  isAdminQueueNotification,
  isDepositCancelRequestNotification,
  isFarmSaleReviewRequestNotification,
  isFarmReviewedNotification,
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
  farmSaleReview: "Leave a review",
  farmReviewed: "View reviews",
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
      type: "admin_feedback_open",
      metadata: { ticket_id: "fb-1" },
    }),
    "/app/admin?section=requests&type=feedback&focus=fb-1",
  );
  assert.equal(
    adminRequestHref({
      type: "admin_scam_open",
      metadata: { ticket_id: "sc-2" },
    }),
    "/app/admin?section=requests&type=scam&focus=sc-2",
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
    adminRequestHref({ type: "admin_feedback_open" }),
    "/app/admin?section=requests&type=feedback",
  );
  assert.equal(
    adminRequestHref({ type: "admin_scam_open" }),
    "/app/admin?section=requests&type=scam",
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

test("deal reviewed notification uses view listing CTA", () => {
  assert.equal(
    notificationInboxCta({ type: "deal_reviewed" }, CTA_FALLBACKS),
    "View listing",
  );
});

test("listing review notification types are distinct from admin queue types", () => {
  assert.equal(notificationType({ type: "listing_approved" }), "listing_approved");
  assert.equal(notificationType({ type: "listing_rejected" }), "listing_rejected");
});

test("transparency notification deep links and CTAs", () => {
  assert.equal(isAdminQueueNotification("admin_breeder_detail_pending"), true);
  assert.equal(isAdminQueueNotification("admin_transparency_appeal"), true);
  assert.equal(isAdminQueueNotification("admin_feedback_open"), true);
  assert.equal(isAdminQueueNotification("admin_scam_open"), true);
  assert.equal(isAdminQueueNotification("admin_farm_review_pending"), true);
  assert.equal(
    adminRequestHref({
      type: "admin_farm_review_pending",
      metadata: { review_id: "rev-1" },
    }),
    "/app/admin?section=requests&type=farm_review&focus=rev-1",
  );
  assert.equal(
    adminRequestHref({ type: "admin_farm_review_pending" }),
    "/app/admin?section=requests&type=farm_review",
  );
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

test("farm-profile CTAs ignore stored account/breeder hrefs", () => {
  assert.equal(
    farmProfileNotificationHref({
      type: "breeder_detail_approved",
      breeder_profile_id: "bp-9",
      metadata: { cta_href: "/app/account/breeder" },
    }),
    "/app/breeders/bp-9",
  );
  assert.equal(
    breederTransparencyNotificationHref({
      type: "breeder_detail_approved",
      breeder_profile_id: "bp-9",
      metadata: { cta_href: "/app/account/breeder" },
    }),
    "/app/breeders/bp-9",
  );
  assert.equal(
    breederTransparencyNotificationHref({
      type: "breeder_verified",
      breeder_profile_id: "bp-1",
      metadata: { cta_href: "/app/account/breeder" },
    }),
    "/app/breeders/bp-1",
  );
  assert.equal(
    breederTransparencyNotificationHref({
      type: "transparency_warning_resolved",
      breeder_profile_id: "bp-2",
      metadata: { cta_href: "/app/account/breeder" },
    }),
    "/app/breeders/bp-2",
  );
  assert.equal(
    farmProfileNotificationHref({
      metadata: { cta_href: "/app/breeders/stored-id" },
    }),
    "/app/breeders/stored-id",
  );
});

test("legacy deal notifications use view listing CTA", () => {
  assert.equal(
    notificationInboxCta({ type: "deposit_cancel_request" }, CTA_FALLBACKS),
    "View listing",
  );
  assert.equal(
    notificationInboxCta({ type: "deposit_request" }, CTA_FALLBACKS),
    "View listing",
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

test("listingNotificationHref rewrites legacy /app/posts paths", () => {
  assert.equal(
    listingNotificationHref({
      type: "deposit_cancel_request",
      post_id: "post-1",
    }),
    "/app/pet-feed/posts/post-1",
  );
  assert.equal(
    listingNotificationHref({
      type: "deposit_cancel_request",
      post_id: "post-1",
      metadata: { cta_href: "/app/posts/post-1" },
    }),
    "/app/pet-feed/posts/post-1",
  );
  assert.equal(
    listingNotificationHref({
      type: "deposit_confirmed",
      post_id: "post-2",
    }),
    "/app/pet-feed/posts/post-2",
  );
  assert.equal(
    listingNotificationHref({
      type: "deposit_request",
      post_id: "post-3",
    }),
    "/app/pet-feed/posts/post-3",
  );
  assert.equal(
    listingNotificationHref({
      type: "deal_complete_request",
      post_id: "post-4",
    }),
    "/app/pet-feed/posts/post-4",
  );
  assert.equal(isDepositCancelRequestNotification("deposit_cancel_request"), true);
});

test("farm sale review notification deep link and CTA", () => {
  assert.equal(isFarmSaleReviewRequestNotification("farm_sale_review_request"), true);
  assert.equal(
    farmSaleReviewNotificationHref({
      type: "farm_sale_review_request",
      post_id: "post-42",
    }),
    "/app/pet-feed/posts/post-42?saleReview=1",
  );
  assert.equal(
    notificationInboxCta({ type: "farm_sale_review_request" }, CTA_FALLBACKS),
    "Leave a review",
  );
});

test("farm reviewed notification opens breeder overview", () => {
  assert.equal(isFarmReviewedNotification("farm_reviewed"), true);
  assert.equal(
    farmReviewedNotificationHref({
      type: "farm_reviewed",
      breeder_profile_id: "farm-9",
      post_id: "post-42",
    }),
    "/app/breeders/farm-9?reviews=1",
  );
  assert.equal(
    farmReviewedNotificationHref({
      type: "farm_reviewed",
      breeder_profile_id: "farm-9",
      metadata: { review_id: "rev-42" },
    }),
    "/app/breeders/farm-9?reviews=1&focusReview=rev-42",
  );
  assert.equal(
    farmReviewedNotificationHref({
      type: "farm_reviewed",
      metadata: {
        cta_href: "/app/breeders/farm-9?from=account",
        review_id: "rev-7",
      },
    }),
    "/app/breeders/farm-9?from=account&reviews=1&focusReview=rev-7",
  );
  assert.equal(
    notificationInboxCta({ type: "farm_reviewed" }, CTA_FALLBACKS),
    "View reviews",
  );
});
