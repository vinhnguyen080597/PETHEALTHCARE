import test from "node:test";
import assert from "node:assert/strict";
import {
  conversationListingThumb,
  conversationListingTitle,
  conversationPeerName,
  conversationPreview,
  countUnreadConversations,
  formatInboxTime,
  formatMessageTime,
  isConversationBreederViewer,
  isMineMessage,
  normalizeConversations,
  resolveConversationPostSummary,
} from "../src/lib/messages";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";

test("conversation labels prefer peer name, listing title, and preview", () => {
  assert.equal(
    conversationPeerName(
      { id: "c1", peer_display_name: "Minh Nghi", title: "ignored" },
      "User",
    ),
    "Minh Nghi",
  );
  assert.equal(conversationPeerName({ id: "c1" }, "User"), "User");
  assert.equal(
    conversationListingTitle(
      { post_title: "British Shorthair", title: "fallback" },
      "Listing",
    ),
    "British Shorthair",
  );
  assert.equal(
    conversationPreview({ last_message_preview: "Xin chào" }, "No messages"),
    "Xin chào",
  );
  assert.equal(conversationPreview({}, "No messages"), "No messages");
  assert.equal(
    conversationListingThumb({
      post_thumb_url: null,
      post_summary: { id: "p1", title: "A", thumb_url: "https://cdn/x.jpg" },
    }),
    "https://cdn/x.jpg",
  );
});

test("unread count and mine/breeder helpers", () => {
  assert.equal(
    countUnreadConversations([
      { has_unread: true },
      { has_unread: false },
      { has_unread: true },
    ]),
    2,
  );
  assert.equal(
    isMineMessage({ id: "m1", sender_user_id: "u1" }, "u1"),
    true,
  );
  assert.equal(
    isMineMessage({ id: "m1", sender_id: "u2" }, "u1"),
    false,
  );
  assert.equal(
    isConversationBreederViewer({ breeder_user_id: "b1" }, "b1"),
    true,
  );
});

test("resolveConversationPostSummary falls back to post fields", () => {
  const summary = resolveConversationPostSummary({
    id: "c1",
    post_id: "p1",
    post_title: "Kitty",
    post_thumb_url: "https://cdn/t.jpg",
  });
  assert.equal(summary?.id, "p1");
  assert.equal(summary?.title, "Kitty");
  assert.equal(summary?.thumb_url, "https://cdn/t.jpg");
});

test("normalizeConversations filters invalid rows", () => {
  assert.deepEqual(
    normalizeConversations([{ id: "ok" }, { foo: 1 }, null]).map((c) => c.id),
    ["ok"],
  );
});

test("time formatters return locale strings for valid dates", () => {
  const iso = "2026-08-10T04:30:00.000Z";
  assert.ok(formatInboxTime(iso, "VI"));
  assert.ok(formatMessageTime(iso, "EN"));
  assert.equal(formatInboxTime(null, "VI"), "");
});

test("messages i18n parity keys exist EN/VI", () => {
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  for (const key of [
    "messages.emptyTitle",
    "messages.emptyBody",
    "messages.peerFallback",
    "messages.listingFallback",
    "messages.noMessagesYet",
    "messages.threadEmpty",
    "messages.selectConversation",
    "messages.contextCardTitle",
    "messages.contextCardTitleBreeder",
    "messages.listingUnavailable",
    "messages.sendFailed",
  ] as const) {
    assert.ok(enDict[key], `missing EN ${key}`);
    assert.ok(viDict[key], `missing VI ${key}`);
  }
  assert.equal(viDict["messages.emptyTitle"], "Chưa có hội thoại");
});
