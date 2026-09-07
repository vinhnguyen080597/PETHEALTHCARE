import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export type AdminRejectScoreKind = 'transparency' | 'compliance' | 'review';

export type AdminRejectBreederPayload = {
  rejectionReason: string;
  adminAction?: string;
  adminNote?: string;
  penaltyPoints?: number;
  penaltyKind?: AdminRejectScoreKind;
};

const SCORE_KINDS: AdminRejectScoreKind[] = ['transparency', 'compliance', 'review'];

type AdminRejectBreederModalProps = {
  visible: boolean;
  submitting?: boolean;
  variant?: 'breeder' | 'listing' | 'farm_review';
  onClose: () => void;
  onSubmit: (payload: AdminRejectBreederPayload) => void | Promise<void>;
};

function parsePenaltyFields(
  pointsText: string,
  kind: string,
):
  | { ok: true; penaltyPoints?: number; penaltyKind?: AdminRejectScoreKind }
  | { ok: false; errorKey: 'adminReview.rejectPenaltyRequired' | 'adminReview.rejectPenaltyInvalid' } {
  const trimmed = pointsText.trim();
  const hasPoints = trimmed.length > 0;
  const hasKind = SCORE_KINDS.includes(kind as AdminRejectScoreKind);
  if (!hasPoints && !hasKind) return { ok: true };
  if (!hasPoints || !hasKind) return { ok: false, errorKey: 'adminReview.rejectPenaltyRequired' };
  const pts = Number(trimmed);
  if (!Number.isFinite(pts) || pts !== Math.round(pts) || pts < 1 || pts > 100) {
    return { ok: false, errorKey: 'adminReview.rejectPenaltyInvalid' };
  }
  return { ok: true, penaltyPoints: pts, penaltyKind: kind as AdminRejectScoreKind };
}

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
  const [penaltyPoints, setPenaltyPoints] = useState('');
  const [penaltyKind, setPenaltyKind] = useState('');
  const [kindOpen, setKindOpen] = useState(false);
  const [error, setError] = useState('');
  const isListing = variant === 'listing';
  const isFarmReview = variant === 'farm_review';
  const showScoreFields = variant === 'breeder';

  useEffect(() => {
    if (!visible) return;
    setReason('');
    setAction('');
    setNote('');
    setPenaltyPoints('');
    setPenaltyKind('');
    setKindOpen(false);
    setError('');
  }, [visible]);

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(t('adminReview.rejectReasonRequired'));
      return;
    }
    const penalty = parsePenaltyFields(penaltyPoints, penaltyKind);
    if (!penalty.ok) {
      setError(t(penalty.errorKey));
      return;
    }
    await onSubmit({
      rejectionReason: trimmed,
      adminAction: action.trim() || undefined,
      adminNote: note.trim() || undefined,
      penaltyPoints: penalty.penaltyPoints,
      penaltyKind: penalty.penaltyKind,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/40 px-5" onPress={onClose}>
        <Pressable
          className="w-full max-w-md max-h-[88%] rounded-2xl bg-white p-4"
          onPress={(event) => event.stopPropagation?.()}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
          <Text className="text-base font-bold text-slate-900">
            {t(
              isFarmReview
                ? 'adminReview.farmReviews.rejectTitle'
                : isListing
                  ? 'adminReview.rejectListingTitle'
                  : 'adminReview.rejectTitle',
            )}
          </Text>
          <Text className="mt-1 text-xs leading-5 text-slate-500">
            {t(
              isFarmReview
                ? 'adminReview.farmReviews.rejectHint'
                : isListing
                  ? 'adminReview.rejectListingHint'
                  : 'adminReview.rejectHint',
            )}
          </Text>

          <Text className="mt-4 text-xs font-semibold uppercase text-slate-500">
            {t('adminReview.rejectReason')}
          </Text>
          <TextInput
            className="mt-1.5 min-h-[88px] rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-sm text-slate-900"
            multiline
            textAlignVertical="top"
            placeholder={t(
              isFarmReview
                ? 'adminReview.farmReviews.rejectReasonPlaceholder'
                : isListing
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

          {!isFarmReview ? (
            <>
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
            </>
          ) : null}

          {showScoreFields ? (
            <>
              <Text className="mt-3 text-xs font-semibold uppercase text-slate-500">
                {t('adminReview.rejectPenaltyPoints')}
              </Text>
              <TextInput
                className="mt-1.5 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-sm text-slate-900"
                placeholder={t('adminReview.rejectPenaltyPointsPlaceholder')}
                keyboardType="number-pad"
                value={penaltyPoints}
                onChangeText={(value) => {
                  setPenaltyPoints(value.replace(/[^\d]/g, ''));
                  if (error) setError('');
                }}
                editable={!submitting}
              />

              <Text className="mt-3 text-xs font-semibold uppercase text-slate-500">
                {t('adminReview.rejectPenaltyKind')}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={submitting}
                onPress={() => setKindOpen((open) => !open)}
                className="mt-1.5 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3"
              >
                <Text className={`text-sm ${penaltyKind ? 'text-slate-900' : 'text-slate-400'}`}>
                  {penaltyKind
                    ? t(`adminReview.rejectPenaltyKindOptions.${penaltyKind}`)
                    : t('adminReview.rejectPenaltyKindPlaceholder')}
                </Text>
              </Pressable>
              {kindOpen ? (
                <View className="mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {SCORE_KINDS.map((kind) => (
                    <Pressable
                      key={kind}
                      onPress={() => {
                        setPenaltyKind(kind);
                        setKindOpen(false);
                        if (error) setError('');
                      }}
                      className="border-b border-gray-100 px-3 py-3 last:border-b-0"
                    >
                      <Text className={`text-sm ${penaltyKind === kind ? 'font-bold text-amber-700' : 'text-slate-900'}`}>
                        {t(`adminReview.rejectPenaltyKindOptions.${kind}`)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

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
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
