import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const INK = '#2B1E19';
const MUTED = '#6E5A51';
const ACCENT = '#B45309';
const BORDER = '#E8DFD0';

export type PetFeedSectionSortOption<T extends string> = {
  key: T;
  labelKey: string;
};

type PetFeedSectionSortHeaderProps<T extends string> = {
  title: string;
  sortLabel: string;
  sortPreset: T;
  options: Array<PetFeedSectionSortOption<T>>;
  onSortPresetChange: (preset: T) => void;
  divided?: boolean;
  testIDPrefix?: string;
};

/** Shared divider: section title + sort dropdown (listings / breeders). */
export function PetFeedSectionSortHeader<T extends string>({
  title,
  sortLabel,
  sortPreset,
  options,
  onSortPresetChange,
  divided = true,
  testIDPrefix = 'pet-feed-section-sort',
}: PetFeedSectionSortHeaderProps<T>) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const activeLabelKey = options.find((opt) => opt.key === sortPreset)?.labelKey
    ?? options[0]?.labelKey
    ?? '';

  return (
    <View
      className="px-5 pb-3 pt-1"
      style={
        divided
          ? {
              marginTop: 4,
              borderTopWidth: 1,
              borderTopColor: BORDER,
              paddingTop: 16,
            }
          : undefined
      }
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text className="min-w-0 flex-1 text-xl font-semibold tracking-tight" style={{ color: INK }}>
          {title}
        </Text>
        <Pressable
          testID={`${testIDPrefix}-button`}
          accessibilityRole="button"
          accessibilityLabel={sortLabel}
          className="max-w-[52%] flex-row items-center gap-1 rounded-full border bg-white px-3 py-2 active:bg-[#FFF8F0]"
          style={{ borderColor: BORDER }}
          onPress={() => setMenuOpen(true)}
        >
          <Ionicons name="swap-vertical-outline" size={14} color={ACCENT} />
          <Text className="shrink text-xs font-semibold" style={{ color: ACCENT }} numberOfLines={1}>
            {activeLabelKey ? t(activeLabelKey) : ''}
          </Text>
          <Ionicons name="chevron-down" size={14} color={MUTED} />
        </Pressable>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable
          className="flex-1 justify-end bg-black/25"
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          onPress={() => setMenuOpen(false)}
        >
          <Pressable
            className="rounded-t-3xl border border-[#E8DFD0] bg-white px-4 pb-8 pt-3"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="mb-3 items-center">
              <View className="h-1 w-10 rounded-full bg-[#E8DFD0]" />
            </View>
            <Text className="mb-2 text-sm font-bold" style={{ color: INK }}>
              {sortLabel}
            </Text>
            {options.map((opt) => {
              const active = sortPreset === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  testID={`${testIDPrefix}-${opt.key}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className={`mb-1 flex-row items-center justify-between rounded-2xl px-3 py-3.5 ${
                    active ? 'bg-[#FFF1DE]' : 'bg-transparent'
                  }`}
                  onPress={() => {
                    onSortPresetChange(opt.key);
                    setMenuOpen(false);
                  }}
                >
                  <Text
                    className={`text-sm font-semibold ${active ? 'text-[#B45309]' : 'text-[#5C4A3A]'}`}
                  >
                    {t(opt.labelKey)}
                  </Text>
                  {active ? <Ionicons name="checkmark" size={18} color={ACCENT} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
