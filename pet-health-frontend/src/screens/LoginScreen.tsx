import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PET_MARKET_AVATAR } from '../assets/brandAssets';
import { AuthWarmBackdrop } from '../components/AuthWarmBackdrop';
import { LanguageHeaderChip } from '../components/LanguageToggle';
import { APP_LINKS } from '../config';
import { BRAND } from '../theme/brand';

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

type FocusField = 'email' | 'password' | 'confirmPassword' | null;

const webTextInputReset = Platform.OS === 'web'
  ? ({ outlineStyle: 'none', boxShadow: 'none' } as any)
  : undefined;

function FieldInlineError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text className="mt-1.5 text-xs font-medium text-red-600">{message}</Text>;
}

function inputBorderClass(hasError: boolean, focused: boolean) {
  if (hasError) return 'border-red-400';
  if (focused) return 'border-[#CBD5E1]';
  return 'border-[#E2E8F0]';
}

function AuthBrandHeader() {
  const { t } = useTranslation();
  return (
    <View testID="auth-brand-header" className="items-center px-6 pb-3 pt-10">
      <View
        className="mb-4 h-24 w-24 overflow-hidden rounded-full bg-white shadow-md"
        style={{ borderWidth: 2, borderColor: '#FED7AA' }}
      >
        <Image
          source={PET_MARKET_AVATAR}
          style={{ height: '100%', width: '100%' }}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </View>
      <Text className="mb-1.5 text-center text-3xl font-semibold" style={{ color: BRAND.text }}>
        {t('login.appName')}
      </Text>
      <Text className="max-w-sm text-center text-base" style={{ color: BRAND.textMuted }}>
        {t('login.tagline')}
      </Text>
    </View>
  );
}

function AuthLegalFooter({
  backendHealth,
}: {
  backendHealth: BackendHealthStatus;
}) {
  const { t } = useTranslation();
  const healthLooksBad = backendHealth === 'offline';
  const healthText =
    backendHealth === 'checking'
      ? t('health.checking')
      : backendHealth === 'online'
        ? t('health.online')
        : t('health.offline');

  return (
    <View testID="auth-legal-footer" className="bg-[#FCFBFA] px-6 pb-7 pt-3">
      <Text
        className={`px-2 text-center text-xs ${healthLooksBad ? 'text-red-500' : ''}`}
        style={healthLooksBad ? undefined : { color: BRAND.textMuted }}
      >
        {healthText}
      </Text>
      <Text className="mt-3 text-center text-xs leading-5" style={{ color: BRAND.textMuted }}>
        {t('login.termsPrefix')}{' '}
        <Text
          className="font-bold underline"
          style={{ color: BRAND.text }}
          onPress={() => void Linking.openURL(APP_LINKS.termsOfService)}
        >
          {t('legal.terms')}
        </Text>
        {' '}
        {t('login.termsAnd')}{' '}
        <Text
          className="font-bold underline"
          style={{ color: BRAND.text }}
          onPress={() => void Linking.openURL(APP_LINKS.privacyPolicy)}
        >
          {t('legal.privacy')}
        </Text>
        {'. '}
        <Text
          className="font-bold underline"
          style={{ color: BRAND.text }}
          onPress={() => void Linking.openURL(APP_LINKS.marketplaceGuidelines)}
        >
          {t('legal.marketplaceGuidelines')}
        </Text>
        {'. '}
        <Text
          className="font-bold underline"
          style={{ color: BRAND.text }}
          onPress={() => void Linking.openURL(APP_LINKS.support)}
        >
          {t('legal.support')}
        </Text>
      </Text>
    </View>
  );
}

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusField>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (!isSignUp) {
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isSignUp]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <View className="flex-1 bg-[#FCFBFA]">
      <AuthWarmBackdrop />
      <LanguageHeaderChip />
      <SafeAreaView className="flex-1" edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <View className="flex-1">
            <AuthBrandHeader />

            <ScrollView
              className="flex-1"
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: 'center',
                paddingHorizontal: 24,
                paddingTop: 8,
                paddingBottom: 8,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <View className="w-full max-w-sm self-center rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              <Text className="mb-6 text-center text-xl font-semibold" style={{ color: BRAND.text }}>
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
                  className={`rounded-xl border bg-white px-4 py-3 text-base text-slate-900 ${inputBorderClass(
                    Boolean(fieldErrors?.email),
                    focusedField === 'email',
                  )}`}
                  style={webTextInputReset}
                  placeholder={t('login.placeholderEmail')}
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={onChangeEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
                <FieldInlineError message={fieldErrors?.email} />
              </View>

              <View className={isSignUp ? 'mb-4' : 'mb-6'}>
                <Text className="mb-2 text-sm text-slate-700">{t('login.password')}</Text>
                <View
                  className={`flex-row items-center rounded-xl border bg-white px-4 ${inputBorderClass(
                    Boolean(fieldErrors?.password),
                    focusedField === 'password',
                  )}`}
                >
                  <TextInput
                    testID="login-password-input"
                    accessibilityLabel="Password"
                    className="min-h-[48px] flex-1 py-3 text-base text-slate-900"
                    style={webTextInputReset}
                    placeholder={t('login.placeholderPassword')}
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={onChangePassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <Pressable
                    testID="login-toggle-password-visibility-button"
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                    hitSlop={8}
                    className="py-3 pl-3"
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
                    className={`flex-row items-center rounded-xl border bg-white px-4 ${inputBorderClass(
                      Boolean(fieldErrors?.confirmPassword),
                      focusedField === 'confirmPassword',
                    )}`}
                  >
                    <TextInput
                      testID="login-confirm-password-input"
                      accessibilityLabel="Confirm password"
                      className="min-h-[48px] flex-1 py-3 text-base text-slate-900"
                      style={webTextInputReset}
                      placeholder={t('login.placeholderConfirmPassword')}
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={onChangeConfirmPassword}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <Pressable
                      testID="login-toggle-confirm-password-visibility-button"
                      accessibilityRole="button"
                      accessibilityLabel={showConfirmPassword ? t('login.hidePassword') : t('login.showPassword')}
                      hitSlop={8}
                      className="py-3 pl-3"
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
                className={`w-full rounded-xl py-3 ${!isSignUp && onForgotPassword ? 'mb-3' : 'mb-6'}`}
                style={{ backgroundColor: loading ? '#FDBA74' : BRAND.primary }}
                onPress={onSubmit}
              >
                <Text className="text-center text-base font-semibold text-white">
                  {isSignUp ? t('login.signUp') : t('login.signIn')}
                </Text>
              </Pressable>

              {!isSignUp && onForgotPassword ? (
                <Pressable
                  testID="login-forgot-password-button"
                  accessibilityRole="button"
                  accessibilityLabel={t('login.forgotPassword')}
                  className="mb-6"
                  onPress={onForgotPassword}
                >
                  <Text className="text-center text-sm font-semibold" style={{ color: BRAND.primary }}>
                    {t('login.forgotPassword')}
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                testID={isSignUp ? 'login-mode-button' : 'signup-mode-button'}
                accessibilityRole="button"
                accessibilityLabel={isSignUp ? 'Switch to sign in' : 'Switch to sign up'}
                className="mt-2"
                onPress={onToggleSignUp}
              >
                <Text className="text-center text-sm font-medium" style={{ color: BRAND.primary }}>
                  {isSignUp ? t('login.toggleToSignIn') : t('login.toggleToSignUp')}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
          </View>
        </KeyboardAvoidingView>

        {!keyboardVisible ? <AuthLegalFooter backendHealth={backendHealth} /> : null}
      </SafeAreaView>
    </View>
  );
}
