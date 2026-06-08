import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const HEADER_BLUE = '#1E6FE8';

export function AppHeader() {
  const { t } = useTranslation();
  return (
    <View className="px-5 py-3" style={{ backgroundColor: HEADER_BLUE }}>
      <View className="flex-row items-center gap-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-xl bg-white/15">
          <Ionicons name="medkit" size={18} color="#ffffff" />
        </View>
        <Text className="min-w-0 flex-1 text-lg font-bold text-white" numberOfLines={1}>
          {t('login.appName')}
        </Text>
      </View>
    </View>
  );
}
