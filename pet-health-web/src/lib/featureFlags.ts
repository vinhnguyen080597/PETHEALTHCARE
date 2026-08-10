/** App feature flags shared by Admin Console and owner farm UI. */

export type AppFeatureFlags = {
  breed_recognition: boolean;
  health_analysis: boolean;
  rewarded_ads: boolean;
  subscription: boolean;
  pet_feed_news: boolean;
  pet_feed_listings: boolean;
  pet_feed_breeders: boolean;
  farm_template_change: boolean;
};

export const DEFAULT_APP_FEATURE_FLAGS: AppFeatureFlags = {
  breed_recognition: true,
  health_analysis: true,
  rewarded_ads: true,
  subscription: true,
  pet_feed_news: true,
  pet_feed_listings: true,
  pet_feed_breeders: true,
  farm_template_change: true,
};

/** Admins always see flags for testing; others respect stored values (default on). */
export function isFarmTemplateChangeEnabled(
  flags: Partial<AppFeatureFlags> | null | undefined,
  isAdmin = false,
): boolean {
  if (isAdmin) return true;
  return flags?.farm_template_change !== false;
}
