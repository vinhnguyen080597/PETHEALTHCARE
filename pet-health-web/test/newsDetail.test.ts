import test from "node:test";
import assert from "node:assert/strict";
import type { Listing } from "../src/lib/types";
import {
  buildNewsOgCopy,
  newsAuthorLabel,
  newsCategoryHref,
  newsDetailBackHref,
  newsPostDetailHref,
  parseNewsPostId,
  shouldRenderNewsDetail,
} from "../src/lib/newsDetail";
import { newsShareUrl } from "../src/lib/config";

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

test("news feed deep links use ?post= not a detail route", () => {
  assert.equal(newsDetailBackHref(), "/app/news");
  assert.equal(newsPostDetailHref("p1"), "/app/news?post=p1");
  assert.equal(newsPostDetailHref(""), "/app/news");
  assert.equal(parseNewsPostId("  abc  "), "abc");
  assert.equal(parseNewsPostId(""), null);
  assert.equal(newsCategoryHref("all"), "/app/news");
  assert.equal(newsCategoryHref("health_tip"), "/app/news?category=health_tip");
  assert.match(newsShareUrl("p1"), /\/app\/news\?post=p1$/);
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
