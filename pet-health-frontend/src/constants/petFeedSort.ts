/** Sort chips in Pet Feed quick-filter (post-date is default, not shown as a chip). */
export const PET_FEED_SORT_CHIP_FIELDS = ['age', 'price'] as const;

export type PetFeedSortChipField = (typeof PET_FEED_SORT_CHIP_FIELDS)[number];

/** Internal sort including default newest-first by created_at. */
export type PetFeedSortField = 'date' | PetFeedSortChipField;

export const DEFAULT_PET_FEED_SORT_FIELD: PetFeedSortField = 'date';
export const DEFAULT_PET_FEED_SORT_DIRECTION = 'desc' as const;
