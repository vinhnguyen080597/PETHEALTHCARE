import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_APP_FEATURE_FLAGS,
  mergeAppFeatureFlags,
} from "../src/lib/featureFlags";
import {
  ADMIN_FEATURE_CORE_KEYS,
  ADMIN_PET_FEED_TAB_KEYS,
  countEnabledPetFeedTabs,
  isLastEnabledPetFeedTab,
} from "../src/lib/admin/features";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";

test("core flags include ads, subscription, and escrow", () => {
  assert.ok(ADMIN_FEATURE_CORE_KEYS.includes("rewarded_ads"));
  assert.ok(ADMIN_FEATURE_CORE_KEYS.includes("subscription"));
  assert.ok(ADMIN_FEATURE_CORE_KEYS.includes("marketplace_escrow"));
});

test("mergeAppFeatureFlags keeps escrow off unless explicitly true", () => {
  assert.equal(mergeAppFeatureFlags(null).marketplace_escrow, false);
  assert.equal(
    mergeAppFeatureFlags({ breed_recognition: false }).breed_recognition,
    false,
  );
  assert.equal(
    mergeAppFeatureFlags({ marketplace_escrow: true }).marketplace_escrow,
    true,
  );
  assert.equal(
    mergeAppFeatureFlags(
      { marketplace_escrow: false },
      { marketplace_escrow: true },
    ).marketplace_escrow,
    true,
  );
  assert.equal(
    mergeAppFeatureFlags({ unknown: true }).pet_feed_news,
    DEFAULT_APP_FEATURE_FLAGS.pet_feed_news,
  );
});

test("last remaining Pet Feed tab cannot be disabled", () => {
  const onlyNews = mergeAppFeatureFlags({
    pet_feed_news: true,
    pet_feed_listings: false,
    pet_feed_breeders: false,
  });
  assert.equal(countEnabledPetFeedTabs(onlyNews), 1);
  assert.equal(isLastEnabledPetFeedTab(onlyNews, "pet_feed_news"), true);
  assert.equal(isLastEnabledPetFeedTab(onlyNews, "pet_feed_listings"), false);
  assert.equal(isLastEnabledPetFeedTab(onlyNews, "breed_recognition"), false);
  const allOn = mergeAppFeatureFlags({});
  assert.equal(countEnabledPetFeedTabs(allOn), ADMIN_PET_FEED_TAB_KEYS.length);
  assert.equal(isLastEnabledPetFeedTab(allOn, "pet_feed_news"), false);
});

test("every admin feature toggle has EN and VI copy", () => {
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  for (const key of [...ADMIN_FEATURE_CORE_KEYS, ...ADMIN_PET_FEED_TAB_KEYS]) {
    for (const suffix of ["title", "desc"] as const) {
      const i18nKey = `admin.features.${key}.${suffix}`;
      assert.ok(enDict[i18nKey], `missing EN ${i18nKey}`);
      assert.ok(viDict[i18nKey], `missing VI ${i18nKey}`);
    }
  }
  assert.ok(enDict["admin.features.confirmDisable"]);
  assert.ok(viDict["admin.features.confirmDisable"]);
});
