import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ManagedUser } from '../types';

type ManagedUserBannerProps = {
  managedUser: ManagedUser;
  onExit: () => void;
};

export function ManagedUserBanner({ managedUser, onExit }: ManagedUserBannerProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5">
      <Ionicons name="person-circle-outline" size={18} color="#b45309" />
      <Text className="flex-1 text-sm font-semibold text-amber-900">
        {t('managedUser.banner', { name: managedUser.displayName })}
      </Text>
      <Pressable
        testID="managed-user-exit-button"
        accessibilityRole="button"
        className="rounded-lg bg-white px-3 py-1.5 active:bg-amber-100"
        onPress={onExit}
      >
        <Text className="text-xs font-bold text-amber-900">{t('managedUser.exit')}</Text>
      </Pressable>
    </View>
  );
}
