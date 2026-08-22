import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ACTIVE_PET_FEED_SPECIES, type ActivePetFeedSpecies } from '../constants/petSpecies';
import { BRAND } from '../theme/brand';
import type { PetTypeFilter } from '../utils/petType';

type PetTypeIconSpec =
  | { library: 'fa5'; name: keyof typeof FontAwesome5.glyphMap }
  | { library: 'mci'; name: keyof typeof MaterialCommunityIcons.glyphMap };

const PET_TYPE_ICONS: Record<ActivePetFeedSpecies, PetTypeIconSpec> = {
  dog: { library: 'fa5', name: 'dog' },
  cat: { library: 'fa5', name: 'cat' },
  hamster: { library: 'mci', name: 'rodent' },
  fish: { library: 'fa5', name: 'fish' },
};

function PetTypeIcon({ spec, color }: { spec: PetTypeIconSpec; color: string }) {
  if (spec.library === 'mci') {
    return <MaterialCommunityIcons name={spec.name} size={14} color={color} />;
  }
  return <FontAwesome5 name={spec.name} size={13} color={color} />;
}

type PetTypeFilterRowProps = {
  value: PetTypeFilter;
  onChange: (next: PetTypeFilter) => void;
};

export function PetTypeFilterRow({ value, onChange }: PetTypeFilterRowProps) {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="bg-white"
      contentContainerClassName="flex-row gap-4 px-5 pb-2.5 pt-0"
    >
      {ACTIVE_PET_FEED_SPECIES.map((petType) => {
        const active = value === petType;
        const iconColor = active ? BRAND.btnPrimary : BRAND.textMuted;
        return (
          <Pressable
            key={petType}
            testID={`pet-type-filter-${petType}`}
            accessibilityRole="button"
            accessibilityLabel={t(`petFeed.filters.${petType}`)}
            accessibilityState={{ selected: active }}
            className="items-center gap-0.5"
            onPress={() => onChange(active ? 'all' : petType)}
          >
            <View
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{
                borderWidth: 1,
                borderColor: active ? BRAND.btnPrimary : '#E5E7EB',
                backgroundColor: active ? BRAND.surfaceLight : '#F8FAFC',
              }}
            >
              <PetTypeIcon spec={PET_TYPE_ICONS[petType]} color={iconColor} />
            </View>
            <Text
              className="text-[10px] font-semibold"
              style={{ color: active ? BRAND.textBrandLink : BRAND.textMuted }}
            >
              {t(`petFeed.filters.${petType}`)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
