import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type UpdateAccountRecoverPasswordScreenProps = {
  email: string;
  error?: string;
  success?: string;
  loading?: boolean;
  otpModalOpen?: boolean;
  pendingEmail?: string;
  otp?: string;
  newPassword?: string;
  confirmPassword?: string;
  otpError?: string;
  fieldErrors?: {
    otp?: string;
    newPassword?: string;
    confirmPassword?: string;
  };
  otpLoading?: boolean;
  onBack: () => void;
  onSubmitSendOtp: () => void;
  onChangeOtp: (value: string) => void;
  onChangeNewPassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onCloseOtpModal: () => void;
  onSubmitRecover: () => void;
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

export function UpdateAccountRecoverPasswordScreen({
  email,
  error,
  success,
  loading = false,
  otpModalOpen = false,
  pendingEmail = '',
  otp = '',
  newPassword = '',
  confirmPassword = '',
  otpError,
  fieldErrors,
  otpLoading = false,
  onBack,
  onSubmitSendOtp,
  onChangeOtp,
  onChangeNewPassword,
  onChangeConfirmPassword,
  onCloseOtpModal,
  onSubmitRecover,
}: UpdateAccountRecoverPasswordScreenProps) {
  const { t } = useTranslation();

  return (
    <>
      <ScrollView
        testID="update-account-recover-password-screen"
        className="flex-1 bg-[#F2F4F8]"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12 }}
      >
        <View className="mb-5 flex-row items-center">
          <Pressable testID="update-account-recover-password-back-button" className="mr-2 rounded-lg p-2 active:bg-slate-200" onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </Pressable>
          <Text className="text-xl font-bold text-slate-900">{t('account.updateAccount.recoverPassword')}</Text>
        </View>

        <View className="rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-sm leading-5 text-slate-600">{t('account.updateAccount.recoverPasswordBody')}</Text>

          <View className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
            <Text className="text-xs font-semibold uppercase text-slate-500">{t('login.email')}</Text>
            <Text className="mt-1 text-base font-semibold text-slate-900">{email || '—'}</Text>
          </View>

          {error ? (
            <View className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <Text className="text-sm font-medium text-red-700">{error}</Text>
            </View>
          ) : null}
          {success ? (
            <View className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <Text className="text-sm font-medium text-emerald-800">{success}</Text>
            </View>
          ) : null}

          <Pressable
            testID="update-account-recover-password-submit-button"
            disabled={loading || !email}
            className={`mt-5 rounded-xl py-3 ${loading || !email ? 'bg-blue-400' : 'bg-blue-600 active:bg-blue-700'}`}
            onPress={onSubmitSendOtp}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-center text-base font-semibold text-white">{t('account.updateAccount.sendRecoverOtp')}</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={otpModalOpen} transparent animationType="fade" onRequestClose={onCloseOtpModal}>
        <Pressable className="flex-1 items-center justify-center bg-black/40 px-6" onPress={onCloseOtpModal}>
          <Pressable
            className="max-h-[90%] w-full max-w-sm rounded-2xl bg-white p-5"
            onPress={(event) => event.stopPropagation()}
          >
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text className="text-lg font-bold text-slate-900">{t('account.updateAccount.recoverOtpTitle')}</Text>
              <Text className="mt-2 text-sm leading-5 text-slate-600">
                {t('account.updateAccount.recoverOtpBody', { email: pendingEmail || email })}
              </Text>

              {otpError ? (
                <View className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <Text className="text-sm font-medium text-red-700">{otpError}</Text>
                </View>
              ) : null}

              <Text className="mb-2 mt-4 text-sm text-slate-700">{t('account.updateAccount.recoverOtpLabel')}</Text>
              <TextInput
                testID="update-account-recover-otp-input"
                className={`rounded-xl border bg-white px-4 py-3 text-base text-slate-900 ${fieldErrors?.otp || otpError ? 'border-red-400' : 'border-gray-300'}`}
                placeholder={t('account.updateAccount.recoverOtpPlaceholder')}
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                maxLength={8}
                value={otp}
                onChangeText={onChangeOtp}
              />
              {fieldErrors?.otp ? <Text className="mt-1.5 text-xs font-medium text-red-600">{fieldErrors.otp}</Text> : null}
              <Text className="mt-2 text-xs text-slate-500">{t('account.updateAccount.recoverOtpHelper')}</Text>

              <PasswordField
                label={t('account.updateAccount.newPasswordLabel')}
                value={newPassword}
                error={fieldErrors?.newPassword}
                onChangeText={onChangeNewPassword}
                testID="update-account-recover-new-password-input"
              />
              {!fieldErrors?.newPassword ? (
                <Text className="-mt-2 mb-4 text-xs text-slate-500">{t('login.passwordHint')}</Text>
              ) : null}
              <PasswordField
                label={t('account.updateAccount.confirmNewPasswordLabel')}
                value={confirmPassword}
                error={fieldErrors?.confirmPassword}
                onChangeText={onChangeConfirmPassword}
                testID="update-account-recover-confirm-password-input"
              />

              <Pressable
                testID="update-account-recover-otp-verify-button"
                disabled={otpLoading}
                className={`rounded-xl py-3 ${otpLoading ? 'bg-blue-400' : 'bg-blue-600 active:bg-blue-700'}`}
                onPress={onSubmitRecover}
              >
                {otpLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-center text-base font-semibold text-white">{t('account.updateAccount.recoverOtpSubmit')}</Text>
                )}
              </Pressable>
              <Pressable
                testID="update-account-recover-otp-cancel-button"
                className="mt-3 rounded-xl border border-gray-200 bg-white py-3 active:bg-slate-50"
                onPress={onCloseOtpModal}
              >
                <Text className="text-center text-sm font-semibold text-slate-700">{t('account.updateAccount.emailOtpCancel')}</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
