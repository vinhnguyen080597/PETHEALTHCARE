import test from "node:test";
import assert from "node:assert/strict";
import {
  formatNewsCommentRelativeTime,
  groupNewsCommentThreads,
  mapNewsCommentRows,
  newsCommentInitials,
  newsEngageLoginHref,
  newsShareExternalUrl,
  shouldPreferNativeShare,
  withOptimisticLikeCount,
} from "../src/lib/newsEngage";

test("shouldPreferNativeShare only on mobile UA with share API", () => {
  assert.equal(
    shouldPreferNativeShare({
      share: (async () => {}) as Navigator["share"],
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    }),
    false,
  );
  assert.equal(
    shouldPreferNativeShare({
      share: (async () => {}) as Navigator["share"],
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    }),
    true,
  );
  assert.equal(shouldPreferNativeShare({ userAgent: "iPhone" } as Navigator), false);
});

test("like count optimistic updates clamp at zero", () => {
  assert.equal(withOptimisticLikeCount(0, false, true), 1);
  assert.equal(withOptimisticLikeCount(1, true, false), 0);
  assert.equal(withOptimisticLikeCount(0, true, false), 0);
});

test("mapNewsCommentRows accepts data wrapper, parent, and avatar", () => {
  const rows = mapNewsCommentRows({
    data: [
      {
        id: "c1",
        body: "hi",
        author_display_name: "A",
        user_id: "u1",
        author_avatar_url: "https://cdn.example/a.jpg",
      },
      {
        id: "c2",
        body: "reply",
        authorDisplayName: "B",
        userId: "u2",
        parentId: "c1",
      },
    ],
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.author_avatar_url, "https://cdn.example/a.jpg");
  assert.equal(rows[1]?.parent_id, "c1");
  assert.equal(mapNewsCommentRows([{ id: "c2", body: "yo" }])[0]?.id, "c2");
  assert.equal(mapNewsCommentRows({ data: [{ id: "x", body: "" }] }).length, 0);
});

test("groupNewsCommentThreads nests one-level replies", () => {
  const threads = groupNewsCommentThreads([
    {
      id: "r1",
      body: "root",
      author_display_name: "A",
      author_avatar_url: null,
      user_id: "u1",
      parent_id: null,
      created_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "c2",
      body: "reply",
      author_display_name: "B",
      author_avatar_url: null,
      user_id: "u2",
      parent_id: "r1",
      created_at: "2026-01-01T01:00:00.000Z",
    },
    {
      id: "orphan",
      body: "orphan reply",
      author_display_name: "C",
      author_avatar_url: null,
      user_id: "u3",
      parent_id: "missing",
      created_at: "2026-01-01T02:00:00.000Z",
    },
  ]);
  assert.equal(threads.length, 1);
  assert.equal(threads[0]?.root.id, "r1");
  assert.deepEqual(
    threads[0]?.replies.map((r) => r.id),
    ["c2"],
  );
});

test("newsCommentInitials and relative time", () => {
  assert.equal(newsCommentInitials("Nho Vinh"), "NV");
  assert.equal(newsCommentInitials("Chau"), "C");
  assert.equal(newsCommentInitials(""), "?");
  const now = Date.parse("2026-08-16T12:00:00.000Z");
  assert.equal(
    formatNewsCommentRelativeTime("2026-08-16T11:59:30.000Z", "VI", now),
    "Vừa xong",
  );
  assert.equal(
    formatNewsCommentRelativeTime("2026-08-16T11:30:00.000Z", "EN", now),
    "30m",
  );
  assert.equal(
    formatNewsCommentRelativeTime("2026-08-16T09:00:00.000Z", "VI", now),
    "3 giờ",
  );
});

test("share helpers build login and external urls", () => {
  assert.match(newsEngageLoginHref(), /next=%2Fapp%2Fnews/);
  assert.match(
    newsShareExternalUrl("facebook", "https://pet-marketplace.org/x"),
    /facebook\.com\/sharer/,
  );
  assert.match(
    newsShareExternalUrl("zalo", "https://pet-marketplace.org/x"),
    /zalo\.me\/share/,
  );
});
