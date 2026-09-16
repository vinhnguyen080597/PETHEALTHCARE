import { useTranslation } from 'react-i18next';
import {
  PET_FEED_BREEDER_SORT_PRESETS,
  type PetFeedBreederSortPreset,
} from '../constants/petFeedSort';
import { PetFeedSectionSortHeader } from './PetFeedSectionSortHeader';

type PetFeedAllBreedersHeaderProps = {
  sortPreset: PetFeedBreederSortPreset;
  onSortPresetChange: (preset: PetFeedBreederSortPreset) => void;
  divided?: boolean;
};

const OPTIONS = PET_FEED_BREEDER_SORT_PRESETS.map((key) => ({
  key,
  labelKey: `petFeed.section.allBreeders.sort.${key}`,
}));

export function PetFeedAllBreedersHeader({
  sortPreset,
  onSortPresetChange,
  divided = true,
}: PetFeedAllBreedersHeaderProps) {
  const { t } = useTranslation();
  return (
    <PetFeedSectionSortHeader
      title={t('petFeed.section.allBreeders.title')}
      sortLabel={t('petFeed.section.allBreeders.sortLabel')}
      sortPreset={sortPreset}
      options={OPTIONS}
      onSortPresetChange={onSortPresetChange}
      divided={divided}
      testIDPrefix="pet-feed-all-breeders-sort"
    />
  );
}
