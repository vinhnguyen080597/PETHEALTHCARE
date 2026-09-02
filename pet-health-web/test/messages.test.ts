import test from "node:test";
import assert from "node:assert/strict";
import {
  abortPendingChat,
  appendChatMediaFiles,
  buildOptimisticMessage,
  chatMediaKindFromFile,
  CHAT_MEDIA_PREVIEW_PHOTO,
  CHAT_MEDIA_PREVIEW_VIDEO,
  CHAT_LISTING_SHARE_PREVIEW,
  CHAT_MESSAGE_ROW_CLASS,
  CHAT_TEXT_WRAP_CLASS,
  CHAT_THREAD_SCROLL_CLASS,
  chatBubbleMaxWidthClass,
  conversationFromStartPayload,
  conversationListingThumb,
  conversationListingTitle,
  conversationPeerName,
  conversationPreview,
  countUnreadConversations,
  createOptimisticMessageId,
  filterInboxConversations,
  formatInboxRelativeTime,
  formatInboxTime,
  formatMessageTime,
  INBOX_FILTER_UNREAD,
  inboxPreviewFromMessage,
  isOptimisticMessageId,
  isPendingChatId,
  listingShareFromMessage,
  isChatVideoUrl,
  isConversationBreederViewer,
  isMineMessage,
  mergeConversationLists,
  mergeMessageLists,
  messageHasSendableContent,
  messageMatchesOptimistic,
  messagesPageHref,
  MESSAGES_PAGE_HREF,
  normalizeConversations,
  normalizeListingShare,
  normalizeMessageMedia,
  openConversationUi,
  optimisticChatConversation,
  pendingChatId,
  replacePendingChat,
  removeMessageFromList,
  replaceMessageInList,
  resolveConversationPostSummary,
  withConversationPeerLabel,
} from "../src/lib/messages";
import { sessionAccountUserId } from "../src/lib/sessionUser";
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
  assert.equal(
    conversationPeerName(
      { id: "c1", peer_display_name: "Nguyen Trung Vinh", farm_display_name: "CattiesHouse" },
      "User",
    ),
    "CattiesHouse",
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
    conversationListingTitle(
      { post_id: null, post_title: "", title: "" },
      "Listing",
    ),
    "",
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

test("withConversationPeerLabel stamps the farm or counterpart label", () => {
  assert.deepEqual(
    withConversationPeerLabel({ id: "c1", peer_display_name: "Nguyen" }, "CattiesHouse"),
    {
      id: "c1",
      peer_display_name: "CattiesHouse",
      farm_display_name: "CattiesHouse",
    },
  );
  assert.deepEqual(
    withConversationPeerLabel({ id: "c1", peer_display_name: "Nguyen" }, "  "),
    { id: "c1", peer_display_name: "Nguyen" },
  );
});

test("unread count and mine/breeder helpers", () => {
  assert.equal(
    countUnreadConversations([
      { id: "c1", has_unread: true },
      { id: "c2", has_unread: false },
      { id: "c3", has_unread: true },
    ]),
    2,
  );
  assert.equal(
    countUnreadConversations([
      { id: "pending:breeder:b1", has_unread: true },
      { id: "c1", has_unread: true },
    ]),
    1,
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
    "messages.chats",
    "messages.searchPlaceholder",
    "messages.filterAll",
    "messages.filterUnread",
    "messages.unreadEmpty",
    "messages.seeAll",
    "messages.closeChat",
    "messages.minimizeChat",
    "messages.expandChat",
    "messages.attach",
    "messages.removeAttachment",
    "messages.photo",
    "messages.video",
    "messages.mediaTooMany",
    "messages.mediaUnsupported",
    "messages.videoTooLarge",
    "messages.uploadFailed",
    "messages.startChatFailed",
    "messages.noListingToMessage",
    "messages.startChatSelf",
    "messages.startChatBlocked",
    "messages.chatWithFarm",
  ] as const) {
    assert.ok(enDict[key], `missing EN ${key}`);
    assert.ok(viDict[key], `missing VI ${key}`);
  }
  assert.equal(viDict["messages.emptyTitle"], "Chưa có hội thoại");
  assert.equal(viDict["messages.chats"], "Đoạn chat");
});

