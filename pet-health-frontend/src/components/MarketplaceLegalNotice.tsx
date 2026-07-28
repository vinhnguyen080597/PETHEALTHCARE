import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, Text, View } from 'react-native';
import { Trans, useTranslation } from 'react-i18next';
import { APP_LINKS } from '../config';

type MarketplaceDisclaimerBannerProps = {
  compact?: boolean;
  className?: string;
};

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
        checked ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200 bg-white'
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
                  className="font-bold text-blue-700 underline"
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
