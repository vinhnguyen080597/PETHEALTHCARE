import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BRAND } from '../theme/brand';
import {
  listingStatusChoicesExcludingCurrent,
  type ListingStatusChoice,
} from '../utils/listingStatusChoices';

export type ListingStatusSubmitPayload =
  | { type: 'published' | 'deposit_hold' }
  | {
      type: 'sold';
      saleChannel: 'on_platform' | 'off_platform';
      buyerEmail?: string;
    };

type ListingStatusModalProps = {
  visible: boolean;
  currentStatus: string | null | undefined;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (payload: ListingStatusSubmitPayload) => void | Promise<void>;
};

type Step = 'choose' | 'sold';
type SaleChannel = 'on_platform' | 'off_platform';

type ChoiceVisual = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
};

const CHOICE_VISUALS: Record<ListingStatusChoice, ChoiceVisual> = {
  published: { icon: 'checkmark-circle-outline', iconColor: '#059669', iconBg: '#ECFDF5' },
  deposit_hold: { icon: 'hourglass-outline', iconColor: '#D97706', iconBg: '#FFFBEB' },
  sold: { icon: 'bag-check-outline', iconColor: '#475569', iconBg: '#F1F5F9' },
};

const SALE_CHANNEL_VISUALS: Record<SaleChannel, ChoiceVisual> = {
  on_platform: { icon: 'storefront-outline', iconColor: '#EA580C', iconBg: '#FFF7ED' },
  off_platform: { icon: 'globe-outline', iconColor: '#475569', iconBg: '#F1F5F9' },
};

function choiceTestId(choice: ListingStatusChoice) {
  if (choice === 'published') return 'listing-status-published';
  if (choice === 'deposit_hold') return 'listing-status-deposit-hold';
  return 'listing-status-sold';
}