test("messagesPageHref and openConversationUi fall back to the inbox page", () => {
  assert.equal(messagesPageHref(null), MESSAGES_PAGE_HREF);
  assert.equal(messagesPageHref(""), MESSAGES_PAGE_HREF);
  assert.equal(messagesPageHref("abc 1"), "/app/messages?c=abc%201");
  const navigated: string[] = [];
  openConversationUi(null, (href) => navigated.push(href));
  openConversationUi("c9", (href) => navigated.push(href));
  assert.deepEqual(navigated, [MESSAGES_PAGE_HREF, "/app/messages?c=c9"]);
});

test("conversationFromStartPayload reads the started thread", () => {
  assert.equal(conversationFromStartPayload(null), null);
  assert.equal(conversationFromStartPayload({}), null);
  assert.deepEqual(
    conversationFromStartPayload({
      data: { id: "c1", peer_display_name: "Lucastalina" },
    }),
    { id: "c1", peer_display_name: "Lucastalina" },
  );
  assert.equal(conversationFromStartPayload({ id: "c2" })?.id, "c2");
});

test("filterInboxConversations matches query and unread", () => {
  const rows = [
    {
      id: "c1",
      peer_display_name: "Hồng Hạnh",
      last_message_preview: "Gửi ảnh",
      has_unread: true,
    },
    {
      id: "c2",
      peer_display_name: "Minh",
      post_title: "Poodle",
      last_message_preview: "Xin chào",
      has_unread: false,
    },
  ];
  assert.deepEqual(
    filterInboxConversations(rows, { filter: INBOX_FILTER_UNREAD }).map((c) => c.id),
    ["c1"],
  );
  assert.deepEqual(
    filterInboxConversations(rows, { query: "poodle" }).map((c) => c.id),
    ["c2"],
  );
  assert.equal(filterInboxConversations(rows, { query: "nope" }).length, 0);
  assert.deepEqual(
    filterInboxConversations(
      [...rows, { id: "pending:listing:p1", peer_display_name: "CattiesHouse" }],
      {},
    ).map((c) => c.id),
    ["c1", "c2"],
  );
});

test("formatInboxRelativeTime uses compact FB-style units", () => {
  const now = Date.parse("2026-08-18T12:00:00.000Z");
  assert.equal(
    formatInboxRelativeTime("2026-08-18T11:59:30.000Z", "VI", now),
    "Vừa xong",
  );
  assert.equal(
    formatInboxRelativeTime("2026-08-18T11:50:00.000Z", "EN", now),
    "10m",
  );
  assert.equal(
    formatInboxRelativeTime("2026-08-14T12:00:00.000Z", "VI", now),
    "4 ngày",
  );
  assert.equal(
    formatInboxRelativeTime("2026-08-11T12:00:00.000Z", "VI", now),
    "1 tuần",
  );
  assert.equal(formatInboxRelativeTime(null, "VI", now), "");
});

test("sessionAccountUserId prefers user_id then id", () => {
  assert.equal(sessionAccountUserId({ user_id: "u1", id: "other" }), "u1");
  assert.equal(sessionAccountUserId({ id: "u2" }), "u2");
  assert.equal(sessionAccountUserId({}), null);
  assert.equal(sessionAccountUserId(null), null);
});

