import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import type { Listing } from "../src/lib/types";
import {
  buildNewsOgCopy,
  newsAuthorLabel,
  newsCategoryHref,
  newsDetailBackHref,
  newsPostDetailHref,
  shouldRenderNewsDetail,
} from "../src/lib/newsDetail";

function stubPost(partial: Partial<Listing> = {}): Listing {
  return {
    id: "abc-123",
    title: "Care tip title",
    titleVI: "",
    species: "",
    breed: "",
    gender: "",
    ageMonths: 0,
    location: "",
    price: "",
    description: "Line one.\n\nLine two with enough text for OG.",
    descriptionVI: "",
    personality: [],
    personalityVI: [],
    vaccineStatus: "",
    dewormingStatus: "",
    mediaUrl: "",
    mediaUrls: [],
    status: "published",
    breeder: {} as Listing["breeder"],
    saved: false,
    postKind: "announcement",
    escrowEnabled: false,
    ...partial,
  };
}

test("news detail hrefs and category URL sync", () => {
  assert.equal(newsDetailBackHref(), "/app/news");
  assert.equal(newsPostDetailHref("p1"), "/app/news/p1");
  assert.equal(newsCategoryHref("all"), "/app/news");
  assert.equal(newsCategoryHref("health_tip"), "/app/news?category=health_tip");
  assert.equal(newsCategoryHref("nope"), "/app/news");
});

test("shouldRenderNewsDetail only for announcements", () => {
  assert.equal(shouldRenderNewsDetail(stubPost()), true);
  assert.equal(shouldRenderNewsDetail(stubPost({ postKind: "listing" })), false);
  assert.equal(shouldRenderNewsDetail(null), false);
});

test("newsAuthorLabel prefers metadata then fallback", () => {
  assert.equal(newsAuthorLabel({ authorLabel: "  Farm Desk  " }, "Admin"), "Farm Desk");
  assert.equal(newsAuthorLabel({ authorLabel: "" }, "Admin"), "Admin");
  assert.equal(newsAuthorLabel(null, "Admin"), "Admin");
});

test("buildNewsOgCopy uses title and trimmed description", () => {
  const copy = buildNewsOgCopy(stubPost());
  assert.equal(copy.title, "Care tip title");
  assert.match(copy.description, /Line one/);
  assert.ok(!copy.description.includes("\n"));
});

test("news detail i18n keys exist EN/VI", () => {
  assert.ok(en["news.detail.back"]);
  assert.ok(vi["news.detail.back"]);
  assert.match(vi["news.detail.back"], /Tin tức/i);
});
