import type { AppFeatureFlags } from "../featureFlags";

export const ADMIN_FEATURE_CORE_KEYS = [
  "breed_recognition",
  "health_analysis",
  "rewarded_ads",
  "subscription",
  "farm_template_change",
] as const satisfies readonly (keyof AppFeatureFlags)[];

export type AdminFeatureCoreKey = (typeof ADMIN_FEATURE_CORE_KEYS)[number];

export const ADMIN_PET_FEED_TAB_KEYS = [
  "pet_feed_news",
  "pet_feed_listings",
  "pet_feed_breeders",
] as const satisfies readonly (keyof AppFeatureFlags)[];

export type AdminPetFeedTabKey = (typeof ADMIN_PET_FEED_TAB_KEYS)[number];

export function isAdminPetFeedTabKey(
  value: string | null | undefined,
): value is AdminPetFeedTabKey {
  return (ADMIN_PET_FEED_TAB_KEYS as readonly string[]).includes(
    String(value || ""),
  );
}

export function countEnabledPetFeedTabs(flags: AppFeatureFlags): number {
  return ADMIN_PET_FEED_TAB_KEYS.filter((key) => flags[key]).length;
}

/** Last remaining Pet Feed tab cannot be turned off. */
export function isLastEnabledPetFeedTab(
  flags: AppFeatureFlags,
  key: keyof AppFeatureFlags,
): boolean {
  return (
    isAdminPetFeedTabKey(key) &&
    flags[key] === true &&
    countEnabledPetFeedTabs(flags) <= 1
  );
}

export function featureFlagTitleKey(
  key: keyof AppFeatureFlags,
): `admin.features.${keyof AppFeatureFlags}.title` {
  return `admin.features.${key}.title`;
}

export function featureFlagDescKey(
  key: keyof AppFeatureFlags,
): `admin.features.${keyof AppFeatureFlags}.desc` {
  return `admin.features.${key}.desc`;
}
