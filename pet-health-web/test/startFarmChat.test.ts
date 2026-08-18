import test from "node:test";
import assert from "node:assert/strict";
import {
  farmConversationStartUrls,
  openFarmChatUi,
  preferredListingIdForFarmChat,
  shouldRetryFarmChatFallback,
  startChatMessageKey,
} from "../src/lib/startFarmChat";
import {
  MESSAGES_PAGE_HREF,
  withConversationEntryContext,
  type MessageConversation,
} from "../src/lib/messages";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";

test("preferredListingIdForFarmChat prefers thumbs then open listings", () => {
  assert.equal(
    preferredListingIdForFarmChat({ listingId: "p1", petThumbs: [{ listingId: "t1" }] }),
    "p1",
  );
  assert.equal(
    preferredListingIdForFarmChat({ petThumbs: [{ listingId: "t1" }] }),
    "t1",
  );
  assert.equal(
    preferredListingIdForFarmChat({
      listings: [
        { id: "sold", status: "sold" },
        { id: "live", status: "published" },
      ],
    }),
    "live",
  );
  assert.equal(
    preferredListingIdForFarmChat({
      listings: [{ id: "hold", status: "deposit_hold" }],
    }),
    "hold",
  );
  assert.equal(preferredListingIdForFarmChat({ listings: [{ id: "sold", status: "sold" }] }), null);
  assert.equal(preferredListingIdForFarmChat({}), null);
});

test("farmConversationStartUrls uses farm URL when a breeder id is present", () => {
  assert.deepEqual(farmConversationStartUrls({}), []);
  assert.deepEqual(farmConversationStartUrls({ listingId: "p1" }), [
    "/api/listings/p1/conversations",
  ]);
  assert.deepEqual(farmConversationStartUrls({ breederId: "b1" }), [
    "/api/breeders/b1/conversations",
  ]);
  assert.deepEqual(
    farmConversationStartUrls({ listingId: "p 1", breederId: "b/1" }),
    ["/api/breeders/b%2F1/conversations"],
  );
});

test("shouldRetryFarmChatFallback only retries missing listings", () => {
  assert.equal(shouldRetryFarmChatFallback(404), true);
  assert.equal(shouldRetryFarmChatFallback(404, "PET_FEED_POST_NOT_FOUND"), true);
  assert.equal(shouldRetryFarmChatFallback(400, "PET_FEED_MESSAGE_SELF"), false);
  assert.equal(shouldRetryFarmChatFallback(401), false);
  assert.equal(shouldRetryFarmChatFallback(403, "PET_FEED_BREEDER_BLOCKED"), false);
});

test("startChatMessageKey maps farm chat errors", () => {
  assert.equal(startChatMessageKey(404, "PET_FEED_NO_LISTING_TO_MESSAGE"), "messages.noListingToMessage");
  assert.equal(startChatMessageKey(400, "PET_FEED_MESSAGE_SELF"), "messages.startChatSelf");
  assert.equal(startChatMessageKey(403, "PET_FEED_BREEDER_BLOCKED"), "messages.startChatBlocked");
  assert.equal(startChatMessageKey(500), "messages.startChatFailed");
});

test("openFarmChatUi prefers dock openChat over page navigation", () => {
  const opened: Array<{ id: string; name?: string; entry?: string }> = [];
  const conversation: MessageConversation = {
    id: "c1",
    peer_display_name: "Lucastalina",
  };
  const skippedNav: string[] = [];
  openFarmChatUi(conversation, {
    farmName: "CattiesHouse",
    openChat: (id, row) =>
      opened.push({
        id,
        name: row?.peer_display_name,
        entry: row?.entry_context,
      }),
    navigate: (href: string) => skippedNav.push(href),
  });
  assert.deepEqual(opened, [{ id: "c1", name: "CattiesHouse", entry: "breeder" }]);
  assert.deepEqual(skippedNav, []);

  const navigated: string[] = [];
  openFarmChatUi(conversation, {
    navigate: (href: string) => navigated.push(href),
  });
  assert.deepEqual(navigated, [`${MESSAGES_PAGE_HREF}?c=c1`]);
});

test("withConversationEntryContext tags breeder-origin chat ui", () => {
  assert.deepEqual(
    withConversationEntryContext(
      { id: "c1", peer_display_name: "Farm A" } satisfies MessageConversation,
      "breeder",
    ),
    { id: "c1", peer_display_name: "Farm A", entry_context: "breeder" },
  );
});

test("farm chat i18n keys exist EN/VI", () => {
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  for (const key of [
    "messages.startChatFailed",
    "messages.noListingToMessage",
    "messages.startChatSelf",
    "messages.startChatBlocked",
    "messages.chatWithFarm",
  ] as const) {
    assert.ok(enDict[key], `missing EN ${key}`);
    assert.ok(viDict[key], `missing VI ${key}`);
  }
  assert.equal(viDict["messages.startChatFailed"], "Không mở được chat với trại này.");
  assert.equal(viDict["messages.chatWithFarm"], "Nhắn tin với trại");
});
