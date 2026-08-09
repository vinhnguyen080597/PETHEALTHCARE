import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export type AdminRejectBreederPayload = {
  rejectionReason: string;
  adminAction?: string;
  adminNote?: string;
};

type AdminRejectBreederModalProps = {
  visible: boolean;
  submitting?: boolean;
  variant?: 'breeder' | 'listing';
  onClose: () => void;
  onSubmit: (payload: AdminRejectBreederPayload) => void | Promise<void>;
};

export function AdminRejectBreederModal({
  visible,
  submitting = false,
  variant = 'breeder',
  onClose,
  onSubmit,
}: AdminRejectBreederModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [action, setAction] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const isListing = variant === 'listing';

  useEffect(() => {
    if (!visible) return;
    setReason('');
    setAction('');
    setNote('');
    setError('');
  }, [visible]);

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(t('adminReview.rejectReasonRequired'));
      return;
    }
    await onSubmit({
      rejectionReason: trimmed,
      adminAction: action.trim() || undefined,
      adminNote: note.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/40 px-5" onPress={onClose}>
        <Pressable
          className="w-full max-w-md rounded-2xl bg-white p-4"
          onPress={(event) => event.stopPropagation?.()}
        >
          <Text className="text-base font-bold text-slate-900">
            {t(isListing ? 'adminReview.rejectListingTitle' : 'adminReview.rejectTitle')}
          </Text>
          <Text className="mt-1 text-xs leading-5 text-slate-500">
            {t(isListing ? 'adminReview.rejectListingHint' : 'adminReview.rejectHint')}
          </Text>

          <Text className="mt-4 text-xs font-semibold uppercase text-slate-500">
            {t('adminReview.rejectReason')}
          </Text>
          <TextInput
            className="mt-1.5 min-h-[88px] rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-sm text-slate-900"
            multiline
            textAlignVertical="top"
            placeholder={t(
              isListing
                ? 'adminReview.rejectListingReasonPlaceholder'
                : 'adminReview.rejectReasonPlaceholder',
            )}
            value={reason}
            onChangeText={(value) => {
              setReason(value);
              if (error) setError('');
            }}
            editable={!submitting}
          />

          <Text className="mt-3 text-xs font-semibold uppercase text-slate-500">
            {t('adminReview.rejectAction')}
          </Text>
          <TextInput
            className="mt-1.5 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-sm text-slate-900"
            placeholder={t('adminReview.rejectActionPlaceholder')}
            value={action}
            onChangeText={setAction}
            editable={!submitting}
          />

          <Text className="mt-3 text-xs font-semibold uppercase text-slate-500">
            {t('adminReview.rejectNote')}
          </Text>
          <TextInput
            className="mt-1.5 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-sm text-slate-900"
            placeholder={t('adminReview.rejectNotePlaceholder')}
            value={note}
            onChangeText={setNote}
            editable={!submitting}
          />

          {error ? <Text className="mt-2 text-sm text-red-600">{error}</Text> : null}

          <View className="mt-4 flex-row gap-2">
            <Pressable
              className="flex-1 rounded-xl bg-slate-100 py-3 active:opacity-90"
              onPress={onClose}
              disabled={submitting}
            >
              <Text className="text-center text-sm font-bold text-slate-700">{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              className="flex-1 rounded-xl bg-amber-600 py-3 active:opacity-90"
              onPress={() => void handleSubmit()}
              disabled={submitting}
            >
              <Text className="text-center text-sm font-bold text-white">
                {submitting ? '…' : t('adminReview.reject')}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
