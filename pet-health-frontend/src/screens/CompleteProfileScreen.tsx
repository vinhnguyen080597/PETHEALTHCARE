import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
import { ProvinceSelectField } from '../components/form/ProvinceSelectField';
import {
  ACTIVE_BREEDER_SPECIES_OPTIONS,
  type ActiveBreederSpecies,
} from '../constants/petSpecies';
import { BRAND } from '../theme/brand';

type PetTypeIconSpec =
  | { library: 'fa5'; name: keyof typeof FontAwesome5.glyphMap }
  | { library: 'mci'; name: keyof typeof MaterialCommunityIcons.glyphMap };

const INTEREST_SPECIES_ICONS: Record<ActiveBreederSpecies, PetTypeIconSpec> = {
  dog: { library: 'fa5', name: 'dog' },
  cat: { library: 'fa5', name: 'cat' },
  bird: { library: 'fa5', name: 'dove' },
  fish: { library: 'fa5', name: 'fish' },
  rabbit: { library: 'mci', name: 'rabbit' },
  hamster: { library: 'mci', name: 'rodent' },
  reptile: { library: 'mci', name: 'snake' },
};

function SpeciesIcon({ spec, color }: { spec: PetTypeIconSpec; color: string }) {
  if (spec.library === 'mci') {
    return <MaterialCommunityIcons name={spec.name} size={18} color={color} />;
  }
  return <FontAwesome5 name={spec.name} size={16} color={color} />;
}

type CompleteProfileScreenProps = {
  displayName: string;
  interestedSpecies: string[];
  livingArea: string;
  error?: string;
  fieldError?: string;
  interestedSpeciesError?: string;
  livingAreaError?: string;
  loading?: boolean;
  onChangeDisplayName: (value: string) => void;
  onToggleInterestedSpecies: (species: string) => void;
  onChangeLivingArea: (value: string) => void;
  onSubmit: () => void;
};

export function CompleteProfileScreen({
  displayName,
  interestedSpecies,
  livingArea,
  error,
  fieldError,
  interestedSpeciesError,
  livingAreaError,
  loading = false,
  onChangeDisplayName,
  onToggleInterestedSpecies,
  onChangeLivingArea,
  onSubmit,
}: CompleteProfileScreenProps) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const canSubmit =
    Boolean(displayName.trim())
    && interestedSpecies.length > 0
    && Boolean(livingArea.trim())
    && !loading;

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

              <Text className="mb-2 mt-5 text-sm text-slate-700">
                {t('completeProfile.interestedSpeciesLabel')} <Text className="text-red-500">*</Text>
              </Text>
              <View className="flex-row flex-wrap gap-2.5">
                {ACTIVE_BREEDER_SPECIES_OPTIONS.map((species) => {
                  const active = interestedSpecies.includes(species);
                  const iconColor = active ? BRAND.btnPrimary : BRAND.textMuted;
                  return (
                    <Pressable
                      key={species}
                      testID={`complete-profile-species-${species}`}
                      accessibilityRole="button"
                      accessibilityLabel={t(`petFeed.filters.${species}`)}
                      accessibilityState={{ selected: active }}
                      className="w-[22%] min-w-[64px] items-center gap-1"
                      onPress={() => onToggleInterestedSpecies(species)}
                    >
                      <View
                        className="h-11 w-11 items-center justify-center rounded-full"
                        style={{
                          borderWidth: 1.5,
                          borderColor: active ? BRAND.btnPrimary : '#E5E7EB',
                          backgroundColor: active ? BRAND.surfaceLight : '#F8FAFC',
                        }}
                      >
                        <SpeciesIcon spec={INTEREST_SPECIES_ICONS[species]} color={iconColor} />
                      </View>
                      <Text
                        className="text-center text-[11px] font-semibold"
                        style={{ color: active ? BRAND.textBrandLink : BRAND.textMuted }}
                      >
                        {t(`petFeed.filters.${species}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {interestedSpeciesError ? (
                <Text testID="complete-profile-species-error" className="mt-1.5 text-xs font-medium text-red-600">
                  {interestedSpeciesError}
                </Text>
              ) : (
                <Text className="mt-2 text-xs text-slate-500">{t('completeProfile.interestedSpeciesHelper')}</Text>
              )}

              <View className="mt-2">
                <ProvinceSelectField
                  label={t('completeProfile.livingAreaLabel')}
                  value={livingArea}
                  onChange={onChangeLivingArea}
                  required
                  error={livingAreaError}
                  placeholder={t('completeProfile.livingAreaPlaceholder')}
                  labelClassName="mb-0 text-sm text-slate-700"
                />
              </View>
              {!livingAreaError ? (
                <Text className="mt-1.5 text-xs text-slate-500">{t('completeProfile.livingAreaHelper')}</Text>
              ) : null}

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
