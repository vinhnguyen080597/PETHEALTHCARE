import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  FARM_DETAIL_TABS,
  farmDetailHref,
  farmProfileFromAccountHref,
  farmTabI18nKey,
  parseFarmDetailTab,
  warrantySaveNextHref,
} from "../src/lib/farmTabs";

test("farm detail tabs are overview, listings, warranty only", () => {
  assert.deepEqual([...FARM_DETAIL_TABS], ["overview", "listings", "warranty"]);
});

test("parseFarmDetailTab accepts known tabs only", () => {
  assert.equal(parseFarmDetailTab("warranty"), "warranty");
  assert.equal(parseFarmDetailTab("listings"), "listings");
  assert.equal(parseFarmDetailTab("nope"), null);
  assert.equal(parseFarmDetailTab(null), null);
});

test("warranty save Không returns farm warranty deep link", () => {
  assert.equal(warrantySaveNextHref(true, "bp1"), null);
  assert.equal(
    warrantySaveNextHref(false, "bp1"),
    "/app/breeders/bp1?tab=warranty",
  );
  assert.equal(farmDetailHref("bp1", "overview"), "/app/breeders/bp1");
});

test("farm profile from Account href sets from=account", () => {
  assert.equal(
    farmProfileFromAccountHref("bp1"),
    "/app/breeders/bp1?from=account",
  );
  assert.equal(
    farmDetailHref("bp1", "warranty", { from: "account" }),
    "/app/breeders/bp1?tab=warranty&from=account",
  );
});

test("every farm detail tab has EN and VI labels", () => {
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  for (const tab of FARM_DETAIL_TABS) {
    const key = farmTabI18nKey(tab);
    assert.ok(enDict[key], `missing EN key ${key}`);
    assert.ok(viDict[key], `missing VI key ${key}`);
    assert.notEqual(enDict[key], key);
    assert.notEqual(viDict[key], key);
  }
});

test("review and facility remain section labels inside overview", () => {
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  for (const key of [
    "farm.tab.reviews",
    "farm.tab.facility",
    "farm.trust.scoreTitle",
  ] as const) {
    assert.ok(enDict[key], `missing EN key ${key}`);
    assert.ok(viDict[key], `missing VI key ${key}`);
  }
  assert.equal(viDict["farm.tab.overview"], "Tổng quan");
  assert.equal(enDict["farm.tab.overview"], "Overview");
});

test("farm listings tab is named Thú cưng / Pets", () => {
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  assert.equal(viDict["farm.tab.listings"], "Thú cưng");
  assert.equal(enDict["farm.tab.listings"], "Pets");
  assert.ok(viDict["farm.listings.sold"]);
  assert.ok(enDict["farm.listings.sold"]);
  assert.ok(viDict["farm.listings.forSale"]);
  assert.ok(enDict["farm.listings.forSale"]);
  assert.equal(viDict["farm.listings.createPost"], "Tạo bài đăng");
  assert.ok(enDict["farm.listings.createPost"]);
  assert.ok(viDict["farm.listings.empty"]);
  assert.equal(viDict["farm.listings.status.for_sale"], "đang tìm chủ");
  assert.equal(viDict["farm.listings.status.deposit_hold"], "đã cọc");
  assert.equal(viDict["farm.listings.status.completed"], "đã hoàn thành");
  assert.ok(enDict["farm.listings.status.for_sale"]);
  assert.ok(enDict["farm.listings.filter"]);
  assert.ok(viDict["farm.listings.filter"]);
  assert.equal(viDict["farm.listings.filterAll"], "Tất cả");
  assert.equal(enDict["farm.listings.filterAll"], "All");
});

test("video CTA soon tooltip exists in EN and VI", () => {
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  assert.equal(viDict["farm.cta.videoSoon"], "Tính năng đang phát triển");
  assert.ok(enDict["farm.cta.videoSoon"]);
  assert.notEqual(enDict["farm.cta.videoSoon"], "farm.cta.videoSoon");
});
