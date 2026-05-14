import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LanguageToggle } from '../components/LanguageToggle';

type BackendHealthStatus = 'checking' | 'online' | 'offline';

type LoginScreenProps = {
  backendHealth: BackendHealthStatus;
  email: string;
  password: string;
  confirmPassword: string;
  signUpOwnerName: string;
  isSignUp: boolean;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onChangeSignUpOwnerName: (value: string) => void;
  onToggleSignUp: () => void;
  onSubmit: () => void;
  onGoogleSignIn: () => void;
  onAppleSignIn: () => void;
  appleSignInAvailable: boolean;
  googleSignInReady: boolean;
};

/** Mirrors `figma/code/src/app/components/LoginScreen.tsx` layout for React Native + NativeWind. */
export function LoginScreen({
  backendHealth,
  email,
  password,
  confirmPassword,
  signUpOwnerName,
  isSignUp,
  onChangeEmail,
  onChangePassword,
  onChangeConfirmPassword,
  onChangeSignUpOwnerName,
  onToggleSignUp,
  onSubmit,
  onGoogleSignIn: _onGoogleSignIn,
  onAppleSignIn: _onAppleSignIn,
  appleSignInAvailable: _appleSignInAvailable,
  googleSignInReady: _googleSignInReady,
}: LoginScreenProps) {
  const { t } = useTranslation();
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
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 items-center justify-center pb-6">
            <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-white shadow-lg">
              <Ionicons name="medkit-outline" size={48} color="#2563eb" />
            </View>
            <Text className="mb-2 text-center text-3xl font-semibold text-white">{t('login.appName')}</Text>
            <Text className="mb-4 max-w-sm text-center text-base text-blue-100">{t('login.tagline')}</Text>

            <LanguageToggle />

            <View className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <Text className="mb-6 text-center text-xl font-semibold text-slate-900">
                {isSignUp ? t('login.createAccount') : t('login.welcomeBack')}
              </Text>

              {isSignUp ? (
                <View className="mb-4">
                  <Text className="mb-2 text-sm text-slate-700">{t('login.senName')}</Text>
                  <TextInput
                    className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
                    placeholder={t('login.placeholderSenName')}
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="words"
                    value={signUpOwnerName}
                    onChangeText={onChangeSignUpOwnerName}
                  />
                </View>
              ) : null}

              <View className="mb-4">
                <Text className="mb-2 text-sm text-slate-700">{t('login.email')}</Text>
                <TextInput
                  className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
                  placeholder={t('login.placeholderEmail')}
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={onChangeEmail}
                />
              </View>

              <View className={isSignUp ? 'mb-4' : 'mb-6'}>
                <Text className="mb-2 text-sm text-slate-700">{t('login.password')}</Text>
                <View className="flex-row items-center rounded-xl border border-gray-300 bg-white">
                  <TextInput
                    className="min-h-[48px] flex-1 px-4 py-3 text-base text-slate-900"
                    placeholder={t('login.placeholderPassword')}
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={onChangePassword}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                    hitSlop={8}
                    className="px-3 py-3"
                    onPress={() => setShowPassword((v) => !v)}
                  >
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#64748b" />
                  </Pressable>
                </View>
              </View>

              {isSignUp ? (
                <View className="mb-6">
                  <Text className="mb-2 text-sm text-slate-700">{t('login.confirmPassword')}</Text>
                  <View className="flex-row items-center rounded-xl border border-gray-300 bg-white">
                    <TextInput
                      className="min-h-[48px] flex-1 px-4 py-3 text-base text-slate-900"
                      placeholder={t('login.placeholderConfirmPassword')}
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={onChangeConfirmPassword}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        showConfirmPassword ? t('login.hidePassword') : t('login.showPassword')
                      }
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
                </View>
              ) : null}

              <Pressable className="mb-6 w-full rounded-xl bg-blue-600 py-3 active:bg-blue-700" onPress={onSubmit}>
                <Text className="text-center text-base font-semibold text-white">
                  {isSignUp ? t('login.signUp') : t('login.signIn')}
                </Text>
              </Pressable>

              {/* Temporarily disabled social sign-in (Google/Apple). Keep this block for future enhancement.
              <View className="mb-6 flex-row items-center">
                <View className="h-px flex-1 bg-gray-300" />
                <Text className="bg-white px-4 text-sm text-gray-500">{t('login.orContinueWith')}</Text>
                <View className="h-px flex-1 bg-gray-300" />
              </View>

              <View className="gap-3">
                <Pressable
                  className={`flex-row items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white py-3 active:bg-gray-50 ${!googleSignInReady ? 'opacity-50' : ''}`}
                  disabled={!googleSignInReady}
                  onPress={onGoogleSignIn}
                >
                  <Ionicons name="logo-google" size={20} color="#4285F4" />
                  <Text className="text-base font-medium text-slate-800">{t('login.google')}</Text>
                </Pressable>
                {appleSignInAvailable ? (
                  <Pressable
                    className="flex-row items-center justify-center gap-3 rounded-xl bg-black py-3 active:bg-gray-900"
                    onPress={onAppleSignIn}
                  >
                    <Ionicons name="logo-apple" size={20} color="#ffffff" />
                    <Text className="text-base font-medium text-white">{t('login.apple')}</Text>
                  </Pressable>
                ) : null}
              </View>
              */}

              <Pressable className="mt-6" onPress={onToggleSignUp}>
                <Text className="text-center text-sm text-blue-600">
                  {isSignUp ? t('login.toggleToSignIn') : t('login.toggleToSignUp')}
                </Text>
              </Pressable>
            </View>
          </View>

          <Text className={`px-2 text-center text-xs ${healthLooksBad ? 'text-red-200' : 'text-blue-100'}`}>
            {healthText}
          </Text>
          <Text className="mt-3 px-4 pb-4 text-center text-xs text-blue-100">{t('login.termsFooter')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
