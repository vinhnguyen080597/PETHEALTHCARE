import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
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

type CompleteProfileScreenProps = {
  displayName: string;
  error?: string;
  fieldError?: string;
  loading?: boolean;
  onChangeDisplayName: (value: string) => void;
  onSubmit: () => void;
};

export function CompleteProfileScreen({
  displayName,
  error,
  fieldError,
  loading = false,
  onChangeDisplayName,
  onSubmit,
}: CompleteProfileScreenProps) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const canSubmit = Boolean(displayName.trim()) && !loading;

  return (
    <View className="flex-1 bg-[#FCFBFA]">
      <AuthWarmBackdrop />
      <SafeAreaView className="flex-1" edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="items-center pb-5">
              <View
                className="mb-5 h-20 w-20 items-center justify-center rounded-full"
                style={{ backgroundColor: BRAND.primarySoft }}
              >
                <Ionicons name="person-outline" size={36} color={BRAND.primary} />
              </View>
              <Text className="mb-2 text-center text-2xl font-bold" style={{ color: BRAND.text }}>
                {t('completeProfile.title')}
              </Text>
              <Text className="max-w-sm text-center text-base leading-6" style={{ color: BRAND.textMuted }}>
                {t('completeProfile.subtitle')}
              </Text>
            </View>

            <View className="w-full max-w-sm self-center rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
              {error ? (
                <View testID="complete-profile-error" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <Text className="text-sm font-medium text-red-700">{error}</Text>
                </View>
              ) : null}

              <Text className="mb-2 text-sm text-slate-700">
                {t('completeProfile.displayNameLabel')} <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                testID="signup-display-name-input"
                accessibilityLabel={t('completeProfile.displayNameLabel')}
                className="rounded-xl border bg-white px-4 py-3 text-base text-slate-900"
                style={{
                  borderColor: fieldError ? '#f87171' : focused ? BRAND.primary : BRAND.inputBorder,
                }}
                placeholder={t('completeProfile.displayNamePlaceholder')}
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={160}
                value={displayName}
                onChangeText={onChangeDisplayName}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
              {fieldError ? (
                <Text testID="signup-display-name-error" className="mt-1.5 text-xs font-medium text-red-600">
                  {fieldError}
                </Text>
              ) : (
                <Text className="mt-2 text-xs text-slate-500">{t('completeProfile.displayNameHelper')}</Text>
              )}

              <Pressable
                testID="complete-profile-submit-button"
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit }}
                disabled={!canSubmit}
                className="mt-6 w-full rounded-xl py-3.5"
                style={{ backgroundColor: canSubmit ? BRAND.primary : '#FDBA74', opacity: canSubmit ? 1 : 0.7 }}
                onPress={onSubmit}
              >
                <Text className="text-center text-base font-semibold text-white">
                  {t('completeProfile.submit')}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
