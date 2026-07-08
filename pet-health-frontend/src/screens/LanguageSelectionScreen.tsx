import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '../i18n';

const PRIMARY = '#1E6FE8';

type LanguageSelectionScreenProps = {
  onBack: () => void;
};

function LanguageRow({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className="flex-row items-center rounded-2xl border border-gray-200 bg-white px-4 py-4 active:bg-slate-50"
      onPress={onPress}
    >
      <Text className="min-w-0 flex-1 text-base font-semibold text-slate-900">{label}</Text>
      {selected ? <Ionicons name="checkmark-circle" size={22} color={PRIMARY} /> : <Ionicons name="ellipse-outline" size={22} color="#cbd5e1" />}
    </Pressable>
  );
}

export function LanguageSelectionScreen({ onBack }: LanguageSelectionScreenProps) {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  return (
    <ScrollView
      testID="language-selection-screen"
      className="flex-1 bg-[#F2F4F8]"
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
        <LanguageRow
          testID="language-selection-english"
          label={t('language.english')}
          selected={!isVi}
          onPress={() => void setAppLanguage('en')}
        />
        <LanguageRow
          testID="language-selection-vietnamese"
          label={t('language.vietnameseDisplay')}
          selected={isVi}
          onPress={() => void setAppLanguage('vi')}
        />
      </View>
    </ScrollView>
  );
}
