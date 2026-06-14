import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const PRIMARY = '#1E6FE8';

const GUIDELINE_REFERENCES = [
  {
    id: 'wsava2024',
    url: 'https://wsava.org/wp-content/uploads/2024/05/2024-Guidelines-for-the-Vaccination-of-Dogs-and-Cats.pdf',
  },
  {
    id: 'aahaAafpFeline2020',
    url: 'https://journals.sagepub.com/doi/full/10.1177/1098612X20941784',
  },
  {
    id: 'vietnamRabies',
    url: 'https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=106202',
  },
  {
    id: 'troccapFeline',
    url: 'https://www.troccap.com/feline-guidelines/general-considerations-feline/',
  },
  {
    id: 'esccapWorms',
    url: 'https://www.esccap.org/uploads/docs/biu0jhej_0778_ESCCAP_GL1__English_2025_v21_1p.pdf',
  },
] as const;

const INFO_SECTIONS = [
  'popularVaccines',
  'kittenSchedule',
  'adultBoosters',
  'deworming',
  'dataModel',
] as const;

const FAQ_ITEMS = [
  'catFirstYearVaccines',
  'dewormBeforeVaccination',
  'missedVaccineSchedule',
  'indoorCatVaccines',
  'felvWhenNeeded',
  'rabiesBoosters',
] as const;

type FaqItemId = (typeof FAQ_ITEMS)[number];

type CoreCareInfoScreenProps = {
  onBack: () => void;
};

export function CoreCareInfoScreen({ onBack }: CoreCareInfoScreenProps) {
  const { t } = useTranslation();
  const [selectedFaq, setSelectedFaq] = useState<FaqItemId | null>(null);

  return (
    <View testID="core-care-info-screen" className="flex-1 bg-[#F2F4F8]">
      <View className="flex-row items-center border-b border-gray-200 bg-white px-2 py-2">
        <View className="w-14">
          <Pressable
            testID="core-care-info-back-button"
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="rounded-lg p-2 active:bg-gray-100"
            onPress={() => {
              if (selectedFaq) {
                setSelectedFaq(null);
                return;
              }
              onBack();
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </Pressable>
        </View>
        <Text className="flex-1 text-center text-lg font-semibold text-slate-900">
          {selectedFaq ? t('coreCareInfo.faqTitle') : t('coreCareInfo.title')}
        </Text>
        <View className="w-14" />
      </View>

      {selectedFaq ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="text-lg font-bold text-slate-900">{t(`coreCareInfo.faq.${selectedFaq}.question`)}</Text>
            <View className="mt-3 gap-3">
              {(t(`coreCareInfo.faq.${selectedFaq}.answerItems`, { returnObjects: true }) as string[]).map((answer, index) => (
                <View key={`${selectedFaq}-${index}`} className="flex-row items-start gap-2">
                  <View className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-600" />
                  <Text className="min-w-0 flex-1 text-sm leading-5 text-slate-700">{answer}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="text-lg font-bold text-slate-900">{t('coreCareInfo.heroTitle')}</Text>
            <Text className="mt-2 text-sm leading-6 text-slate-600">{t('coreCareInfo.heroBody')}</Text>
          </View>

          <View className="mt-5 gap-4">
            {INFO_SECTIONS.map((section) => (
              <View key={section} className="rounded-2xl border border-gray-200 bg-white p-4">
                <Text className="text-base font-bold text-slate-900">{t(`coreCareInfo.sections.${section}.title`)}</Text>
                {(t(`coreCareInfo.sections.${section}.items`, { returnObjects: true }) as string[]).map((item, index) => (
                  <View key={`${section}-${index}`} className="mt-3 flex-row items-start gap-2">
                    <View className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-600" />
                    <Text className="min-w-0 flex-1 text-sm leading-5 text-slate-700">{item}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>

          <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="text-base font-bold text-slate-900">{t('coreCareInfo.faqTitle')}</Text>
            <View className="mt-3 gap-2">
              {FAQ_ITEMS.map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  className="flex-row items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3 active:bg-blue-100"
                  onPress={() => setSelectedFaq(item)}
                >
                  <Text className="min-w-0 flex-1 text-sm font-bold leading-5 text-slate-900">{t(`coreCareInfo.faq.${item}.question`)}</Text>
                  <Ionicons name="chevron-forward" size={17} color={PRIMARY} />
                </Pressable>
              ))}
            </View>
          </View>

          <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="text-base font-bold text-slate-900">{t('coreCareInfo.referencesTitle')}</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-600">{t('coreCareInfo.referencesBody')}</Text>
            <View className="mt-3 gap-2">
              {GUIDELINE_REFERENCES.map((reference) => (
                <Pressable
                  key={reference.id}
                  accessibilityRole="link"
                  className="flex-row items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 active:bg-blue-50"
                  onPress={() => void Linking.openURL(reference.url)}
                >
                  <Ionicons name="open-outline" size={16} color={PRIMARY} />
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-bold text-slate-900">{t(`coreCareInfo.references.${reference.id}.title`)}</Text>
                    <Text className="mt-1 text-xs leading-4 text-slate-500">{t(`coreCareInfo.references.${reference.id}.body`)}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
