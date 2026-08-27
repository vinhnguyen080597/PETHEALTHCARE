import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { modalBottomInset } from '../../utils/modalSafeArea';

export type FormSelectOption = {
  value: string;
  label: string;
};

type FormSelectFieldProps = {
  label: string;
  value: string;
  options: FormSelectOption[];
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  testID?: string;
};

export function FormSelectField({
  label,
  value,
  options,
  onChange,
  required = false,
  error,
  placeholder,
  testID,
}: FormSelectFieldProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View className="mt-3" testID={testID}>
      <Text className="text-xs font-medium text-[#6E5A51]">
        {label}
        {required ? <Text className="font-semibold text-red-500"> *</Text> : null}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} picker`}
        className={`mt-1.5 flex-row items-center justify-between rounded-xl border bg-white px-4 py-2.5 active:bg-[#FFF8EF] ${
          error ? 'border-red-400' : 'border-[#F0E6D8]'
        }`}
        onPress={() => setOpen(true)}
      >
        <Text
          className={`flex-1 pr-2 text-sm ${selected ? 'font-semibold text-[#2B1E19]' : 'text-[#94A3B8]'}`}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder ?? label}
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
                {options.map((option) => {
                  const active = option.value === value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      className="border-b border-gray-100 py-3.5 active:bg-gray-50"
                      onPress={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                    >
                      <Text
                        className={`text-center text-base ${active ? 'font-bold text-[#D97706]' : 'text-slate-900'}`}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Pressable className="mt-2 py-3" onPress={() => setOpen(false)}>
                <Text className="text-center text-base text-[#D97706]">{t('common.cancel')}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
