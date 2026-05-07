import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from './LanguageToggle';

const HEADER_BLUE = '#1E6FE8';

/** Hero bar — matches `figma/UI/Home.PNG` (brand + subtitle on vibrant blue). */
export function AppHeader() {
  const { t } = useTranslation();
  return (
    <View className="px-6 pb-8 pt-3" style={{ backgroundColor: HEADER_BLUE }}>
      <View className="mb-2 flex-row items-center gap-3">
        <Ionicons name="medkit" size={34} color="#ffffff" />
        <Text className="flex-1 text-2xl font-bold text-white" numberOfLines={2}>
          {t('header.appName')}
        </Text>
      </View>
      <Text className="mb-3 text-[15px] leading-5 text-white/90">{t('header.tagline')}</Text>
      <LanguageToggle />
    </View>
  );
}
