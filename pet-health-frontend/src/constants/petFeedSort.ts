/** Sort chips in Pet Feed quick-filter (post-date is default, not shown as a chip). */
export const PET_FEED_SORT_CHIP_FIELDS = ['age', 'price'] as const;

export type PetFeedSortChipField = (typeof PET_FEED_SORT_CHIP_FIELDS)[number];

/** Internal sort including default newest-first by created_at. */
export type PetFeedSortField = 'date' | PetFeedSortChipField;

export const DEFAULT_PET_FEED_SORT_FIELD: PetFeedSortField = 'date';
export const DEFAULT_PET_FEED_SORT_DIRECTION = 'desc' as const;

/** Section divider presets under “Top bé được quan tâm”. */
export const PET_FEED_LIST_SORT_PRESETS = ['newest', 'best_price', 'nearest'] as const;
export type PetFeedListSortPreset = (typeof PET_FEED_LIST_SORT_PRESETS)[number];
export const DEFAULT_PET_FEED_LIST_SORT_PRESET: PetFeedListSortPreset = 'newest';

/** Section divider presets under “Trại tiêu biểu”. */
export const PET_FEED_BREEDER_SORT_PRESETS = ['newest', 'top_rated', 'nearest'] as const;
export type PetFeedBreederSortPreset = (typeof PET_FEED_BREEDER_SORT_PRESETS)[number];
export const DEFAULT_PET_FEED_BREEDER_SORT_PRESET: PetFeedBreederSortPreset = 'top_rated';
