import { useTranslation } from 'react-i18next';
import {
  PET_FEED_LIST_SORT_PRESETS,
  type PetFeedListSortPreset,
} from '../constants/petFeedSort';
import { PetFeedSectionSortHeader } from './PetFeedSectionSortHeader';

type PetFeedAllListingsHeaderProps = {
  sortPreset: PetFeedListSortPreset;
  onSortPresetChange: (preset: PetFeedListSortPreset) => void;
  divided?: boolean;
};

const OPTIONS = PET_FEED_LIST_SORT_PRESETS.map((key) => ({
  key,
  labelKey: `petFeed.section.all.sort.${key}`,
}));

export function PetFeedAllListingsHeader({
  sortPreset,
  onSortPresetChange,
  divided = true,
}: PetFeedAllListingsHeaderProps) {
  const { t } = useTranslation();
  return (
    <PetFeedSectionSortHeader
      title={t('petFeed.section.all.title')}
      sortLabel={t('petFeed.section.all.sortLabel')}
      sortPreset={sortPreset}
      options={OPTIONS}
      onSortPresetChange={onSortPresetChange}
      divided={divided}
      testIDPrefix="pet-feed-all-listings-sort"
    />
  );
}
