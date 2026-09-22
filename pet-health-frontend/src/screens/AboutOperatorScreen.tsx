import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { OperatorDisclosureCard } from '../components/OperatorDisclosureCard';

type AboutOperatorScreenProps = {
  onBack: () => void;
};

/** MoIT operator disclosure — opened from Account legal links, not inline on Account. */
export function AboutOperatorScreen({ onBack }: AboutOperatorScreenProps) {
  const { t } = useTranslation();

  return (
    <ScrollView
      testID="about-operator-screen"
      className="flex-1 bg-[#FCFBFA]"
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12 }}
    >
      <View className="mb-5 flex-row items-center">
        <Pressable
          testID="about-operator-back-button"
          accessibilityRole="button"
          accessibilityLabel={t('legal.operatorBackA11y')}
          className="mr-2 rounded-lg p-2 active:bg-slate-200"
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </Pressable>
        <Text className="text-xl font-bold text-slate-900">{t('legal.operatorScreenTitle')}</Text>
      </View>

      <Text className="mb-4 text-sm leading-5 text-slate-600">{t('legal.operatorScreenSubtitle')}</Text>
      <OperatorDisclosureCard hideHeader />
    </ScrollView>
  );
}
