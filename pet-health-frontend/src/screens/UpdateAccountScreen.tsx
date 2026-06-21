import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const PRIMARY = '#1E6FE8';

type UpdateAccountScreenProps = {
  onBack: () => void;
  onChangeLoginIdentifier: () => void;
  onChangePassword: () => void;
  onRecoverPassword: () => void;
};

function ActionRow({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      className="flex-row items-center rounded-2xl border border-gray-200 bg-white px-4 py-4 active:bg-slate-50"
      onPress={onPress}
    >
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-blue-50">
        <Ionicons name={icon} size={20} color={PRIMARY} />
      </View>
      <Text className="min-w-0 flex-1 text-base font-semibold text-slate-900">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </Pressable>
  );
}

export function UpdateAccountScreen({
  onBack,
  onChangeLoginIdentifier,
  onChangePassword,
  onRecoverPassword,
}: UpdateAccountScreenProps) {
  const { t } = useTranslation();

  return (
    <ScrollView
      testID="update-account-screen"
      className="flex-1 bg-[#F2F4F8]"
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12 }}
    >
      <View className="mb-5 flex-row items-center">
        <Pressable testID="update-account-back-button" className="mr-2 rounded-lg p-2 active:bg-slate-200" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </Pressable>
        <Text className="text-xl font-bold text-slate-900">{t('account.updateAccount.title')}</Text>
      </View>

      <Text className="mb-4 text-sm leading-5 text-slate-600">{t('account.updateAccount.subtitle')}</Text>

      <View className="gap-3">
        <ActionRow
          testID="update-account-change-login-button"
          icon="mail-outline"
          label={t('account.updateAccount.changeLogin')}
          onPress={onChangeLoginIdentifier}
        />
        <ActionRow
          testID="update-account-change-password-button"
          icon="key-outline"
          label={t('account.updateAccount.changePassword')}
          onPress={onChangePassword}
        />
        <ActionRow
          testID="update-account-recover-password-button"
          icon="refresh-outline"
          label={t('account.updateAccount.recoverPassword')}
          onPress={onRecoverPassword}
        />
      </View>
    </ScrollView>
  );
}