export function ListingStatusModal({
  visible,
  currentStatus,
  busy = false,
  onClose,
  onSubmit,
}: ListingStatusModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('choose');
  const [saleChannel, setSaleChannel] = useState<SaleChannel | null>(null);
  const [buyerEmail, setBuyerEmail] = useState('');

  const choices = useMemo(
    () => listingStatusChoicesExcludingCurrent(currentStatus),
    [currentStatus],
  );

  useEffect(() => {
    if (!visible) return;
    setStep('choose');
    setSaleChannel(null);
    setBuyerEmail('');
  }, [visible, currentStatus]);

  function handleClose() {
    if (busy) return;
    onClose();
  }

  function handleChooseStatus(choice: ListingStatusChoice) {
    if (busy) return;
    if (choice === 'sold') {
      setStep('sold');
      return;
    }
    void onSubmit({ type: choice });
  }

  function handleSelectSaleChannel(channel: SaleChannel) {
    if (busy) return;
    setSaleChannel(channel);
  }

  function handleConfirmSold() {
    if (busy || !saleChannel) return;
    void onSubmit({
      type: 'sold',
      saleChannel,
      buyerEmail:
        saleChannel === 'on_platform' ? buyerEmail.trim() || undefined : undefined,
    });
  }

  const title =
    step === 'choose'
      ? t('listing.statusModal.title')
      : t('listing.statusModal.saleChannel');

  const subtitle =
    step === 'choose'
      ? t('listing.statusModal.subtitle')
      : t('listing.statusModal.saleChannelHint');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.cancel')}
        onPress={handleClose}
        style={{
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          backgroundColor: 'rgba(0,0,0,0.4)',
        }}
      >
        <Pressable
          accessibilityRole="none"
          onPress={(event) => event.stopPropagation()}
          className="w-full max-w-md self-center overflow-hidden rounded-3xl bg-white p-5"
        >
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1 gap-1">
              {step === 'sold' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common.back')}
                  disabled={busy}
                  className="mb-1 flex-row items-center gap-1 self-start active:opacity-70"
                  onPress={() => {
                    setStep('choose');
                    setSaleChannel(null);
                    setBuyerEmail('');
                  }}
                >
                  <Ionicons name="chevron-back" size={18} color={BRAND.textMuted} />
                  <Text className="text-sm font-semibold text-slate-500">{t('common.back')}</Text>
                </Pressable>
              ) : null}
              <Text className="text-lg font-bold text-slate-900">{title}</Text>
              <Text className="text-sm leading-5 text-slate-500">{subtitle}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              disabled={busy}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
              onPress={handleClose}
            >
              <Ionicons name="close" size={20} color={BRAND.textMuted} />
            </Pressable>
          </View>

          {step === 'choose' ? (
            <View className="mt-4 gap-2.5">
              {choices.map((choice) => {
                const visual = CHOICE_VISUALS[choice];
                return (
                  <Pressable
                    key={choice}
                    testID={choiceTestId(choice)}
                    accessibilityRole="button"
                    disabled={busy}
                    className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 active:bg-slate-50"
                    onPress={() => handleChooseStatus(choice)}
                  >
                    <View
                      className="h-11 w-11 items-center justify-center rounded-xl"
                      style={{ backgroundColor: visual.iconBg }}
                    >
                      <Ionicons name={visual.icon} size={22} color={visual.iconColor} />
                    </View>
                    <Text className="min-w-0 flex-1 text-base font-semibold text-slate-900">
                      {t(`listing.statusChoice.${choice}`)}
                    </Text>
                    {choice === 'sold' ? (
                      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View className="mt-4 gap-2.5">
              {(['on_platform', 'off_platform'] as const).map((channel) => {
                const visual = SALE_CHANNEL_VISUALS[channel];
                const selected = saleChannel === channel;
                return (
                  <Pressable
                    key={channel}
                    testID={channel === 'on_platform' ? 'listing-sale-on-platform' : 'listing-sale-off-platform'}
                    accessibilityRole="button"
                    disabled={busy}
                    className={`flex-row items-center gap-3 rounded-2xl border px-4 py-3.5 active:bg-slate-50 ${
                      selected ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-white'
                    }`}
                    onPress={() => handleSelectSaleChannel(channel)}
                  >
                    <View
                      className="h-11 w-11 items-center justify-center rounded-xl"
                      style={{ backgroundColor: visual.iconBg }}
                    >
                      <Ionicons name={visual.icon} size={22} color={visual.iconColor} />
                    </View>
                    <Text className="min-w-0 flex-1 text-base font-semibold text-slate-900">
                      {t(`listing.statusModal.${channel === 'on_platform' ? 'onPlatform' : 'offPlatform'}`)}
                    </Text>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={20} color={BRAND.btnPrimary} />
                    ) : null}
                  </Pressable>
                );
              })}

              {saleChannel === 'on_platform' ? (
                <View className="mt-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <Text className="text-sm text-slate-600">
                    {t('listing.statusModal.buyerEmailOptional')}
                  </Text>
                  <TextInput
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder={t('listing.statusModal.buyerEmailPlaceholder')}
                    placeholderTextColor="#94a3b8"
                    value={buyerEmail}
                    editable={!busy}
                    onChangeText={setBuyerEmail}
                  />
                </View>
              ) : null}
            </View>
          )}

          {step === 'choose' && busy ? (
            <View className="mt-4 items-center">
              <ActivityIndicator color={BRAND.btnPrimary} />
            </View>
          ) : null}

          {step === 'sold' ? (
            <View className="mt-4 flex-row items-center justify-between gap-3">
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                className="flex-1 items-center rounded-xl border border-slate-200 py-3 active:bg-slate-50"
                onPress={handleClose}
              >
                <Text className="text-sm font-semibold text-slate-600">{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                testID="listing-status-confirm-sold"
                disabled={busy || !saleChannel}
                className="flex-1 items-center rounded-xl py-3 active:opacity-90"
                style={{
                  backgroundColor: BRAND.btnPrimary,
                  opacity: busy || !saleChannel ? 0.6 : 1,
                }}
                onPress={handleConfirmSold}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-sm font-bold text-white">{t('listing.statusModal.update')}</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              className="mt-4 items-center py-2 active:opacity-70"
              onPress={handleClose}
            >
              <Text className="text-sm font-semibold text-slate-500">{t('common.cancel')}</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
