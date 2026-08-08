import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import { FARM_DETAIL_TABS, farmTabI18nKey } from "../src/lib/farmTabs";

test("farm detail tabs are overview, listings, warranty only", () => {
  assert.deepEqual([...FARM_DETAIL_TABS], ["overview", "listings", "warranty"]);
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

test("video CTA soon tooltip exists in EN and VI", () => {
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  assert.equal(viDict["farm.cta.videoSoon"], "Tính năng đang phát triển");
  assert.ok(enDict["farm.cta.videoSoon"]);
  assert.notEqual(enDict["farm.cta.videoSoon"], "farm.cta.videoSoon");
});
