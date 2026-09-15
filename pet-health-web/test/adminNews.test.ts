import test from "node:test";
import assert from "node:assert/strict";
import {
  NEWS_MAX_PHOTOS,
  announcementCategoryOf,
  announcementPublicHref,
  announcementStatusLabelKey,
  buildAdminNewsLivePreview,
  canSubmitNews,
  isPublishedAnnouncement,
  newsPublishError,
  normalizeNewsCtaUrl,
} from "../src/lib/admin/news";

const valid = {
  title: "Spring checkup",
  body: "Bring vaccines.",
};

test("newsPublishError requires title, body, and matching CTA", () => {
  assert.equal(newsPublishError({ title: "", body: "x" }), "admin.news.errorTitle");
  assert.equal(newsPublishError({ title: "Hi", body: "" }), "admin.news.errorBody");
  assert.equal(newsPublishError(valid), null);
  assert.equal(
    newsPublishError({ ...valid, ctaLabel: "Read" }),
    "admin.news.errorCta",
  );
  assert.equal(
    newsPublishError({ ...valid, ctaUrl: "https://example.com" }),
    "admin.news.errorCta",
  );
  assert.equal(
    newsPublishError({
      ...valid,
      ctaLabel: "Read",
      ctaUrl: "javascript:alert(1)",
    }),
    "admin.news.errorCtaUrl",
  );
  assert.equal(
    newsPublishError({
      ...valid,
      ctaLabel: "Read",
      ctaUrl: "example.com/guide",
    }),
    null,
  );
  assert.equal(
    newsPublishError({
      ...valid,
      ctaLabel: "Read",
      ctaUrl: "https://example.com/guide",
    }),
    null,
  );
  assert.equal(canSubmitNews(valid), true);
});

test("normalizeNewsCtaUrl adds https for bare domains", () => {
  assert.equal(normalizeNewsCtaUrl(""), "");
  assert.equal(normalizeNewsCtaUrl("https://a.com"), "https://a.com");
  assert.equal(normalizeNewsCtaUrl("example.com/x"), "https://example.com/x");
  assert.equal(normalizeNewsCtaUrl("javascript:alert(1)"), "javascript:alert(1)");
});

test("newsPublishError rejects oversized title/body and bad photos", () => {
  assert.equal(
    newsPublishError({ title: "x".repeat(121), body: "ok" }),
    "admin.news.errorTitleMax",
  );
  assert.equal(
    newsPublishError({ title: "ok", body: "y".repeat(2001) }),
    "admin.news.errorBodyMax",
  );
  assert.equal(
    newsPublishError({
      ...valid,
      photos: Array.from({ length: NEWS_MAX_PHOTOS + 1 }, () => ({
        type: "image/jpeg",
        name: "a.jpg",
        size: 10,
      })),
    }),
    "admin.news.errorTooManyPhotos",
  );
  assert.equal(
    newsPublishError({
      ...valid,
      photos: [{ type: "image/gif", name: "x.gif", size: 10 }],
    }),
    "admin.news.errorPhotoType",
  );
  assert.equal(
    newsPublishError({
      ...valid,
      photos: [{ type: "image/png", name: "x.png", size: 9 * 1024 * 1024 }],
    }),
    "admin.news.errorPhotoSize",
  );
});

test("announcement helpers map category, status, and public href", () => {
  assert.equal(
    announcementPublicHref("news 1"),
    "/app/news?post=news%201",
  );
  assert.equal(
    announcementCategoryOf({ metadata: { category: "health_tip" } }),
    "health_tip",
  );
  assert.equal(announcementCategoryOf({ metadata: { category: "nope" } }), "general");
  assert.equal(announcementStatusLabelKey("archived"), "listing.status.archived");
  assert.equal(isPublishedAnnouncement({ status: "published" }), true);
  assert.equal(isPublishedAnnouncement({ status: "archived" }), false);
});

test("buildAdminNewsLivePreview mirrors form fields for live card", () => {
  const empty = buildAdminNewsLivePreview({
    title: "  ",
    body: "",
    category: "general",
  });
  assert.equal(empty.hasTitle, false);
  assert.equal(empty.hasBody, false);
  assert.equal(empty.coverUrl, null);
  assert.equal(empty.ctaLabel, "");

  const full = buildAdminNewsLivePreview({
    title: " Spring tip ",
    body: "Walk your pup.",
    category: "health_tip",
    ctaLabel: "Read",
    ctaUrl: "https://example.com",
    photoUrls: ["blob:cover", "blob:extra"],
    authorLabel: "PetCare Admin",
  });
  assert.equal(full.hasTitle, true);
  assert.equal(full.title, "Spring tip");
  assert.equal(full.category, "health_tip");
  assert.equal(full.coverUrl, "blob:cover");
  assert.deepEqual(full.photoUrls, ["blob:cover", "blob:extra"]);
  assert.equal(full.ctaLabel, "Read");
  assert.equal(full.ctaUrl, "https://example.com");

  const badCta = buildAdminNewsLivePreview({
    title: "Hi",
    body: "Body",
    category: "general",
    ctaLabel: "Go",
    ctaUrl: "javascript:alert(1)",
  });
  assert.equal(badCta.ctaLabel, "");
  assert.equal(badCta.ctaUrl, "");
});
