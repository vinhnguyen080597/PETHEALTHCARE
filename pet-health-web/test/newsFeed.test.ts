import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import type { Listing } from "../src/lib/types";
import {
  NEWS_CATEGORY_FILTERS,
  estimateReadMinutes,
  filterNewsPosts,
  initialNewsLikedState,
  newsBodyNeedsExpand,
  newsDescriptionLooksTruncated,
  newsStandardPosts,
  parseNewsCategoryFilter,
  pickFeaturedNewsPost,
  pickTrendingNewsPosts,
  toggleNewsBookmarkId,
} from "../src/lib/newsFeed";

function stubPost(partial: Partial<Listing>): Listing {
  return {
    id: "1",
    title: "Title",
    titleVI: "Title",
    species: "cat",
    breed: "",
    gender: "",
    ageMonths: 0,
    location: "",
    price: "",
    description: "one two three four five",
    descriptionVI: "",
    personality: [],
    personalityVI: [],
    vaccineStatus: "",
    dewormingStatus: "",
    mediaUrl: "https://cdn.example/a.jpg",
    mediaUrls: ["https://cdn.example/a.jpg"],
    status: "published",
    breeder: {} as Listing["breeder"],
    saved: false,
    postKind: "announcement",
    escrowEnabled: false,
    ...partial,
  };
}

test("news category filters include all then announcement types", () => {
  assert.deepEqual(
    NEWS_CATEGORY_FILTERS.map((f) => f.id),
    ["all", "app_update", "health_tip", "community", "general"],
  );
});

test("filterNewsPosts respects category", () => {
  const posts = [
    stubPost({ id: "a", announcementCategory: "app_update" }),
    stubPost({ id: "b", announcementCategory: "health_tip" }),
  ];
  assert.equal(filterNewsPosts(posts, "all").length, 2);
  assert.deepEqual(
    filterNewsPosts(posts, "health_tip").map((p) => p.id),
    ["b"],
  );
  assert.equal(parseNewsCategoryFilter("community"), "community");
  assert.equal(parseNewsCategoryFilter("nope"), "all");
});

test("featured prefers cover post; trending uses engagement", () => {
  const withCover = stubPost({
    id: "cover",
    favoriteCount: 1,
    commentCount: 0,
  });
  const noCover = stubPost({
    id: "plain",
    mediaUrl: "data:image/svg+xml,x",
    mediaUrls: ["data:image/svg+xml,x"],
    favoriteCount: 9,
    commentCount: 2,
  });
  assert.equal(pickFeaturedNewsPost([noCover, withCover])?.id, "cover");
  assert.deepEqual(
    pickTrendingNewsPosts([withCover, noCover], 2).map((p) => p.id),
    ["plain", "cover"],
  );
  assert.deepEqual(
    newsStandardPosts([withCover, noCover], "cover").map((p) => p.id),
    ["plain"],
  );
});

test("estimateReadMinutes and bookmark toggle", () => {
  assert.equal(estimateReadMinutes(""), 1);
  assert.ok(estimateReadMinutes("a ".repeat(250)) >= 2);
  assert.deepEqual(toggleNewsBookmarkId([], "p1"), {
    next: ["p1"],
    bookmarked: true,
  });
  assert.deepEqual(toggleNewsBookmarkId(["p1"], "p1"), {
    next: [],
    bookmarked: false,
  });
});

test("initialNewsLikedState prefers server saved then local cache", () => {
  assert.equal(initialNewsLikedState("a", true, []), true);
  assert.equal(initialNewsLikedState("a", false, ["a"]), true);
  assert.equal(initialNewsLikedState("a", false, ["b"]), false);
});

test("newsBodyNeedsExpand based on length and lines", () => {
  assert.equal(newsBodyNeedsExpand("short"), false);
  assert.equal(newsBodyNeedsExpand("a".repeat(150)), true);
  assert.equal(
    newsBodyNeedsExpand("one\n\ntwo\n\nthree\n\nfour", false),
    true,
  );
  assert.equal(newsBodyNeedsExpand("ok ".repeat(30), true), false);
  assert.equal(newsBodyNeedsExpand("x".repeat(280)), true);
  assert.equal(newsBodyNeedsExpand("short", false, { mediaCount: 3 }), true);
});

test("newsDescriptionLooksTruncated detects list DTO cap", () => {
  assert.equal(newsDescriptionLooksTruncated("short"), false);
  assert.equal(newsDescriptionLooksTruncated("y".repeat(280)), true);
});

test("news feed i18n keys exist EN/VI", () => {
  const keys = [
    "news.filter.all",
    "news.filter.app_update",
    "news.featured",
    "news.trending",
    "news.breederCta.button",
    "news.action.like",
    "news.share.copy",
    "news.comments.send",
    "news.readMore",
    "news.readLess",
  ] as const;
  for (const key of keys) {
    assert.ok(en[key], `missing EN ${key}`);
    assert.ok(vi[key], `missing VI ${key}`);
  }
  assert.match(vi["news.filter.all"], /Tất cả/i);
  assert.match(vi["news.readLess"], /Thu gọn/i);
});
