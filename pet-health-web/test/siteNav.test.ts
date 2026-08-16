import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  NEWS_HREF,
  SITE_MAIN_NAV,
  SUPPORT_HREF,
  announcementCategoryLabelKey,
  isAnnouncementPost,
  parseAnnouncementCategory,
} from "../src/lib/siteNav";

test("main nav puts Tin tức before New Pets, Top Breeders, then Hỗ trợ", () => {
  assert.deepEqual(
    SITE_MAIN_NAV.map((item) => item.href),
    [NEWS_HREF, "/app/pet-feed", "/app/breeders", SUPPORT_HREF],
  );
  assert.deepEqual(
    SITE_MAIN_NAV.map((item) => item.labelKey),
    ["nav.news", "nav.browse", "nav.breeders", "nav.support"],
  );
});

test("nav.news i18n exists EN/VI", () => {
  assert.equal(vi["nav.news"], "Tin tức");
  assert.equal(en["nav.news"], "News");
  assert.equal(vi["nav.browse"], "Thú cưng");
  assert.equal(en["nav.browse"], "New Pets");
  assert.equal(vi["nav.breeders"], "Trại giống");
  assert.equal(en["nav.breeders"], "Top Breeders");
  assert.ok(vi["news.subtitle"]);
  assert.ok(en["news.subtitle"]);
  assert.ok(vi["news.empty"]);
  assert.ok(en["news.empty"]);
});

test("parseAnnouncementCategory falls back to general", () => {
  assert.equal(parseAnnouncementCategory("app_update"), "app_update");
  assert.equal(parseAnnouncementCategory("nope"), "general");
  assert.equal(
    announcementCategoryLabelKey("health_tip"),
    "admin.news.cat.health_tip",
  );
  assert.equal(isAnnouncementPost("announcement"), true);
  assert.equal(isAnnouncementPost("listing"), false);
});
