import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PET_FEED_REPORT_REASONS, type PetFeedReportReason } from '../constants/petFeedReportReasons';

const PRIMARY = '#1E6FE8';

type ReportModalProps = {
  visible: boolean;
  title: string;
  body: string;
  reason: PetFeedReportReason;
  note: string;
  reasonLabel: (reason: PetFeedReportReason) => string;
  notePlaceholder: string;
  submitLabel: string;
  onChangeReason: (reason: PetFeedReportReason) => void;
  onChangeNote: (note: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

export function ReportModal({
  visible,
  title,
  body,
  reason,
  note,
  reasonLabel,
  notePlaceholder,
  submitLabel,
  onChangeReason,
  onChangeNote,
  onCancel,
  onSubmit,
}: ReportModalProps) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 justify-center bg-black/40 px-5">
        <View className="rounded-3xl bg-white p-5">
          <Text className="text-lg font-bold text-slate-900">{title}</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-500">{body}</Text>
          <View className="mt-4 gap-2">
            {PET_FEED_REPORT_REASONS.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityLabel={reasonLabel(item)}
                accessibilityState={{ selected: reason === item }}
                className={`flex-row items-center justify-between rounded-xl border px-3 py-3 ${
                  reason === item ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
                onPress={() => onChangeReason(item)}
              >
                <Text className={`text-sm font-semibold ${reason === item ? 'text-blue-700' : 'text-slate-700'}`}>
                  {reasonLabel(item)}
                </Text>
                {reason === item ? <Ionicons name="checkmark" size={18} color={PRIMARY} /> : null}
              </Pressable>
            ))}
          </View>
          <TextInput
            className="mt-4 min-h-[84px] rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-sm text-slate-900"
            accessibilityLabel={notePlaceholder}
            placeholder={notePlaceholder}
            placeholderTextColor="#94a3b8"
            multiline
            textAlignVertical="top"
            value={note}
            onChangeText={onChangeNote}
          />
          <View className="mt-4 flex-row gap-3">
            <Pressable accessibilityRole="button" className="flex-1 rounded-xl border border-gray-200 py-3" onPress={onCancel}>
              <Text className="text-center text-sm font-bold text-slate-700">{t('common.cancel')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" className="flex-1 rounded-xl bg-blue-600 py-3" onPress={onSubmit}>
              <Text className="text-center text-sm font-bold text-white">{submitLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
