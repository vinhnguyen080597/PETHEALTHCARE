import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { APP_LINKS } from '../config';
import {
  LEGAL_COMPANY_PHONE,
  LEGAL_CONTACT_EMAIL,
  LEGAL_ENTERPRISE_CODE,
  LEGAL_OPERATOR_NAME_ABBR,
  LEGAL_SUPPORT_EMAIL,
  legalOperatorName,
  legalRegisteredAddress,
} from '../constants/legalOperator';

type OperatorDisclosureCardProps = {
  /** Compact layout for auth footer. */
  compact?: boolean;
  /** Hide card title/body when the parent screen already has a header. */
  hideHeader?: boolean;
  testID?: string;
};

function DisclosureRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-0.5">
      <Text className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</Text>
      <Text className="text-sm leading-5 text-slate-800">{value}</Text>
    </View>
  );
}

function MoitBadgePlaceholder({ compact }: { compact?: boolean }) {
  const { t } = useTranslation();
  const url = APP_LINKS.moitConfirmation;

  return (
    <Pressable
      testID="moit-badge-placeholder"
      accessibilityRole="link"
      accessibilityLabel={t('legal.moitBadgeA11y')}
      className={`items-center justify-center rounded-xl border border-dashed border-emerald-400/80 bg-emerald-50 ${
        compact ? 'px-3 py-3' : 'px-4 py-4'
      } active:bg-emerald-100`}
      onPress={() => void Linking.openURL(url)}
    >
      <View className="flex-row items-center gap-2">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-emerald-600">
          <Ionicons name="shield-checkmark" size={16} color="#fff" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-bold text-emerald-900">{t('legal.moitBadgeTitle')}</Text>
          <Text className="mt-0.5 text-xs leading-4 text-emerald-800/80">{t('legal.moitBadgeHint')}</Text>
        </View>
        <Ionicons name="open-outline" size={16} color="#047857" />
      </View>
    </Pressable>
  );
}

export function OperatorDisclosureCard({
  compact = false,
  hideHeader = false,
  testID = 'operator-disclosure-card',
}: OperatorDisclosureCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'vi';
  const companyName = legalOperatorName(lang);
  const address = legalRegisteredAddress(lang);
  const phoneHref = `tel:${LEGAL_COMPANY_PHONE}`;
  const emailHref = `mailto:${LEGAL_CONTACT_EMAIL}`;

  return (
    <View
      testID={testID}
      className={`rounded-2xl border border-gray-200 bg-white ${compact ? 'p-3' : 'p-4'}`}
    >
      {!hideHeader ? (
        <>
          <Text className={`font-bold text-slate-900 ${compact ? 'text-sm' : 'text-base'}`}>
            {t('legal.operatorTitle')}
          </Text>
          {!compact ? (
            <Text className="mt-1 text-sm leading-5 text-slate-500">{t('legal.operatorBody')}</Text>
          ) : null}
        </>
      ) : null}

      <View className={`gap-3 ${hideHeader ? '' : compact ? 'mt-2.5' : 'mt-3'}`}>
        <DisclosureRow
          label={t('legal.operatorCompany')}
          value={`${companyName} (${LEGAL_OPERATOR_NAME_ABBR})`}
        />
        <DisclosureRow label={t('legal.operatorTaxCode')} value={LEGAL_ENTERPRISE_CODE} />
        <DisclosureRow label={t('legal.operatorAddress')} value={address} />
        <View className="flex-row flex-wrap gap-x-4 gap-y-2">
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t('legal.operatorHotlineA11y', { phone: LEGAL_COMPANY_PHONE })}
            onPress={() => void Linking.openURL(phoneHref)}
            className="active:opacity-70"
          >
            <DisclosureRow label={t('legal.operatorHotline')} value={LEGAL_COMPANY_PHONE} />
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t('legal.operatorEmailA11y', { email: LEGAL_SUPPORT_EMAIL })}
            onPress={() => void Linking.openURL(emailHref)}
            className="active:opacity-70"
          >
            <DisclosureRow label={t('legal.operatorEmail')} value={LEGAL_SUPPORT_EMAIL} />
          </Pressable>
        </View>
      </View>

      <View className={compact ? 'mt-3' : 'mt-4'}>
        <MoitBadgePlaceholder compact={compact} />
      </View>
    </View>
  );
}
