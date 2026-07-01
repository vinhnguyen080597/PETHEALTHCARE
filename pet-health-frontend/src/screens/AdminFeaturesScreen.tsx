import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import type { AppFeatureFlags } from '../types';
import { RELEASE_MONETIZATION_ENABLED } from '../constants/releaseMonetization';

const PRIMARY = '#2563eb';

type FeatureToggleKey = keyof AppFeatureFlags;

const FEATURE_ITEMS: Array<{
  key: FeatureToggleKey;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'breed_recognition', icon: 'paw-outline' },
  { key: 'health_analysis', icon: 'pulse-outline' },
  // v1 release: monetization disabled
  ...(RELEASE_MONETIZATION_ENABLED
    ? ([
        { key: 'rewarded_ads' as const, icon: 'play-circle-outline' as const },
        { key: 'subscription' as const, icon: 'star-outline' as const },
      ] as const)
    : []),
];

type AdminFeaturesScreenProps = {
  flags: AppFeatureFlags | null;
  loading: boolean;
  savingKey: FeatureToggleKey | null;
  onToggle: (key: FeatureToggleKey, enabled: boolean) => Promise<void>;
  onLogout: () => void;
};

export function AdminFeaturesScreen({
  flags,
  loading,
  savingKey,
  onToggle,
  onLogout,
}: AdminFeaturesScreenProps) {
  const { t } = useTranslation();

  async function handleToggle(key: FeatureToggleKey, nextValue: boolean) {
    try {
      await onToggle(key, nextValue);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.unknownError');
      Alert.alert(t('adminFeatures.updateFailed'), message);
    }
  }

  return (
    <ScrollView
      testID="admin-features-screen"
      className="flex-1 bg-[#F2F4F8]"
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-xl font-bold text-slate-900">{t('adminFeatures.title')}</Text>
      <Text className="mt-2 text-sm leading-5 text-slate-600">{t('adminFeatures.subtitle')}</Text>

      {loading && !flags ? (
        <View className="mt-10 items-center">
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <View className="mt-6 gap-3">
          {FEATURE_ITEMS.map((item) => {
            const enabled = flags?.[item.key] !== false;
            const saving = savingKey === item.key;
            return (
              <View
                key={item.key}
                testID={`admin-feature-toggle-${item.key}`}
                className="rounded-2xl border border-gray-200 bg-white p-4"
              >
                <View className="flex-row items-start gap-3">
                  <View className="mt-0.5 h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
                    <Ionicons name={item.icon} size={22} color={PRIMARY} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-base font-bold text-slate-900">{t(`adminFeatures.items.${item.key}.title`)}</Text>
                    <Text className="mt-1 text-sm leading-5 text-slate-600">{t(`adminFeatures.items.${item.key}.description`)}</Text>
                    <Text className={`mt-2 text-xs font-bold uppercase ${enabled ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {enabled ? t('adminFeatures.statusOn') : t('adminFeatures.statusOff')}
                    </Text>
                  </View>
                  <Switch
                    testID={`admin-feature-switch-${item.key}`}
                    value={enabled}
                    disabled={saving || loading}
                    onValueChange={(value) => void handleToggle(item.key, value)}
                    trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                    thumbColor={enabled ? PRIMARY : '#f8fafc'}
                  />
                </View>
                {saving ? (
                  <View className="mt-3 flex-row items-center gap-2">
                    <ActivityIndicator size="small" color={PRIMARY} />
                    <Text className="text-xs text-slate-500">{t('adminFeatures.saving')}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      <View className="mt-8 rounded-2xl border border-gray-200 bg-white p-4">
        <Text className="text-sm font-bold text-slate-900">{t('adminFeatures.noteTitle')}</Text>
        <Text className="mt-2 text-sm leading-5 text-slate-600">{t('adminFeatures.noteBody')}</Text>
      </View>

      <Pressable
        testID="admin-features-logout-button"
        accessibilityRole="button"
        className="mt-6 flex-row items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 py-3 active:bg-red-100"
        onPress={onLogout}
      >
        <Ionicons name="log-out-outline" size={18} color="#dc2626" />
        <Text className="text-sm font-bold text-red-600">{t('account.menu.logout')}</Text>
      </Pressable>
    </ScrollView>
  );
}
