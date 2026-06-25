import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LanguageToggle } from '../components/LanguageToggle';
import { APP_LINKS } from '../config';

type BackendHealthStatus = 'checking' | 'online' | 'offline';

type LoginScreenProps = {
  backendHealth: BackendHealthStatus;
  email: string;
  password: string;
  confirmPassword: string;
  isSignUp: boolean;
  error?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
  loading?: boolean;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onToggleSignUp: () => void;
  onSubmit: () => void;
  onForgotPassword?: () => void;
  authSuccess?: string;
};

function FieldInlineError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text className="mt-1.5 text-xs font-medium text-red-600">{message}</Text>;
}

/** Mirrors `figma/code/src/app/components/LoginScreen.tsx` layout for React Native + NativeWind. */
export function LoginScreen({
  backendHealth,
  email,
  password,
  confirmPassword,
  isSignUp,
  error,
  fieldErrors,
  loading = false,
  onChangeEmail,
  onChangePassword,
  onChangeConfirmPassword,
  onToggleSignUp,
  onSubmit,
  onForgotPassword,
  authSuccess,
}: LoginScreenProps) {
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const compact = windowHeight < 760 || isSignUp;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!isSignUp) {
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isSignUp]);

  const healthLooksBad = backendHealth === 'offline';
  const healthText =
    backendHealth === 'checking'
      ? t('health.checking')
      : backendHealth === 'online'
        ? t('health.online')
        : t('health.offline');

  return (
    <SafeAreaView className="flex-1 bg-blue-600" edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingVertical: compact ? 20 : 40,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className={`items-center ${compact ? 'pb-4' : 'flex-1 justify-center pb-6'}`}>
            <View className={`items-center justify-center rounded-full bg-white shadow-lg ${compact ? 'mb-4 h-20 w-20' : 'mb-6 h-24 w-24'}`}>
              <Ionicons name="medkit-outline" size={compact ? 40 : 48} color="#2563eb" />
            </View>
            <Text className={`text-center font-semibold text-white ${compact ? 'mb-1 text-2xl' : 'mb-2 text-3xl'}`}>
              {t('login.appName')}
            </Text>
            <Text className={`max-w-sm text-center text-base text-blue-100 ${compact ? 'mb-3' : 'mb-4'}`}>
              {t('login.tagline')}
            </Text>

            <LanguageToggle />

            <View className={`w-full max-w-sm rounded-2xl bg-white shadow-2xl ${compact ? 'p-5' : 'p-6'}`}>
              <Text className={`text-center font-semibold text-slate-900 ${compact ? 'mb-4 text-lg' : 'mb-6 text-xl'}`}>
                {isSignUp ? t('login.createAccount') : t('login.welcomeBack')}
              </Text>

              {error ? (
                <View testID="login-auth-error" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <Text className="text-sm font-medium text-red-700">{error}</Text>
                </View>
              ) : null}

              {authSuccess ? (
                <View testID="login-auth-success" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <Text className="text-sm font-medium text-emerald-800">{authSuccess}</Text>
                </View>
              ) : null}

              <View className="mb-4">
                <Text className="mb-2 text-sm text-slate-700">{t('login.email')}</Text>
                <TextInput
                  testID="login-email-input"
                  accessibilityLabel={t('login.email')}
                  className={`rounded-xl border bg-white px-4 py-3 text-base text-slate-900 ${
                    fieldErrors?.email ? 'border-red-400' : 'border-gray-300'
                  }`}
                  placeholder={t('login.placeholderEmail')}
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={onChangeEmail}
                />
                <FieldInlineError message={fieldErrors?.email} />
              </View>

              <View className={isSignUp ? 'mb-4' : 'mb-6'}>
                <Text className="mb-2 text-sm text-slate-700">{t('login.password')}</Text>
                <View
                  className={`flex-row items-center rounded-xl border bg-white ${
                    fieldErrors?.password ? 'border-red-400' : 'border-gray-300'
                  }`}
                >
                  <TextInput
                    testID="login-password-input"
                    accessibilityLabel="Password"
                    className="min-h-[48px] flex-1 px-4 py-3 text-base text-slate-900"
                    placeholder={t('login.placeholderPassword')}
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={onChangePassword}
                  />
                  <Pressable
                    testID="login-toggle-password-visibility-button"
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                    hitSlop={8}
                    className="px-3 py-3"
                    onPress={() => setShowPassword((v) => !v)}
                  >
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#64748b" />
                  </Pressable>
                </View>
                {fieldErrors?.password ? (
                  <FieldInlineError message={fieldErrors.password} />
                ) : isSignUp ? (
                  <Text className="mt-1.5 text-xs text-slate-500">{t('login.passwordHint')}</Text>
                ) : null}
              </View>

              {isSignUp ? (
                <View className="mb-6">
                  <Text className="mb-2 text-sm text-slate-700">{t('login.confirmPassword')}</Text>
                  <View
                    className={`flex-row items-center rounded-xl border bg-white ${
                      fieldErrors?.confirmPassword ? 'border-red-400' : 'border-gray-300'
                    }`}
                  >
                    <TextInput
                      testID="login-confirm-password-input"
                      accessibilityLabel="Confirm password"
                      className="min-h-[48px] flex-1 px-4 py-3 text-base text-slate-900"
                      placeholder={t('login.placeholderConfirmPassword')}
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={onChangeConfirmPassword}
                    />
                    <Pressable
                      testID="login-toggle-confirm-password-visibility-button"
                      accessibilityRole="button"
                      accessibilityLabel={showConfirmPassword ? t('login.hidePassword') : t('login.showPassword')}
                      hitSlop={8}
                      className="px-3 py-3"
                      onPress={() => setShowConfirmPassword((v) => !v)}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color="#64748b"
                      />
                    </Pressable>
                  </View>
                  <FieldInlineError message={fieldErrors?.confirmPassword} />
                </View>
              ) : null}

              <Pressable
                testID={isSignUp ? 'signup-submit-button' : 'login-submit-button'}
                accessibilityRole="button"
                accessibilityLabel={isSignUp ? 'Sign up' : 'Sign in'}
                disabled={loading}
                className={`w-full rounded-xl py-3 ${
                  loading ? 'bg-blue-400' : 'bg-blue-600 active:bg-blue-700'
                } ${!isSignUp && onForgotPassword ? 'mb-3' : 'mb-6'}`}
                onPress={onSubmit}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-center text-base font-semibold text-white">
                    {isSignUp ? t('login.signUp') : t('login.signIn')}
                  </Text>
                )}
              </Pressable>

              {!isSignUp && onForgotPassword ? (
                <Pressable
                  testID="login-forgot-password-button"
                  accessibilityRole="button"
                  accessibilityLabel={t('login.forgotPassword')}
                  className="mb-6"
                  onPress={onForgotPassword}
                >
                  <Text className="text-center text-sm font-semibold text-blue-600">{t('login.forgotPassword')}</Text>
                </Pressable>
              ) : null}

              <Pressable
                testID={isSignUp ? 'login-mode-button' : 'signup-mode-button'}
                accessibilityRole="button"
                accessibilityLabel={isSignUp ? 'Switch to sign in' : 'Switch to sign up'}
                className="mt-6"
                onPress={onToggleSignUp}
              >
                <Text className="text-center text-sm text-blue-600">
                  {isSignUp ? t('login.toggleToSignIn') : t('login.toggleToSignUp')}
                </Text>
              </Pressable>
            </View>
          </View>

          <Text className={`px-2 text-center text-xs ${healthLooksBad ? 'text-red-200' : 'text-blue-100'}`}>
            {healthText}
          </Text>
          <Text className="mt-3 px-4 pb-4 text-center text-xs leading-5 text-blue-100">
            {t('login.termsPrefix')}{' '}
            <Text className="font-bold underline" onPress={() => void Linking.openURL(APP_LINKS.termsOfService)}>
              {t('legal.terms')}
            </Text>
            {' '}{t('login.termsAnd')}{' '}
            <Text className="font-bold underline" onPress={() => void Linking.openURL(APP_LINKS.privacyPolicy)}>
              {t('legal.privacy')}
            </Text>
            {'. '}
            <Text className="font-bold underline" onPress={() => void Linking.openURL(APP_LINKS.support)}>
              {t('legal.support')}
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
