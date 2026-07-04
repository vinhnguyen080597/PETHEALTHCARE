import type { AppFeatureFlags } from '../types';

export const PET_FEED_TAB_FLAG_KEYS = ['pet_feed_news', 'pet_feed_listings', 'pet_feed_breeders'] as const;
export type PetFeedTabFlagKey = (typeof PET_FEED_TAB_FLAG_KEYS)[number];

export type PetFeedScreenTab = 'feed' | 'news' | 'breeders';

export const PET_FEED_TAB_TO_FLAG: Record<PetFeedScreenTab, PetFeedTabFlagKey> = {
  news: 'pet_feed_news',
  feed: 'pet_feed_listings',
  breeders: 'pet_feed_breeders',
};

export const PET_FEED_TAB_ORDER: PetFeedScreenTab[] = ['news', 'feed', 'breeders'];

export function countEnabledPetFeedTabs(flags: AppFeatureFlags | null) {
  return PET_FEED_TAB_FLAG_KEYS.filter((key) => flags?.[key] !== false).length;
}

export function isPetFeedTabEnabled(flags: AppFeatureFlags | null, tab: PetFeedScreenTab) {
  return flags?.[PET_FEED_TAB_TO_FLAG[tab]] !== false;
}

export function firstEnabledPetFeedTab(flags: AppFeatureFlags | null): PetFeedScreenTab {
  return PET_FEED_TAB_ORDER.find((tab) => isPetFeedTabEnabled(flags, tab)) ?? 'feed';
}
