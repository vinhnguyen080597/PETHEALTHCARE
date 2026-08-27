import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Trans, useTranslation } from 'react-i18next';
import { APP_LINKS } from '../config';

const MARKETPLACE_DISCLAIMER_DISMISSED_KEY = 'pet-health-care:marketplace-disclaimer-dismissed:v1';

type MarketplaceDisclaimerAlertProps = {
  compact?: boolean;
  className?: string;
};

/** Amber alert shown until the user dismisses it once (persisted). */
export function MarketplaceDisclaimerAlert({ compact = false, className = '' }: MarketplaceDisclaimerAlertProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(MARKETPLACE_DISCLAIMER_DISMISSED_KEY).then((value) => {
      if (!cancelled) setVisible(value !== '1');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function dismiss() {
    setVisible(false);
    try {
      await AsyncStorage.setItem(MARKETPLACE_DISCLAIMER_DISMISSED_KEY, '1');
    } catch {
      // If storage fails, hide for this session anyway.
    }
  }

  if (visible !== true) return null;

  return (
    <View
      className={`flex-row items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 ${className}`}
      accessibilityRole="alert"
    >
      <Ionicons name="information-circle-outline" size={compact ? 17 : 18} color="#b45309" style={{ marginTop: 2 }} />
      <Text className={`min-w-0 flex-1 leading-5 text-amber-950 ${compact ? 'text-xs' : 'text-sm'}`}>
        <Trans
          i18nKey="legal.marketplaceDisclaimer"
          components={{
            guidelines: (
              <Text
                className="font-bold underline"
                onPress={() => void Linking.openURL(APP_LINKS.marketplaceGuidelines)}
              />
            ),
          }}
        />
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('legal.dismissMarketplaceDisclaimer')}
        className="-mr-0.5 rounded-full p-0.5 active:bg-amber-100/80"
        hitSlop={8}
        onPress={() => void dismiss()}
      >
        <Ionicons name="close" size={18} color="#92400e" />
      </Pressable>
    </View>
  );
}

type MarketplaceDisclaimerBannerProps = {
  compact?: boolean;
  className?: string;
};

/** Static disclaimer (always visible) — e.g. create listing flow. */
export function MarketplaceDisclaimerBanner({ compact = false, className = '' }: MarketplaceDisclaimerBannerProps) {
  return (
    <View className={`rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 ${className}`}>
      <Text className={`leading-5 text-amber-950 ${compact ? 'text-xs' : 'text-sm'}`}>
        <Trans
          i18nKey="legal.marketplaceDisclaimer"
          components={{
            guidelines: (
              <Text
                className="font-bold underline"
                onPress={() => void Linking.openURL(APP_LINKS.marketplaceGuidelines)}
              />
            ),
          }}
        />
      </Text>
    </View>
  );
}

type MarketplaceListingTermsCheckboxProps = {
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
};

export function MarketplaceListingTermsCheckbox({
  checked,
  onToggle,
  disabled = false,
}: MarketplaceListingTermsCheckboxProps) {
  const { t } = useTranslation();

  return (
    <View
      className={`mb-3 rounded-xl border px-3 py-3 ${
        checked ? 'border-orange-200 bg-orange-50/40' : 'border-slate-200 bg-white'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <View className="flex-row items-start gap-3">
        <Pressable
          testID="create-pet-feed-post-marketplace-terms-checkbox"
          accessibilityRole="checkbox"
          accessibilityState={{ checked, disabled }}
          accessibilityLabel={t('legal.marketplaceListingTermsLabel')}
          disabled={disabled}
          hitSlop={6}
          onPress={onToggle}
        >
          <Ionicons
            name={checked ? 'checkbox' : 'square-outline'}
            size={22}
            color={checked ? '#2563eb' : '#94a3b8'}
            style={{ marginTop: 1 }}
          />
        </Pressable>
        <Text className="min-w-0 flex-1 text-sm leading-5 text-slate-700">
          <Trans
            i18nKey="legal.marketplaceListingTermsBody"
            components={{
              guidelines: (
                <Text
                  className="font-bold text-orange-600 underline"
                  onPress={() => void Linking.openURL(APP_LINKS.marketplaceGuidelines)}
                />
              ),
            }}
          />
        </Text>
      </View>
    </View>
  );
}
