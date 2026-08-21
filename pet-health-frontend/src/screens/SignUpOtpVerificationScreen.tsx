import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthWarmBackdrop } from '../components/AuthWarmBackdrop';
import { OtpPinInput } from '../components/OtpPinInput';
import { BRAND } from '../theme/brand';
import {
  OTP_PIN_LENGTH,
  isOtpComplete,
  maskEmailForDisplay,
  resendCountdownSeconds,
} from '../utils/otpPin';

type SignUpOtpFieldErrors = {
  otp?: string;
};

type SignUpOtpVerificationScreenProps = {
  email: string;
  otp: string;
  error?: string;
  fieldErrors?: SignUpOtpFieldErrors;
  loading?: boolean;
  resendLoading?: boolean;
  resendAvailableAtMs: number;
  onChangeOtp: (value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  onResend: () => void;
};

export function SignUpOtpVerificationScreen({
  email,
  otp,
  error,
  fieldErrors,
  loading = false,
  resendLoading = false,
  resendAvailableAtMs,
  onChangeOtp,
  onBack,
  onSubmit,
  onResend,
}: SignUpOtpVerificationScreenProps) {
  const { t } = useTranslation();
  const [nowMs, setNowMs] = useState(Date.now());
  const countdown = resendCountdownSeconds(resendAvailableAtMs, nowMs);
  const canResend = countdown <= 0 && !resendLoading && !loading;
  const canSubmit = isOtpComplete(otp, OTP_PIN_LENGTH) && !loading;
  const maskedEmail = maskEmailForDisplay(email);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(timer);
  }, [countdown, resendAvailableAtMs]);

  return (
    <View className="flex-1 bg-[#FCFBFA]">
      <AuthWarmBackdrop />
      <SafeAreaView className="flex-1" edges={['top', 'bottom', 'left', 'right']}>
        <View className="flex-row items-center px-3 pt-1">
          <Pressable
            testID="signup-otp-back-button"
            accessibilityRole="button"
            accessibilityLabel={t('signupOtp.backButton')}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-orange-50"
            onPress={onBack}
          >
            <Ionicons name="arrow-back" size={22} color={BRAND.text} />
          </Pressable>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="items-center pb-4 pt-2">
              <View
                className="mb-5 h-20 w-20 items-center justify-center rounded-full"
                style={{ backgroundColor: BRAND.primarySoft }}
              >
                <Ionicons name="mail-outline" size={36} color={BRAND.primary} />
              </View>
              <Text className="mb-2 text-center text-2xl font-bold" style={{ color: BRAND.text }}>
                {t('signupOtp.title')}
              </Text>
              <Text className="max-w-sm text-center text-base leading-6" style={{ color: BRAND.textMuted }}>
                {t('signupOtp.subtitleMaskedPrefix')}{' '}
                <Text className="font-semibold" style={{ color: BRAND.text }}>
                  {maskedEmail}
                </Text>
              </Text>
            </View>

            <View className="w-full max-w-sm self-center rounded-2xl border border-[#E2E8F0] bg-white px-4 py-5 shadow-sm">
              {error ? (
                <View
                  testID="signup-otp-error"
                  className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                >
                  <Text className="text-sm font-medium text-red-700">{error}</Text>
                </View>
              ) : null}

              <OtpPinInput
                value={otp}
                onChange={onChangeOtp}
                hasError={Boolean(fieldErrors?.otp || error)}
              />

              {fieldErrors?.otp ? (
                <Text testID="signup-otp-field-error" className="mt-3 text-center text-xs font-medium text-red-600">
                  {fieldErrors.otp}
                </Text>
              ) : null}

              <View className="mt-5 items-center">
                {canResend ? (
                  <Pressable
                    testID="signup-otp-resend-button"
                    accessibilityRole="button"
                    disabled={resendLoading}
                    onPress={onResend}
                  >
                    <Text className="text-sm font-semibold" style={{ color: BRAND.primary }}>
                      {t('signupOtp.resendReady')}
                    </Text>
                  </Pressable>
                ) : (
                  <Text testID="signup-otp-resend-countdown" className="text-sm" style={{ color: BRAND.textMuted }}>
                    {t('signupOtp.resendCountdown', { seconds: Math.max(countdown, 1) })}
                  </Text>
                )}
                <Text className="mt-3 text-center text-xs leading-5" style={{ color: BRAND.textMuted }}>
                  {t('signupOtp.spamNote')}
                </Text>
              </View>

              <Pressable
                testID="signup-otp-verify-button"
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit }}
                disabled={!canSubmit}
                className="mt-6 w-full rounded-xl py-3.5"
                style={{ backgroundColor: canSubmit ? BRAND.primary : '#FDBA74', opacity: canSubmit ? 1 : 0.7 }}
                onPress={onSubmit}
              >
                <Text className="text-center text-base font-semibold text-white">{t('signupOtp.verifyButton')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
