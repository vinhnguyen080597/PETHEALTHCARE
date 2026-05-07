import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '../i18n';

const ACTIVE = '#ffffff';
const INACTIVE = 'rgba(255,255,255,0.65)';

export function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  return (
    <View className="mb-4 flex-row justify-center gap-2">
      <Pressable
        className="rounded-full border px-4 py-2 active:opacity-90"
        style={{
          borderColor: isVi ? INACTIVE : ACTIVE,
          backgroundColor: isVi ? 'transparent' : 'rgba(255,255,255,0.2)',
        }}
        onPress={() => void setAppLanguage('en')}
      >
        <Text className="text-sm font-semibold" style={{ color: isVi ? INACTIVE : ACTIVE }}>
          {t('language.english')}
        </Text>
      </Pressable>
      <Pressable
        className="rounded-full border px-4 py-2 active:opacity-90"
        style={{
          borderColor: isVi ? ACTIVE : INACTIVE,
          backgroundColor: isVi ? 'rgba(255,255,255,0.2)' : 'transparent',
        }}
        onPress={() => void setAppLanguage('vi')}
      >
        <Text className="text-sm font-semibold" style={{ color: isVi ? ACTIVE : INACTIVE }}>
          {t('language.vietnamese')}
        </Text>
      </Pressable>
    </View>
  );
}
