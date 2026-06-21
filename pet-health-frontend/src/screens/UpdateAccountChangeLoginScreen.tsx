import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type UpdateAccountChangeLoginScreenProps = {
  currentLogin: string;
  value: string;
  currentPassword: string;
  error?: string;
  fieldErrors?: {
    newEmail?: string;
    currentPassword?: string;
  };
  success?: string;
  loading?: boolean;
  otpModalOpen?: boolean;
  pendingEmail?: string;
  otp?: string;
  otpError?: string;
  otpLoading?: boolean;
  onChangeValue: (value: string) => void;
  onChangeCurrentPassword: (value: string) => void;
  onChangeOtp: (value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  onCloseOtpModal: () => void;
  onSubmitOtp: () => void;
};

function PasswordField({
  label,
  placeholder,
  value,
  error,
  onChangeText,
  testID,
}: {
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  onChangeText: (value: string) => void;
  testID: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <View className="mt-5">
      <Text className="mb-2 text-sm text-slate-700">{label}</Text>
      <View className={`flex-row items-center rounded-xl border bg-white ${error ? 'border-red-400' : 'border-gray-300'}`}>
        <TextInput
          testID={testID}
          className="min-h-[48px] flex-1 px-4 py-3 text-base text-slate-900"
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          secureTextEntry={!visible}
          autoCapitalize="none"
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

export function UpdateAccountChangeLoginScreen({
  currentLogin,
  value,
  currentPassword,
  error,
  fieldErrors,
  success,
  loading = false,
  otpModalOpen = false,
  pendingEmail = '',
  otp = '',
  otpError,
  otpLoading = false,
  onChangeValue,
  onChangeCurrentPassword,
  onChangeOtp,
  onBack,
  onSubmit,
  onCloseOtpModal,
  onSubmitOtp,
}: UpdateAccountChangeLoginScreenProps) {
  const { t } = useTranslation();

  return (
    <>
      <ScrollView
        testID="update-account-change-login-screen"
        className="flex-1 bg-[#F2F4F8]"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-5 flex-row items-center">
          <Pressable className="mr-2 rounded-lg p-2 active:bg-slate-200" onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </Pressable>
          <Text className="text-xl font-bold text-slate-900">{t('account.updateAccount.changeLogin')}</Text>
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

          <Text className="text-sm text-slate-600">{t('account.updateAccount.currentLoginLabel')}</Text>
          <Text className="mt-1 text-base font-semibold text-slate-900">{currentLogin || '—'}</Text>

          <Text className="mb-2 mt-5 text-sm text-slate-700">{t('account.updateAccount.newLoginLabel')}</Text>
          <TextInput
            testID="update-account-new-login-input"
            className={`rounded-xl border bg-white px-4 py-3 text-base text-slate-900 ${fieldErrors?.newEmail ? 'border-red-400' : 'border-gray-300'}`}
            placeholder={t('account.updateAccount.newLoginPlaceholder')}
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoComplete="email"
            inputMode="email"
            keyboardType="email-address"
            value={value}
            onChangeText={onChangeValue}
          />
          {fieldErrors?.newEmail ? (
            <Text className="mt-1.5 text-xs font-medium text-red-600">{fieldErrors.newEmail}</Text>
          ) : null}
          <Text className="mt-2 text-xs leading-5 text-slate-500">{t('account.updateAccount.changeLoginHelper')}</Text>

          <PasswordField
            label={t('account.updateAccount.verifyPasswordLabel')}
            placeholder={t('account.updateAccount.verifyPasswordPlaceholder')}
            value={currentPassword}
            error={fieldErrors?.currentPassword}
            onChangeText={onChangeCurrentPassword}
            testID="update-account-email-change-password-input"
          />

          <Pressable
            testID="update-account-change-login-submit-button"
            disabled={loading}
            className={`mt-5 rounded-xl py-3 ${loading ? 'bg-blue-400' : 'bg-blue-600 active:bg-blue-700'}`}
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

      <Modal visible={otpModalOpen} transparent animationType="fade" onRequestClose={onCloseOtpModal}>
        <Pressable className="flex-1 items-center justify-center bg-black/40 px-6" onPress={onCloseOtpModal}>
          <Pressable className="w-full max-w-sm rounded-2xl bg-white p-5" onPress={(event) => event.stopPropagation()}>
            <Text className="text-lg font-bold text-slate-900">{t('account.updateAccount.emailOtpTitle')}</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-600">
              {t('account.updateAccount.emailOtpBody', { email: pendingEmail || value })}
            </Text>

            {otpError ? (
              <View className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <Text className="text-sm font-medium text-red-700">{otpError}</Text>
              </View>
            ) : null}

            <Text className="mb-2 mt-4 text-sm text-slate-700">{t('account.updateAccount.emailOtpLabel')}</Text>
            <TextInput
              testID="update-account-email-otp-input"
              className={`rounded-xl border bg-white px-4 py-3 text-base text-slate-900 ${otpError ? 'border-red-400' : 'border-gray-300'}`}
              placeholder={t('account.updateAccount.emailOtpPlaceholder')}
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              maxLength={8}
              value={otp}
              onChangeText={onChangeOtp}
            />
            <Text className="mt-2 text-xs text-slate-500">{t('account.updateAccount.emailOtpHelper')}</Text>

            <Pressable
              testID="update-account-email-otp-verify-button"
              disabled={otpLoading}
              className={`mt-5 rounded-xl py-3 ${otpLoading ? 'bg-blue-400' : 'bg-blue-600 active:bg-blue-700'}`}
              onPress={onSubmitOtp}
            >
              {otpLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-center text-base font-semibold text-white">{t('account.updateAccount.emailOtpVerify')}</Text>
              )}
            </Pressable>
            <Pressable
              testID="update-account-email-otp-cancel-button"
              className="mt-3 rounded-xl border border-gray-200 bg-white py-3 active:bg-slate-50"
              onPress={onCloseOtpModal}
            >
              <Text className="text-center text-sm font-semibold text-slate-700">{t('account.updateAccount.emailOtpCancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
