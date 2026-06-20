import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

type SignUpOtpVerificationScreenProps = {
  email: string;
  otp: string;
  error?: string;
  loading?: boolean;
  onChangeOtp: (value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
};

export function SignUpOtpVerificationScreen({
  email,
  otp,
  error,
  loading = false,
  onChangeOtp,
  onBack,
  onSubmit,
}: SignUpOtpVerificationScreenProps) {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-blue-600" edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 items-center justify-center pb-6">
            <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-white shadow-lg">
              <Ionicons name="mail-open-outline" size={44} color="#2563eb" />
            </View>
            <Text className="mb-2 text-center text-3xl font-semibold text-white">{t('signupOtp.title')}</Text>
            <Text className="mb-6 max-w-sm text-center text-base text-blue-100">
              {t('signupOtp.subtitle', { email })}
            </Text>

            <View className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              {error ? (
                <View
                  testID="signup-otp-error"
                  className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                >
                  <Text className="text-sm font-medium text-red-700">{error}</Text>
                </View>
              ) : null}

              <Text className="mb-2 text-sm text-slate-700">{t('signupOtp.otpLabel')}</Text>
              <TextInput
                testID="signup-otp-input"
                accessibilityLabel={t('signupOtp.otpLabel')}
                className={`rounded-xl border bg-white px-4 py-3 text-base text-slate-900 ${
                  error ? 'border-red-400' : 'border-gray-300'
                }`}
                placeholder={t('signupOtp.otpPlaceholder')}
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                maxLength={8}
                value={otp}
                onChangeText={onChangeOtp}
              />
              <Text className="mt-2 text-xs text-slate-500">{t('signupOtp.helper')}</Text>

              <Pressable
                testID="signup-otp-verify-button"
                accessibilityRole="button"
                disabled={loading}
                className={`mb-3 mt-6 w-full rounded-xl py-3 ${
                  loading ? 'bg-blue-400' : 'bg-blue-600 active:bg-blue-700'
                }`}
                onPress={onSubmit}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-center text-base font-semibold text-white">{t('signupOtp.verifyButton')}</Text>
                )}
              </Pressable>

              <Pressable
                testID="signup-otp-back-button"
                accessibilityRole="button"
                className="w-full rounded-xl border border-blue-100 bg-blue-50 py-3 active:bg-blue-100"
                onPress={onBack}
              >
                <Text className="text-center text-sm font-semibold text-blue-700">{t('signupOtp.backButton')}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
