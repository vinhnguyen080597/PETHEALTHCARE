import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VIETNAM_PROVINCES } from '../../constants/vietnamProvinces';
import { modalBottomInset } from '../../utils/modalSafeArea';

type ProvinceSelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  onOpen?: () => void;
};

export function ProvinceSelectField({
  label,
  value,
  onChange,
  required = false,
  error,
  placeholder,
  onOpen,
}: ProvinceSelectFieldProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = VIETNAM_PROVINCES.find((province) => province === value);

  return (
    <View className="mt-3">
      <Text className="text-xs font-bold uppercase text-slate-500">
        {label}
        {required ? <Text className="text-red-500"> *</Text> : null}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} picker`}
        className={`mt-2 flex-row items-center justify-between rounded-xl border bg-slate-50 px-3 py-3 active:bg-slate-100 ${
          error ? 'border-red-400' : 'border-gray-200'
        }`}
        onPress={() => {
          onOpen?.();
          setOpen(true);
        }}
      >
        <Text className={`flex-1 pr-2 text-base ${selected ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>
          {selected ?? placeholder ?? label}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#64748b" />
      </Pressable>
      {error ? <Text className="mt-1.5 text-xs font-medium text-red-600">{error}</Text> : null}
      {open ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <View className="flex-1 justify-end">
            <Pressable className="absolute inset-0 bg-black/40" onPress={() => setOpen(false)} />
            <View
              className="max-h-[70%] rounded-t-2xl bg-white px-4 pt-2"
              style={{ paddingBottom: modalBottomInset(insets.bottom, 16) }}
            >
              <View className="mb-2 self-center rounded-full bg-gray-200 px-10 py-1" />
              <Text className="mb-1 text-center text-sm font-semibold text-slate-500">{label}</Text>
              <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
                {VIETNAM_PROVINCES.map((province) => {
                  const active = province === value;
                  return (
                    <Pressable
                      key={province}
                      accessibilityRole="button"
                      className="border-b border-gray-100 py-3.5 active:bg-gray-50"
                      onPress={() => {
                        onChange(province);
                        setOpen(false);
                      }}
                    >
                      <Text className={`text-center text-base ${active ? 'font-bold text-blue-600' : 'text-slate-900'}`}>
                        {province}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Pressable className="mt-2 py-3" onPress={() => setOpen(false)}>
                <Text className="text-center text-base text-blue-600">{t('common.cancel')}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
