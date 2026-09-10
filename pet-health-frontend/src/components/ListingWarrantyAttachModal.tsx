import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND } from '../theme/brand';
import { modalBottomInset } from '../utils/modalSafeArea';
import type { WarrantyPolicy } from '../utils/warrantyPolicy';

type ListingWarrantyAttachModalProps = {
  visible: boolean;
  listingTitle: string;
  selectedPolicyId: string;
  options: WarrantyPolicy[];
  loading?: boolean;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onChangePolicyId: (policyId: string) => void;
  onSave: () => void;
  onOpenLibrary?: () => void;
};

export function ListingWarrantyAttachModal({
  visible,
  listingTitle,
  selectedPolicyId,
  options,
  loading = false,
  busy = false,
  error = '',
  onClose,
  onChangePolicyId,
  onSave,
  onOpenLibrary,
}: ListingWarrantyAttachModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [openPicker, setOpenPicker] = useState(false);

  useEffect(() => {
    if (!visible) setOpenPicker(false);
  }, [visible]);

  const selected = options.find((policy) => policy.id === selectedPolicyId);
  const selectedLabel = selected?.title || t('warranty.noneOption');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={busy ? undefined : onClose} />
        <View
          className="rounded-t-2xl bg-white px-4 pt-3"
          style={{ paddingBottom: modalBottomInset(insets.bottom, 16) }}
        >
          <View className="mb-2 self-center rounded-full bg-gray-200 px-10 py-1" />
          <Text className="text-base font-bold text-slate-900">{t('warranty.attachTitle')}</Text>
          <Text className="mt-1 text-sm text-slate-500" numberOfLines={2}>
            {listingTitle}
          </Text>

          {loading ? (
            <View className="items-center py-8">
              <ActivityIndicator color={BRAND.btnPrimary} />
            </View>
          ) : (
            <>
              <Text className="mb-1.5 mt-4 text-xs font-semibold uppercase text-slate-500">
                {t('warranty.library.title')}
              </Text>
              <Pressable
                accessibilityRole="button"
                className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 active:bg-slate-100"
                onPress={() => setOpenPicker((current) => !current)}
              >
                <Text className="flex-1 pr-2 text-sm font-semibold text-slate-900" numberOfLines={1}>
                  {selectedLabel}
                </Text>
                <Text className="text-xs font-semibold text-slate-400">{openPicker ? '▴' : '▾'}</Text>
              </Pressable>
              {openPicker ? (
                <ScrollView className="mt-2 max-h-48 rounded-xl border border-slate-100">
                  <Pressable
                    className="border-b border-slate-100 px-3 py-3 active:bg-slate-50"
                    onPress={() => {
                      onChangePolicyId('');
                      setOpenPicker(false);
                    }}
                  >
                    <Text className="text-sm font-medium text-slate-700">{t('warranty.noneOption')}</Text>
                  </Pressable>
                  {options.map((policy) => (
                    <Pressable
                      key={policy.id}
                      className="border-b border-slate-100 px-3 py-3 active:bg-slate-50"
                      onPress={() => {
                        onChangePolicyId(policy.id);
                        setOpenPicker(false);
                      }}
                    >
                      <Text className="text-sm font-medium text-slate-900">{policy.title}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
              {options.length === 0 ? (
                <View className="mt-3">
                  <Text className="text-xs leading-5 text-amber-800">{t('warranty.attachEmpty')}</Text>
                  {onOpenLibrary ? (
                    <Pressable className="mt-2 self-start active:opacity-80" onPress={onOpenLibrary}>
                      <Text className="text-xs font-semibold text-[#B45309] underline">
                        {t('warranty.library.createNew')}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </>
          )}

          {error ? <Text className="mt-3 text-xs font-medium text-red-600">{error}</Text> : null}

          <View className="mt-4 flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              className="flex-1 rounded-full border border-slate-200 py-2.5 active:bg-slate-50"
              onPress={onClose}
            >
              <Text className="text-center text-sm font-semibold text-slate-600">{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy || loading}
              className="flex-1 rounded-full py-2.5 active:opacity-90"
              style={{ backgroundColor: BRAND.btnPrimary, opacity: busy || loading ? 0.6 : 1 }}
              onPress={onSave}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-center text-sm font-bold text-white">{t('warranty.attachSave')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
