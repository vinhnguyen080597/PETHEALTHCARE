import test from "node:test";
import assert from "node:assert/strict";
import {
  mapNewsCommentRows,
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

test("mapNewsCommentRows accepts data wrapper and flat arrays", () => {
  assert.equal(
    mapNewsCommentRows({
      data: [{ id: "c1", body: "hi", author_display_name: "A", user_id: "u1" }],
    }).length,
    1,
  );
  assert.equal(mapNewsCommentRows([{ id: "c2", body: "yo" }])[0]?.id, "c2");
  assert.equal(mapNewsCommentRows({ data: [{ id: "x", body: "" }] }).length, 0);
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
