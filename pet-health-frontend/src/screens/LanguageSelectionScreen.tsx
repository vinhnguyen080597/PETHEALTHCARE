import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LanguageCountryFlag } from '../components/LanguageCountryFlag';
import { setAppLanguage } from '../i18n';
import { BRAND } from '../theme/brand';
import {
  APP_LANGUAGES,
  resolveAppLanguageCode,
} from '../utils/appLanguages';

type LanguageSelectionScreenProps = {
  onBack: () => void;
};

function languageTestId(code: string) {
  if (code === 'en') return 'language-selection-english';
  if (code === 'vi') return 'language-selection-vietnamese';
  return `language-selection-${code}`;
}

export function LanguageSelectionScreen({ onBack }: LanguageSelectionScreenProps) {
  const { t, i18n } = useTranslation();
  const selectedCode = resolveAppLanguageCode(i18n.language);

  return (
    <ScrollView
      testID="language-selection-screen"
      className="flex-1 bg-[#FCFBFA]"
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12 }}
    >
      <View className="mb-5 flex-row items-center">
        <Pressable testID="language-selection-back-button" className="mr-2 rounded-lg p-2 active:bg-slate-200" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </Pressable>
        <Text className="text-xl font-bold text-slate-900">{t('language.selectionTitle')}</Text>
      </View>

      <Text className="mb-4 text-sm leading-5 text-slate-600">{t('language.selectionSubtitle')}</Text>

      <View className="gap-3">
        {APP_LANGUAGES.map((option) => {
          const selected = option.code === selectedCode;
          return (
            <Pressable
              key={option.code}
              testID={languageTestId(option.code)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={`flex-row items-center gap-3 rounded-2xl border px-4 py-4 active:bg-slate-50 ${
                selected ? 'border-orange-300 bg-orange-50' : 'border-[#E2E8F0] bg-white'
              }`}
              onPress={() => void setAppLanguage(option.code)}
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
        })}
      </View>
    </ScrollView>
  );
}