test("mergeMessageLists and mergeConversationLists prefer remote updates", () => {
  const mergedMsgs = mergeMessageLists(
    [
      { id: "m1", body: "a", created_at: "2026-01-01T00:00:00.000Z" },
      { id: "m2", body: "local", created_at: "2026-01-01T00:01:00.000Z" },
    ],
    [
      { id: "m2", body: "remote", created_at: "2026-01-01T00:01:00.000Z" },
      { id: "m3", body: "new", created_at: "2026-01-01T00:02:00.000Z" },
    ],
  );
  assert.deepEqual(
    mergedMsgs.map((m) => m.id),
    ["m1", "m2", "m3"],
  );
  assert.equal(mergedMsgs.find((m) => m.id === "m2")?.body, "remote");

  const optimistic = buildOptimisticMessage({
    id: createOptimisticMessageId(),
    body: "hello",
    senderUserId: "u1",
  });
  optimistic.created_at = "2026-01-01T00:03:00.000Z";
  const deduped = mergeMessageLists(
    [optimistic],
    [
      {
        id: "m-real",
        body: "hello",
        sender_user_id: "u1",
        created_at: "2026-01-01T00:03:05.000Z",
      },
    ],
    { currentUserId: "u1" },
  );
  assert.deepEqual(
    deduped.map((m) => m.id),
    ["m-real"],
  );

  const mergedInbox = mergeConversationLists(
    [{ id: "c1", has_unread: true, last_message_at: "2026-01-01T00:00:00.000Z" }],
    [
      {
        id: "c1",
        has_unread: false,
        last_message_at: "2026-01-01T00:05:00.000Z",
        last_message_preview: "hi",
      },
      { id: "c2", has_unread: true, last_message_at: "2026-01-01T00:06:00.000Z" },
    ],
  );
  assert.equal(mergedInbox[0]?.id, "c2");
  assert.equal(mergedInbox.find((c) => c.id === "c1")?.has_unread, false);
  assert.equal(mergedInbox.find((c) => c.id === "c1")?.last_message_preview, "hi");
});

test("chat media helpers classify files, URLs, and inbox preview", () => {
  assert.equal(isChatVideoUrl("https://cdn.example/pet-feed/videos/a.mp4"), true);
  assert.equal(isChatVideoUrl("https://cdn.example/photos/a.jpg"), false);
  assert.equal(chatMediaKindFromFile({ type: "image/jpeg", name: "a.jpg" }), "image");
  assert.equal(chatMediaKindFromFile({ type: "video/mp4", name: "a.mp4" }), "video");
  assert.equal(chatMediaKindFromFile({ type: "application/pdf", name: "a.pdf" }), null);
  assert.deepEqual(
    normalizeMessageMedia(["https://cdn.example/a.jpg", "not-a-url", ""]),
    ["https://cdn.example/a.jpg"],
  );
  assert.equal(messageHasSendableContent("", 1), true);
  assert.equal(messageHasSendableContent("hi", 0), true);
  assert.equal(messageHasSendableContent("  ", 0), false);
  assert.equal(
    inboxPreviewFromMessage("", ["https://cdn.example/clip.mp4"]),
    CHAT_MEDIA_PREVIEW_VIDEO,
  );
  assert.equal(
    inboxPreviewFromMessage("", ["https://cdn.example/a.jpg"]),
    CHAT_MEDIA_PREVIEW_PHOTO,
  );
  assert.equal(
    inboxPreviewFromMessage("", [], { id: "p1", title: "British Shorthair", thumb_url: null }),
    "British Shorthair",
  );
  assert.equal(
    inboxPreviewFromMessage("", [], { id: "p1", title: "", thumb_url: null }),
    CHAT_LISTING_SHARE_PREVIEW,
  );
  assert.deepEqual(
    normalizeListingShare({ id: " p1 ", title: "  aaa  ", thumb_url: "https://cdn/x.jpg", breed: "Mix" }),
    {
      id: "p1",
      title: "aaa",
      thumb_url: "https://cdn/x.jpg",
      price_note: "",
      species: "",
      breed: "Mix",
      location: "",
      status: "published",
    },
  );
  assert.equal(listingShareFromMessage({ listing_share: { title: "x" } }), null);
  assert.equal(
    listingShareFromMessage({ listing_share: { id: "p9", title: "Kitten" } })?.title,
    "Kitten",
  );
  assert.equal(
    conversationPreview(
      { last_message_preview: CHAT_MEDIA_PREVIEW_PHOTO },
      "empty",
      { photo: "Ảnh", video: "Video" },
    ),
    "Ảnh",
  );
  assert.equal(
    conversationPreview(
      { last_message_preview: CHAT_LISTING_SHARE_PREVIEW },
      "empty",
      { photo: "Ảnh", video: "Video", listing: "Tin đăng" },
    ),
    "Tin đăng",
  );
});

