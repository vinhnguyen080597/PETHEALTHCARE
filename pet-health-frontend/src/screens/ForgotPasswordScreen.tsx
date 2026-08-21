import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthWarmBackdrop } from '../components/AuthWarmBackdrop';
import { BRAND } from '../theme/brand';

type ForgotPasswordScreenProps = {
  email: string;
  error?: string;
  success?: string;
  loading?: boolean;
  rateLimitSeconds?: number;
  otpModalOpen?: boolean;
  pendingEmail?: string;
  otp?: string;
  newPassword?: string;
  confirmPassword?: string;
  otpError?: string;
  fieldErrors?: {
    email?: string;
    otp?: string;
    newPassword?: string;
    confirmPassword?: string;
  };
  onChangeEmail: (value: string) => void;
  onChangeOtp: (value: string) => void;
  onChangeNewPassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onBack: () => void;
  onSubmitSendOtp: () => void;
  onCloseOtpModal: () => void;
  onSubmitRecover: () => void;
};

function inputBorderClass(hasError: boolean, focused: boolean) {
  if (hasError) return 'border-red-400';
  if (focused) return 'border-[#F97316]';
  return 'border-[#E2E8F0]';
}

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
  const [focused, setFocused] = useState(false);

  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm text-slate-700">{label}</Text>
      <View className={`flex-row items-center rounded-xl border bg-white ${inputBorderClass(Boolean(error), focused)}`}>
        <TextInput
          testID={testID}
          className="min-h-[48px] flex-1 px-4 py-3 text-base text-slate-900"
          secureTextEntry={!visible}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <Pressable className="px-3 py-3" onPress={() => setVisible((v) => !v)}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color="#64748b" />
        </Pressable>
      </View>
      {error ? <Text className="mt-1.5 text-xs font-medium text-red-600">{error}</Text> : null}
    </View>
  );
}

export function ForgotPasswordScreen({
  email,
  error,
  success,
  loading = false,
  rateLimitSeconds = 0,
  otpModalOpen = false,
  pendingEmail = '',
  otp = '',
  newPassword = '',
  confirmPassword = '',
  otpError,
  fieldErrors,
  onChangeEmail,
  onChangeOtp,
  onChangeNewPassword,
  onChangeConfirmPassword,
  onBack,
  onSubmitSendOtp,
  onCloseOtpModal,
  onSubmitRecover,
}: ForgotPasswordScreenProps) {
  const { t } = useTranslation();
  const [emailFocused, setEmailFocused] = useState(false);
  const [otpFocused, setOtpFocused] = useState(false);
  const sendDisabled = loading || Boolean(rateLimitSeconds && rateLimitSeconds > 0);

  return (
    <SafeAreaView className="flex-1 bg-[#FCFBFA]" edges={['top', 'bottom', 'left', 'right']}>
      <AuthWarmBackdrop />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 items-center justify-center pb-6">
            <View
              className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-white shadow-md"
              style={{ borderWidth: 2, borderColor: '#FED7AA' }}
            >
              <Ionicons name="key-outline" size={40} color={BRAND.primary} />
            </View>
            <Text className="mb-2 text-center text-3xl font-semibold" style={{ color: BRAND.text }}>
              {t('login.forgotPasswordTitle')}
            </Text>
            <Text className="mb-6 max-w-sm text-center text-base" style={{ color: BRAND.textMuted }}>
              {t('login.forgotPasswordBody')}
            </Text>

            <View className="w-full max-w-sm rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              {error ? (
                <View testID="forgot-password-error" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <Text className="text-sm font-medium text-red-700">{error}</Text>
                </View>
              ) : null}
              {success ? (
                <View testID="forgot-password-success" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <Text className="text-sm font-medium text-emerald-800">{success}</Text>
                </View>
              ) : null}

              <Text className="mb-2 text-sm text-slate-700">{t('login.email')}</Text>
              <TextInput
                testID="forgot-password-email-input"
                accessibilityLabel={t('login.email')}
                className={`mb-1 rounded-xl border bg-white px-4 py-3 text-base text-slate-900 ${inputBorderClass(
                  Boolean(fieldErrors?.email),
                  emailFocused,
                )}`}
                placeholder={t('login.placeholderEmail')}
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={onChangeEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
              {fieldErrors?.email ? (
                <Text className="mb-4 text-xs font-medium text-red-600">{fieldErrors.email}</Text>
              ) : (
                <View className="mb-4" />
              )}

              <Pressable
                testID="forgot-password-send-otp-button"
                accessibilityRole="button"
                disabled={sendDisabled}
                className="mb-3 w-full rounded-xl py-3"
                style={{ backgroundColor: sendDisabled ? '#FDBA74' : BRAND.primary }}
                onPress={onSubmitSendOtp}
              >
                <Text className="text-center text-base font-semibold text-white">{t('login.forgotPasswordSendOtp')}</Text>
              </Pressable>

              <Pressable
                testID="forgot-password-back-button"
                accessibilityRole="button"
                className="rounded-xl border border-[#E2E8F0] bg-white py-3 active:bg-slate-50"
                onPress={onBack}
              >
                <Text className="text-center text-sm font-semibold text-slate-700">{t('login.forgotPasswordBack')}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
                testID="forgot-password-otp-input"
                className={`rounded-xl border bg-white px-4 py-3 text-base text-slate-900 ${inputBorderClass(
                  Boolean(fieldErrors?.otp || otpError),
                  otpFocused,
                )}`}
                placeholder={t('account.updateAccount.recoverOtpPlaceholder')}
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                maxLength={8}
                value={otp}
                onChangeText={onChangeOtp}
                onFocus={() => setOtpFocused(true)}
                onBlur={() => setOtpFocused(false)}
              />
              {fieldErrors?.otp ? <Text className="mt-1.5 text-xs font-medium text-red-600">{fieldErrors.otp}</Text> : null}
              <Text className="mt-2 text-xs text-slate-500">{t('account.updateAccount.recoverOtpHelper')}</Text>

              <PasswordField
                label={t('account.updateAccount.newPasswordLabel')}
                value={newPassword}
                error={fieldErrors?.newPassword}
                onChangeText={onChangeNewPassword}
                testID="forgot-password-new-password-input"
              />
              {!fieldErrors?.newPassword ? (
                <Text className="-mt-2 mb-4 text-xs text-slate-500">{t('login.passwordHint')}</Text>
              ) : null}
              <PasswordField
                label={t('account.updateAccount.confirmNewPasswordLabel')}
                value={confirmPassword}
                error={fieldErrors?.confirmPassword}
                onChangeText={onChangeConfirmPassword}
                testID="forgot-password-confirm-password-input"
              />

              <Pressable
                testID="forgot-password-otp-verify-button"
                disabled={loading}
                className="rounded-xl py-3"
                style={{ backgroundColor: loading ? '#FDBA74' : BRAND.primary }}
                onPress={onSubmitRecover}
              >
                <Text className="text-center text-base font-semibold text-white">
                  {t('account.updateAccount.recoverOtpSubmit')}
                </Text>
              </Pressable>
              <Pressable
                testID="forgot-password-otp-cancel-button"
                className="mt-3 rounded-xl border border-[#E2E8F0] bg-white py-3 active:bg-slate-50"
                onPress={onCloseOtpModal}
              >
                <Text className="text-center text-sm font-semibold text-slate-700">{t('account.updateAccount.emailOtpCancel')}</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
