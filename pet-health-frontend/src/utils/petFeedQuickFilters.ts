import { ALL_PROVINCES_FILTER, type ProvinceFilter } from '../constants/vietnamProvinces.ts';
import {
  DEFAULT_PET_FEED_SORT_DIRECTION,
  DEFAULT_PET_FEED_SORT_FIELD,
  type PetFeedSortField,
} from '../constants/petFeedSort.ts';
import type { GenderFilter } from './petFeedGender.ts';

type SortDirection = 'asc' | 'desc';

/**
 * Sidebar "Lọc nhanh" highlight — excludes species chips (those live in PetTypeFilterRow).
 */
export function isPetFeedQuickFilterActive(input: {
  provinceFilter: ProvinceFilter;
  genderFilter: GenderFilter;
  sortField: PetFeedSortField;
  sortDirection: SortDirection;
}): boolean {
  return (
    input.provinceFilter !== ALL_PROVINCES_FILTER
    || input.genderFilter !== 'all'
    || input.sortField !== DEFAULT_PET_FEED_SORT_FIELD
    || input.sortDirection !== DEFAULT_PET_FEED_SORT_DIRECTION
  );
}
