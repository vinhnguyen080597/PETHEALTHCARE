import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '../i18n';
import { BRAND } from '../theme/brand';
import {
  filterAppLanguages,
  resolveAppLanguageCode,
  shouldShowLanguageSearch,
  type AppLanguageCode,
  type AppLanguageOption,
} from '../utils/appLanguages';
import { modalBottomInset } from '../utils/modalSafeArea';
import { LanguageCountryFlag } from './LanguageCountryFlag';

type LanguageBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
};

function languageTestId(code: AppLanguageCode) {
  if (code === 'en') return 'language-english-button';
  if (code === 'vi') return 'language-vietnamese-button';
  return `language-${code}-button`;
}

export function LanguageBottomSheet({ visible, onClose }: LanguageBottomSheetProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const selectedCode = resolveAppLanguageCode(i18n.language);
  const showSearch = shouldShowLanguageSearch();
  const options = useMemo(() => filterAppLanguages(query), [query]);

  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  async function selectLanguage(option: AppLanguageOption) {
    await setAppLanguage(option.code);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" pointerEvents="box-none">
        <Pressable
          testID="language-sheet-backdrop"
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          className="absolute inset-0 bg-transparent"
          onPress={onClose}
        />
        <View
          testID="language-bottom-sheet"
          className="rounded-t-3xl border border-[#E2E8F0] bg-white shadow-lg"
          style={{ paddingBottom: modalBottomInset(insets.bottom, 16), maxHeight: '78%' }}
        >
          <View className="items-center pb-2 pt-3">
            <View className="h-1 w-10 rounded-full bg-slate-200" />
          </View>
          <View className="flex-row items-center justify-between px-5 pb-3">
            <Text className="text-lg font-bold text-slate-900">{t('language.sheetTitle')}</Text>
            <Pressable
              testID="language-sheet-close-button"
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
              onPress={onClose}
            >
              <Ionicons name="close" size={20} color="#64748b" />
            </Pressable>
          </View>

          {showSearch ? (
            <View className="mx-5 mb-3 flex-row items-center rounded-xl border border-[#E2E8F0] bg-slate-50 px-3">
              <Ionicons name="search" size={18} color="#94a3b8" />
              <TextInput
                testID="language-search-input"
                className="min-h-[44px] flex-1 px-2 py-2 text-base text-slate-900"
                placeholder={t('language.searchPlaceholder')}
                placeholderTextColor="#94a3b8"
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
          ) : null}

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 8 }}
          >
            {options.length === 0 ? (
              <Text className="rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                {t('language.searchEmpty')}
              </Text>
            ) : (
              options.map((option) => {
                const selected = option.code === selectedCode;
                return (
                  <Pressable
                    key={option.code}
                    testID={languageTestId(option.code)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className={`flex-row items-center gap-3 rounded-2xl border px-4 py-4 active:opacity-90 ${
                      selected ? 'border-orange-300 bg-orange-50' : 'border-[#E2E8F0] bg-white'
                    }`}
                    onPress={() => void selectLanguage(option)}
                  >
                    <LanguageCountryFlag isoCode={option.countryIsoCode} size={20} />
                    <Text className="min-w-0 flex-1 text-base font-semibold text-slate-900">
                      {option.nativeName}
                    </Text>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={22} color={BRAND.primary} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={22} color="#cbd5e1" />
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
