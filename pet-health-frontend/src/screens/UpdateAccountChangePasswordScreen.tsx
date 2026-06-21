import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type UpdateAccountChangePasswordScreenProps = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  error?: string;
  success?: string;
  fieldErrors?: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };
  loading?: boolean;
  onChangeCurrentPassword: (value: string) => void;
  onChangeNewPassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
};

function PasswordField({
  label,
  value,
  error,
  onChangeText,
  testID,
}: {
  label: string;
  value: string;
  error?: string;
  onChangeText: (value: string) => void;
  testID: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm text-slate-700">{label}</Text>
      <View className={`flex-row items-center rounded-xl border bg-white ${error ? 'border-red-400' : 'border-gray-300'}`}>
        <TextInput
          testID={testID}
          className="min-h-[48px] flex-1 px-4 py-3 text-base text-slate-900"
          secureTextEntry={!visible}
          value={value}
          onChangeText={onChangeText}
        />
        <Pressable className="px-3 py-3" onPress={() => setVisible((v) => !v)}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color="#64748b" />
        </Pressable>
      </View>
      {error ? <Text className="mt-1.5 text-xs font-medium text-red-600">{error}</Text> : null}
    </View>
  );
}

export function UpdateAccountChangePasswordScreen({
  currentPassword,
  newPassword,
  confirmPassword,
  error,
  success,
  fieldErrors,
  loading = false,
  onChangeCurrentPassword,
  onChangeNewPassword,
  onChangeConfirmPassword,
  onBack,
  onSubmit,
}: UpdateAccountChangePasswordScreenProps) {
  const { t } = useTranslation();

  return (
    <ScrollView
      testID="update-account-change-password-screen"
      className="flex-1 bg-[#F2F4F8]"
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="mb-5 flex-row items-center">
        <Pressable className="mr-2 rounded-lg p-2 active:bg-slate-200" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </Pressable>
        <Text className="text-xl font-bold text-slate-900">{t('account.updateAccount.changePassword')}</Text>
      </View>

      <View className="rounded-2xl border border-gray-200 bg-white p-4">
        {success ? (
          <View className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <Text className="text-sm font-medium text-emerald-800">{success}</Text>
          </View>
        ) : null}
        {error ? (
          <View className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <Text className="text-sm font-medium text-red-700">{error}</Text>
          </View>
        ) : null}

        <PasswordField
          label={t('account.updateAccount.currentPasswordLabel')}
          value={currentPassword}
          error={fieldErrors?.currentPassword}
          onChangeText={onChangeCurrentPassword}
          testID="update-account-current-password-input"
        />
        <PasswordField
          label={t('account.updateAccount.newPasswordLabel')}
          value={newPassword}
          error={fieldErrors?.newPassword}
          onChangeText={onChangeNewPassword}
          testID="update-account-new-password-input"
        />
        {!fieldErrors?.newPassword ? (
          <Text className="-mt-2 mb-4 text-xs text-slate-500">{t('login.passwordHint')}</Text>
        ) : null}
        <PasswordField
          label={t('account.updateAccount.confirmNewPasswordLabel')}
          value={confirmPassword}
          error={fieldErrors?.confirmPassword}
          onChangeText={onChangeConfirmPassword}
          testID="update-account-confirm-new-password-input"
        />

        <Pressable
          testID="update-account-change-password-submit-button"
          disabled={loading}
          className={`rounded-xl py-3 ${loading ? 'bg-blue-400' : 'bg-blue-600 active:bg-blue-700'}`}
          onPress={onSubmit}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-center text-base font-semibold text-white">{t('account.updateAccount.saveChanges')}</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