test("appendChatMediaFiles caps count and rejects bad types", () => {
  const photo = { name: "a.jpg", type: "image/jpeg", size: 12 } as File;
  const video = { name: "b.mp4", type: "video/mp4", size: 20 } as File;
  const pdf = { name: "c.pdf", type: "application/pdf", size: 8 } as File;
  const huge = { name: "d.mp4", type: "video/mp4", size: 60 * 1024 * 1024 } as File;
  const first = appendChatMediaFiles([], [photo, video], 4);
  assert.equal(first.files.length, 2);
  assert.equal(first.error, null);
  const tooMany = appendChatMediaFiles([photo, photo, photo, photo], [video], 4);
  assert.equal(tooMany.files.length, 4);
  assert.equal(tooMany.error, "too_many");
  const bad = appendChatMediaFiles([], [pdf]);
  assert.equal(bad.files.length, 0);
  assert.equal(bad.error, "unsupported");
  const large = appendChatMediaFiles([], [huge]);
  assert.equal(large.files.length, 0);
  assert.equal(large.error, "video_too_large");
});

test("chat pane classes keep the dock from stretching horizontally", () => {
  assert.ok(CHAT_THREAD_SCROLL_CLASS.includes("overflow-x-hidden"));
  assert.ok(CHAT_THREAD_SCROLL_CLASS.includes("min-w-0"));
  assert.ok(CHAT_MESSAGE_ROW_CLASS.includes("max-w-full"));
  assert.ok(CHAT_TEXT_WRAP_CLASS.includes("wrap-anywhere"));
  assert.equal(chatBubbleMaxWidthClass(true), "max-w-[min(82%,100%)]");
  assert.equal(chatBubbleMaxWidthClass(), "max-w-[min(80%,100%)]");
});

test("optimistic message helpers build, replace, and match server rows", () => {
  const optimisticId = createOptimisticMessageId();
  assert.equal(isOptimisticMessageId(optimisticId), true);
  assert.equal(isOptimisticMessageId("m-real"), false);
  const optimistic = buildOptimisticMessage({
    id: optimisticId,
    body: "Hi",
    senderUserId: "u1",
  });
  assert.equal(optimistic.body, "Hi");
  assert.equal(optimistic.sender_user_id, "u1");
  const confirmed = {
    id: "m-real",
    body: "Hi",
    sender_user_id: "u1",
    created_at: optimistic.created_at,
  };
  assert.equal(messageMatchesOptimistic(optimistic, confirmed, "u1"), true);
  assert.equal(messageMatchesOptimistic(optimistic, { ...confirmed, body: "Nope" }, "u1"), false);
  const replaced = replaceMessageInList([optimistic], optimisticId, confirmed);
  assert.deepEqual(replaced.map((m) => m.id), ["m-real"]);
  const removed = removeMessageFromList([optimistic, confirmed], optimisticId);
  assert.deepEqual(removed.map((m) => m.id), ["m-real"]);
});

test("optimistic chat opens with a pending id then swaps to the real thread", () => {
  assert.equal(pendingChatId("breeder", "b1"), "pending:breeder:b1");
  assert.equal(isPendingChatId("pending:listing:p1"), true);
  assert.equal(isPendingChatId("c-real"), false);
  const pending = optimisticChatConversation({
    kind: "breeder",
    sourceId: "b1",
    farmName: "CattiesHouse",
  });
  assert.equal(pending?.id, "pending:breeder:b1");
  assert.equal(pending?.farm_display_name, "CattiesHouse");
  assert.equal(pending?.entry_context, "breeder");
  const listingPending = optimisticChatConversation({
    kind: "listing",
    sourceId: "p1",
    farmName: "CattiesHouse",
    listingTitle: "British Shorthair",
  });
  assert.equal(listingPending?.post_title, "British Shorthair");
  assert.equal(listingPending?.entry_context, "listing");
  const replaced = replacePendingChat(
    [pending!],
    pending!.id,
    pending!.id,
    { id: "c-real", farm_display_name: "CattiesHouse", entry_context: "breeder" },
  );
  assert.equal(replaced.activeChatId, "c-real");
  assert.deepEqual(
    replaced.conversations.map((c) => c.id),
    ["c-real"],
  );
  const aborted = abortPendingChat([pending!], pending!.id, pending!.id);
  assert.equal(aborted.activeChatId, null);
  assert.equal(aborted.conversations.length, 0);
  const kept = replacePendingChat(
    [pending!, { id: "other" }],
    "other",
    pending!.id,
    { id: "c-real" },
  );
  assert.equal(kept.activeChatId, "other");
});
