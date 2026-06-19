import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatBirthDateIso, parseBirthDateIso } from '../utils/petAge';

type FormDateFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  maximumDate?: Date;
  testID?: string;
  required?: boolean;
  onChange: (value: string) => void;
};

function RequiredLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 text-sm font-semibold text-slate-900">
      {children} <Text className="text-red-500">*</Text>
    </Text>
  );
}

export function FormDateField({
  label,
  value,
  placeholder,
  error,
  maximumDate,
  testID,
  required,
  onChange,
}: FormDateFieldProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const selectedDate = parseBirthDateIso(value);
  const pickerValue = selectedDate ?? maximumDate ?? new Date();

  function handleChange(event: DateTimePickerEvent, nextDate?: Date) {
    if (event.type === 'dismissed') {
      setOpen(false);
      return;
    }
    if (nextDate) onChange(formatBirthDateIso(nextDate));
    if (Platform.OS !== 'ios') setOpen(false);
  }

  const displayValue = selectedDate
    ? new Intl.DateTimeFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(selectedDate)
    : null;

  return (
    <View className="mb-5">
      {required ? <RequiredLabel>{label}</RequiredLabel> : <Text className="mb-2 text-sm font-semibold text-slate-900">{label}</Text>}
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        className={`flex-row items-center justify-between rounded-xl border bg-white px-4 py-3 active:bg-gray-50 ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
        onPress={() => setOpen(true)}
      >
        <Text className={`text-base ${displayValue ? 'text-slate-900' : 'text-gray-400'}`}>
          {displayValue ?? placeholder ?? t('addPet.birthDatePlaceholder')}
        </Text>
        <Ionicons name="calendar-outline" size={20} color="#64748b" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/40" onPress={() => setOpen(false)} />
          <View className="rounded-t-2xl bg-white px-4 pb-8 pt-2">
            <View className="mb-2 self-center rounded-full bg-gray-200 px-10 py-1" />
            <Text className="mb-2 text-center text-base font-semibold text-slate-900">{label}</Text>
            <DateTimePicker
              testID={testID ? `${testID}-picker` : undefined}
              value={pickerValue}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={maximumDate}
              onChange={handleChange}
            />
            {Platform.OS === 'ios' ? (
              <Pressable
                className="mt-2 rounded-xl bg-blue-600 py-3 active:opacity-90"
                onPress={() => {
                  if (!value) onChange(formatBirthDateIso(pickerValue));
                  setOpen(false);
                }}
              >
                <Text className="text-center text-sm font-bold text-white">{t('common.done')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
      {error ? <Text className="mt-1.5 text-xs font-semibold text-red-600">{error}</Text> : null}
    </View>
  );
}
