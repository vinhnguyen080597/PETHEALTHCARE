import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PetFeedNotification } from "../src/lib/api/petFeed.ts";
import {
  filterNotificationsByStatus,
  matchesNotificationQuery,
  NOTIFICATION_FILTER_ALL,
  NOTIFICATION_FILTER_UNREAD,
  NOTIFICATIONS_PAGE_LIMIT,
  NOTIFICATIONS_PREVIEW_LIMIT,
  notificationThumbEmoji,
} from "../src/lib/notifications/inboxCore.ts";
import { isRejectionReasonNotification } from "../src/lib/notifications/open.ts";
import {
  NOTIFICATIONS_LIMIT_DEFAULT,
  parseNotificationsLimit,
} from "../src/lib/api/validation/common.ts";

function note(
  partial: Partial<PetFeedNotification> & Pick<PetFeedNotification, "id">,
): PetFeedNotification {
  return {
    type: "post_comment",
    body_preview: "hello",
    created_at: "2026-09-15T03:00:00.000Z",
    read_at: null,
    is_unread: true,
    actor_display_name: "Alice",
    post_title: "Cat listing",
    post_thumb_url: null,
    ...partial,
  };
}

describe("notification inbox helpers", () => {
  it("keeps preview/page limits small", () => {
    assert.equal(NOTIFICATIONS_PREVIEW_LIMIT, 12);
    assert.equal(NOTIFICATIONS_PAGE_LIMIT, 20);
    assert.equal(NOTIFICATIONS_LIMIT_DEFAULT, 20);
    assert.equal(parseNotificationsLimit(null), 20);
    assert.equal(parseNotificationsLimit("12"), 12);
  });

  it("filters unread and matches query haystacks", () => {
    const items = [
      note({ id: "1", is_unread: true, read_at: null, body_preview: "farm review" }),
      note({
        id: "2",
        is_unread: false,
        read_at: "2026-09-14T00:00:00.000Z",
        body_preview: "listing approved",
        type: "listing_approved",
      }),
    ];
    assert.equal(
      filterNotificationsByStatus(items, NOTIFICATION_FILTER_UNREAD).length,
      1,
    );
    assert.equal(
      filterNotificationsByStatus(items, NOTIFICATION_FILTER_ALL).length,
      2,
    );
    assert.equal(matchesNotificationQuery("listing approved title", "approved"), true);
    assert.equal(matchesNotificationQuery("farm review", "approved"), false);
  });

  it("maps thumb emoji and rejection types", () => {
    assert.equal(
      notificationThumbEmoji(note({ id: "a", type: "listing_approved" })),
      "✅",
    );
    assert.equal(
      notificationThumbEmoji(note({ id: "b", type: "admin_listing_pending" })),
      "📋",
    );
    assert.equal(isRejectionReasonNotification("listing_rejected"), true);
    assert.equal(isRejectionReasonNotification("post_comment"), false);
  });
});
