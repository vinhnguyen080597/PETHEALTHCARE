import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BRAND } from '../theme/brand';
import {
  findAppLanguage,
  resolveAppLanguageCode,
} from '../utils/appLanguages';
import { LanguageBottomSheet } from './LanguageBottomSheet';
import { LanguageCountryFlag } from './LanguageCountryFlag';

type LanguageHeaderChipProps = {
  /** Absolute top-right overlay; default true for auth screens. */
  absolute?: boolean;
};

/**
 * Compact header language control: small flag + chevron.
 * Positions with safe-area inset so it clears status-bar icons.
 */
export function LanguageHeaderChip({ absolute = true }: LanguageHeaderChipProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const current = findAppLanguage(resolveAppLanguageCode(i18n.language));
  // Clear status bar / notch, then nudge down a bit more for tap comfort.
  const topOffset = insets.top + 12;

  return (
    <>
      <View
        className={absolute ? 'absolute right-4 z-20' : undefined}
        style={absolute ? { top: topOffset } : undefined}
        pointerEvents="box-none"
      >
        <Pressable
          testID="language-header-chip"
          accessibilityRole="button"
          accessibilityLabel={t('language.openPicker')}
          className="flex-row items-center gap-1 rounded-full border border-[#E2E8F0] bg-white px-2 py-1 active:bg-orange-50"
          onPress={() => setOpen(true)}
        >
          <LanguageCountryFlag isoCode={current.countryIsoCode} size={12} />
          <Ionicons name="chevron-down" size={12} color={BRAND.textMuted} />
        </Pressable>
      </View>
      <LanguageBottomSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** @deprecated Prefer LanguageHeaderChip — kept for existing imports. */
export function LanguageToggle() {
  return <LanguageHeaderChip absolute={false} />;
}
