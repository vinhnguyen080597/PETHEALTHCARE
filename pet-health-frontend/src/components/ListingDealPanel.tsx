import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PetFeedPost } from '../types';
import {
  buildCancelDepositReasonText,
  canBreederCancelDeposit,
  canBreederConfirmDeposit,
  canBreederRequestHandoff,
  canSenAbandonHandoff,
  canSenConfirmCancel,
  canSenConfirmHandoff,
  canSenRespondToHandoffRequest,
  canSenWithdrawDepositRequest,
  canShowDepositRequest,
  CANCEL_DEPOSIT_MAX_PHOTOS,
  CANCEL_DEPOSIT_REASON_KEYS,
  COMPLETE_HANDOFF_MAX_PHOTOS,
  DEAL_DISPUTE_MAX_PHOTOS,
  daysLeftUntilDeadline,
  isDealDisputeOpen,
  readDealFromPostMetadata,
  shouldShowCompleteWaitingBadge,
  validateCancelDepositRequest,
  validateDisputeRequest,
  validateHandoffPhotos,
  COMPLETE_HANDOFF_DEADLINE_DAYS,
  type CancelDepositReasonKey,
  type ListingDealMutation,
} from '../utils/listingDealHandoff';

export type { ListingDealMutation };

type ListingDealPanelProps = {
  post: PetFeedPost;
  currentUserId?: string | null;
  onMutate: (
    mutation: ListingDealMutation,
  ) => Promise<{ post: PetFeedPost; reviewEligible?: boolean } | null>;
  onSubmitReview?: (payload: { rating: number; body?: string }) => Promise<void>;
};

async function pickImages(max: number): Promise<string[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission required', 'Photo library access is needed.');
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: max,
    quality: 0.85,
  });
  if (result.canceled) return [];
  return (result.assets || [])
    .map((asset) => asset.uri)
    .filter(Boolean)
    .slice(0, max);
}

export function ListingDealPanel({
  post,
  currentUserId,
  onMutate,
  onSubmitReview,
}: ListingDealPanelProps) {
  const { t } = useTranslation();
  const deal = useMemo(() => readDealFromPostMetadata(post.metadata), [post.metadata]);
  const isOwner = Boolean(currentUserId && currentUserId === post.user_id);
  const isDealSen = Boolean(currentUserId && deal.senUserId && currentUserId === deal.senUserId);
  const phaseInput = {
    listingStatus: post.status,
    dealStatus: deal.status,
  };
  const showDeposit = canShowDepositRequest({
    isOwner,
    listingStatus: post.status,
    dealStatus: deal.status,
  });
  const showBreederConfirm = canBreederConfirmDeposit({ isOwner, ...phaseInput });
  const showSenWithdraw = canSenWithdrawDepositRequest({ isDealSen, ...phaseInput });
  const showPending = phaseInput.dealStatus === 'pending_sen';
  const showHandoff = canBreederRequestHandoff({ isOwner, ...phaseInput });
  const showCancel = canBreederCancelDeposit({ isOwner, ...phaseInput });
  const showSenHandoff = canSenConfirmHandoff({ isDealSen, ...phaseInput });
  const showSenAbandon = canSenAbandonHandoff({ isDealSen, ...phaseInput });
  const showSenHandoffMenu = showSenHandoff || showSenAbandon;
  const showSenHandoffFromNotify = canSenRespondToHandoffRequest({
    isDealSen,
    ...phaseInput,
  });
  const showSenCancel = canSenConfirmCancel({ isDealSen, ...phaseInput });
  const showDisputeOpen = isDealDisputeOpen(phaseInput);
  const daysLeft = daysLeftUntilDeadline(deal.completeDeadlineAt);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAck, setDepositAck] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completePhotos, setCompletePhotos] = useState<string[]>([]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReasonKey, setCancelReasonKey] =
    useState<CancelDepositReasonKey>('no_contact');
  const [cancelNote, setCancelNote] = useState('');
  const [cancelPhotos, setCancelPhotos] = useState<string[]>([]);
  const [dealMenuOpen, setDealMenuOpen] = useState(false);
  const [senAbandonOpen, setSenAbandonOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeMessage, setDisputeMessage] = useState('');
  const [disputePhotos, setDisputePhotos] = useState<string[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');

  const visible =
    showDeposit ||
    showBreederConfirm ||
    showSenWithdraw ||
    showPending ||
    showHandoff ||
    showCancel ||
    showSenHandoffMenu ||
    showSenHandoffFromNotify ||
    showSenCancel ||
    showDisputeOpen ||
    post.status === 'deposit_hold' ||
    post.status === 'sold' ||
    post.status === 'cancelled';

  if (!visible) return null;

  async function run(mutation: ListingDealMutation) {
    setBusy(true);
    setError('');
    try {
      const result = await onMutate(mutation);
      if (!result?.post) throw new Error(t('common.somethingWentWrong'));
      setDepositOpen(false);
      setDepositAck(false);
      setCompleteOpen(false);
      setCancelOpen(false);
      setDealMenuOpen(false);
      setSenAbandonOpen(false);
      setDisputeOpen(false);
      setCompletePhotos([]);
      setCancelPhotos([]);
      setDisputePhotos([]);
      setCancelNote('');
      setDisputeMessage('');
      if (mutation.type === 'complete_confirm' && result.reviewEligible && onSubmitReview) {
        setReviewOpen(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1">
          {post.status === 'deposit_hold' ? (
            <Text className="text-sm font-semibold text-amber-900">
              {deal.senDisplayName
                ? t('deal.holdBadgeWithSen', { name: deal.senDisplayName })
                : t('deal.holdBadge')}
            </Text>
          ) : null}
          {showPending ? (
            <Text className="text-sm font-semibold text-amber-900">
              {isOwner || isDealSen
                ? deal.senDisplayName
                  ? t('deal.pendingBadgeWithSen', { name: deal.senDisplayName })
                  : t('deal.pendingBadge')
                : t('deal.pendingBadge')}
            </Text>
          ) : null}
          {showPending && isOwner ? (
            <Text className="mt-1 text-xs text-amber-800">{t('deal.pendingHintBreeder')}</Text>
          ) : null}
          {showPending && isDealSen ? (
            <Text className="mt-1 text-xs text-amber-800">{t('deal.pendingHintSen')}</Text>
          ) : null}
          {shouldShowCompleteWaitingBadge({
            isDealSen,
            listingStatus: post.status,
            dealStatus: deal.status,
          }) ? (
            <Text className="mt-1 text-xs text-amber-800">
              {t('deal.completeWaitingBadge', {
                days: Math.max(0, daysLeft ?? COMPLETE_HANDOFF_DEADLINE_DAYS),
              })}
            </Text>
          ) : null}
          {phaseInput.dealStatus === 'pending_cancel_confirm' ? (
            <Text className="mt-1 text-xs text-amber-800">{t('deal.cancelPendingBadge')}</Text>
          ) : null}
          {showDisputeOpen ? (
            <Text className="mt-1 text-xs text-amber-800">{t('deal.disputeOpenBadge')}</Text>
          ) : null}
          {post.status === 'sold' ? (
            <Text className="text-sm font-semibold text-emerald-800">{t('deal.completed')}</Text>
          ) : null}
          {post.status === 'cancelled' ? (
            <Text className="text-sm font-semibold text-rose-800">{t('deal.cancelledClosed')}</Text>
          ) : null}
        </View>
        {showSenHandoffMenu ? (
          <View className="relative shrink-0">
            <Pressable
              accessibilityLabel={t('deal.actionsMenu')}
              disabled={busy}
              onPress={() => setDealMenuOpen((open) => !open)}
              className="h-8 w-8 items-center justify-center rounded-full border border-amber-200 bg-white"
            >
              <Text className="text-base font-bold text-amber-900">⋮</Text>
            </Pressable>
            {dealMenuOpen ? (
              <View className="absolute right-0 top-9 z-10 w-56 overflow-hidden rounded-xl border border-amber-200 bg-white shadow-lg">
                {showSenHandoff ? (
                  <Pressable
                    disabled={busy}
                    onPress={() => {
                      setDealMenuOpen(false);
                      void run({ type: 'complete_confirm' });
                    }}
                    className="px-3 py-2.5"
                  >
                    <Text className="text-sm font-medium text-slate-800">
                      {t('deal.senConfirmReceipt')}
                    </Text>
                  </Pressable>
                ) : null}
                {showSenAbandon ? (
                  <Pressable
                    disabled={busy}
                    onPress={() => {
                      setDealMenuOpen(false);
                      setSenAbandonOpen(true);
                    }}
                    className="border-t border-amber-100 px-3 py-2.5"
                  >
                    <Text className="text-sm font-medium text-red-600">
                      {t('deal.senAbandonDeposit')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {error ? <Text className="mt-2 text-xs text-red-600">{error}</Text> : null}

      {showSenHandoffFromNotify ? (
        <View className="mt-3 gap-2">
          <Text className="text-xs text-amber-800">
            {t('deal.completeWaitingBadge', {
              days: Math.max(0, daysLeft ?? COMPLETE_HANDOFF_DEADLINE_DAYS),
            })}
          </Text>
          <Pressable
            disabled={busy}
            onPress={() => void run({ type: 'complete_confirm' })}
            className="rounded-full bg-amber-600 px-4 py-2.5"
          >
            <Text className="text-center text-sm font-semibold text-white">
              {t('deal.senConfirmReceipt')}
            </Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={() => setSenAbandonOpen(true)}
            className="rounded-full border border-red-200 bg-white px-4 py-2.5"
          >
            <Text className="text-center text-sm font-semibold text-red-600">
              {t('deal.senOpenDispute')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {showDeposit ||
      showBreederConfirm ||
      showSenWithdraw ||
      showHandoff ||
      showCancel ||
      showSenCancel ? (
      <View className="mt-3 gap-2">
        {showDeposit ? (
          <Pressable
            disabled={busy}
            onPress={() => {
              setDepositAck(false);
              setDepositOpen(true);
            }}
            className="rounded-full bg-amber-600 px-4 py-2.5 active:bg-amber-700"
          >
            <Text className="text-center text-sm font-semibold text-white">
              {t('deal.requestDeposit')}
            </Text>
          </Pressable>
        ) : null}
        {showBreederConfirm ? (
          <Pressable
            disabled={busy}
            onPress={() => {
              setDepositAck(false);
              setDepositOpen(true);
            }}
            className="rounded-full bg-amber-600 px-4 py-2.5 active:bg-amber-700"
          >
            <Text className="text-center text-sm font-semibold text-white">
              {t('deal.breederConfirmDeposit')}
            </Text>
          </Pressable>
        ) : null}
        {showBreederConfirm || showSenWithdraw ? (
          <Pressable
            disabled={busy}
            onPress={() => void run({ type: 'deposit_decline' })}
            className="rounded-full border border-red-200 bg-white px-4 py-2.5"
          >
            <Text className="text-center text-sm font-semibold text-red-600">
              {showSenWithdraw && !showBreederConfirm
                ? t('deal.withdrawRequest')
                : t('deal.declineRequest')}
            </Text>
          </Pressable>
        ) : null}
        {showHandoff ? (
          <Pressable
            disabled={busy}
            onPress={() => {
              setCompletePhotos([]);
              setCompleteOpen(true);
            }}
            className="rounded-full bg-amber-600 px-4 py-2.5 active:bg-amber-700"
          >
            <Text className="text-center text-sm font-semibold text-white">
              {t('deal.complete')}
            </Text>
          </Pressable>
        ) : null}
        {showCancel ? (
          <Pressable
            disabled={busy}
            onPress={() => {
              setCancelReasonKey('no_contact');
              setCancelNote('');
              setCancelPhotos([]);
              setCancelOpen(true);
            }}
            className="rounded-full border border-red-200 bg-white px-4 py-2.5"
          >
            <Text className="text-center text-sm font-semibold text-red-600">
              {t('deal.cancel')}
            </Text>
          </Pressable>
        ) : null}
        {showSenCancel ? (
          <Pressable
            disabled={busy}
            onPress={() => void run({ type: 'cancel_confirm' })}
            className="rounded-full border border-red-200 bg-white px-4 py-2.5"
          >
            <Text className="text-center text-sm font-semibold text-red-600">
              {t('deal.senConfirmCancel')}
            </Text>
          </Pressable>
        ) : null}
      </View>
      ) : null}

      {busy ? (
        <View className="mt-3 items-center">
          <ActivityIndicator color="#D97706" />
        </View>
      ) : null}

      <Modal visible={depositOpen} transparent animationType="fade">
        <View className="flex-1 justify-center bg-black/40 px-5">
          <View className="rounded-2xl bg-white p-5">
            <Text className="mb-2 text-base font-bold text-slate-900">
              {t(isOwner ? 'deal.confirmTitle' : 'deal.requestTitle')}
            </Text>
            <Pressable
              onPress={() => setDepositAck((value) => !value)}
              className="mb-3 flex-row items-start gap-2"
            >
              <View
                className={`mt-0.5 h-4 w-4 rounded border ${
                  depositAck ? 'border-amber-600 bg-amber-600' : 'border-slate-300'
                }`}
              />
              <Text className="flex-1 text-sm text-slate-700">
                {t(isOwner ? 'deal.ackLabel' : 'deal.ackLabelRequest')}
              </Text>
            </Pressable>
            <View className="flex-row justify-end gap-2">
              <Pressable onPress={() => setDepositOpen(false)} className="px-4 py-2">
                <Text className="text-sm text-slate-600">{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                disabled={busy || !depositAck}
                onPress={() => void run({ type: 'deposit_confirm' })}
                className="rounded-full bg-amber-600 px-4 py-2"
              >
                <Text className="text-sm font-semibold text-white">
                  {t(isOwner ? 'deal.confirmFreeze' : 'deal.sendRequest')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={completeOpen} transparent animationType="fade">
        <View className="flex-1 justify-center bg-black/40 px-5">
          <View className="rounded-2xl bg-white p-5">
            <Text className="mb-2 text-base font-bold text-slate-900">
              {t('deal.completeRequestTitle')}
            </Text>
            <Text className="mb-3 text-sm text-slate-600">
              {t('deal.completeRequestHint')}
            </Text>
            <Pressable
              onPress={() => {
                void pickImages(COMPLETE_HANDOFF_MAX_PHOTOS).then(setCompletePhotos);
              }}
              className="mb-2 rounded-xl border border-dashed border-slate-300 px-3 py-3"
            >
              <Text className="text-center text-sm text-slate-700">
                {t('deal.completePhotosLabel')} ({completePhotos.length}/
                {COMPLETE_HANDOFF_MAX_PHOTOS})
              </Text>
            </Pressable>
            <View className="flex-row justify-end gap-2">
              <Pressable onPress={() => setCompleteOpen(false)} className="px-4 py-2">
                <Text className="text-sm text-slate-600">{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                disabled={busy || completePhotos.length < 1}
                onPress={() => {
                  const code = validateHandoffPhotos(completePhotos.length);
                  if (code === 'photos_required') {
                    setError(t('deal.completePhotosRequired'));
                    return;
                  }
                  void run({ type: 'complete_request', photoUris: completePhotos });
                }}
                className="rounded-full bg-amber-600 px-4 py-2"
              >
                <Text className="text-sm font-semibold text-white">
                  {t('deal.completeConfirm')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={cancelOpen} transparent animationType="fade">
        <View className="flex-1 justify-center bg-black/40 px-5">
          <View className="max-h-[85%] rounded-2xl bg-white p-5">
            <ScrollView>
              <Text className="mb-2 text-base font-bold text-slate-900">
                {t('deal.cancelRequestTitle')}
              </Text>
              <Text className="mb-3 text-sm text-slate-600">
                {t('deal.cancelRequestHint')}
              </Text>
              {CANCEL_DEPOSIT_REASON_KEYS.map((key) => (
                <Pressable
                  key={key}
                  onPress={() => setCancelReasonKey(key)}
                  className="mb-1 flex-row items-center gap-2 py-1.5"
                >
                  <View
                    className={`h-4 w-4 rounded-full border ${
                      cancelReasonKey === key
                        ? 'border-amber-600 bg-amber-600'
                        : 'border-slate-300'
                    }`}
                  />
                  <Text className="text-sm text-slate-800">
                    {t(`deal.cancelReason.${key}`)}
                  </Text>
                </Pressable>
              ))}
              <TextInput
                value={cancelNote}
                onChangeText={setCancelNote}
                placeholder={t('deal.cancelNotePlaceholder')}
                multiline
                className="mt-2 mb-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <Pressable
                onPress={() => {
                  void pickImages(CANCEL_DEPOSIT_MAX_PHOTOS).then(setCancelPhotos);
                }}
                className="mb-3 rounded-xl border border-dashed border-slate-300 px-3 py-3"
              >
                <Text className="text-center text-sm text-slate-700">
                  {t('deal.cancelPhotosLabel')} ({cancelPhotos.length}/
                  {CANCEL_DEPOSIT_MAX_PHOTOS})
                </Text>
              </Pressable>
              <View className="flex-row justify-end gap-2">
                <Pressable onPress={() => setCancelOpen(false)} className="px-4 py-2">
                  <Text className="text-sm text-slate-600">{t('common.cancel')}</Text>
                </Pressable>
                <Pressable
                  disabled={busy}
                  onPress={() => {
                    const code = validateCancelDepositRequest({
                      reasonKey: cancelReasonKey,
                      note: cancelNote,
                      photoCount: cancelPhotos.length,
                    });
                    if (code === 'reason_required') {
                      setError(t('deal.cancelReasonRequired'));
                      return;
                    }
                    const reason = buildCancelDepositReasonText({
                      reasonKey: cancelReasonKey,
                      reasonLabel: t(`deal.cancelReason.${cancelReasonKey}`),
                      note: cancelNote,
                    });
                    void run({
                      type: 'cancel_request',
                      reason,
                      photoUris: cancelPhotos,
                    });
                  }}
                  className="rounded-full bg-red-600 px-4 py-2"
                >
                  <Text className="text-sm font-semibold text-white">
                    {t('deal.cancelSubmit')}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={senAbandonOpen} transparent animationType="fade">
        <View className="flex-1 justify-center bg-black/40 px-5">
          <View className="rounded-2xl bg-white p-5">
            <Text className="mb-2 text-base font-bold text-slate-900">
              {t('deal.senAbandonTitle')}
            </Text>
            <Text className="mb-3 text-sm text-slate-600">{t('deal.senAbandonHint')}</Text>
            <View className="flex-row justify-end gap-2">
              <Pressable
                disabled={busy}
                onPress={() => setSenAbandonOpen(false)}
                className="px-4 py-2"
              >
                <Text className="text-sm text-slate-600">{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={() => void run({ type: 'handoff_abandon' })}
                className="rounded-full bg-red-600 px-4 py-2"
              >
                <Text className="text-sm font-semibold text-white">
                  {t('deal.senAbandonDeposit')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={disputeOpen} transparent animationType="fade">
        <View className="flex-1 justify-center bg-black/40 px-5">
          <View className="rounded-2xl bg-white p-5">
            <Text className="mb-2 text-base font-bold text-slate-900">
              {t('deal.disputeTitle')}
            </Text>
            <Text className="mb-3 text-sm text-slate-600">{t('deal.disputeHint')}</Text>
            <TextInput
              value={disputeMessage}
              onChangeText={setDisputeMessage}
              placeholder={t('deal.disputeMessageLabel')}
              multiline
              className="mb-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <Pressable
              onPress={() => {
                void pickImages(DEAL_DISPUTE_MAX_PHOTOS).then(setDisputePhotos);
              }}
              className="mb-3 rounded-xl border border-dashed border-slate-300 px-3 py-3"
            >
              <Text className="text-center text-sm text-slate-700">
                {t('deal.disputePhotosLabel')} ({disputePhotos.length}/
                {DEAL_DISPUTE_MAX_PHOTOS})
              </Text>
            </Pressable>
            <View className="flex-row justify-end gap-2">
              <Pressable onPress={() => setDisputeOpen(false)} className="px-4 py-2">
                <Text className="text-sm text-slate-600">{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={() => {
                  const code = validateDisputeRequest({
                    message: disputeMessage,
                    photoCount: disputePhotos.length,
                  });
                  if (code === 'message_required') {
                    setError(t('deal.disputeMessageRequired'));
                    return;
                  }
                  if (code === 'photos_required') {
                    setError(t('deal.disputePhotosRequired'));
                    return;
                  }
                  void run({
                    type: 'complete_dispute',
                    message: disputeMessage.trim(),
                    photoUris: disputePhotos,
                  });
                }}
                className="rounded-full bg-red-600 px-4 py-2"
              >
                <Text className="text-sm font-semibold text-white">
                  {t('deal.disputeSubmit')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={reviewOpen} transparent animationType="fade" onRequestClose={() => setReviewOpen(false)}>
        <View className="flex-1 items-center justify-center bg-black/45 px-4">
          <View className="w-full max-w-md rounded-2xl bg-white p-5">
            <Text className="text-base font-bold text-[#2B1E19]">{t('deal.reviewTitle')}</Text>
            <Text className="mt-1 text-sm text-[#6E5A51]">{t('deal.reviewHint')}</Text>
            <View className="mt-4 flex-row gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setReviewRating(star)}>
                  <Text className={`text-2xl ${star <= reviewRating ? 'text-amber-500' : 'text-slate-300'}`}>
                    ★
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={reviewBody}
              onChangeText={setReviewBody}
              placeholder={t('deal.reviewPlaceholder')}
              multiline
              className="mt-4 min-h-[88px] rounded-xl border border-[#F0E6D8] px-3 py-2 text-sm text-[#2B1E19]"
            />
            <View className="mt-4 gap-2">
              <Pressable
                disabled={busy || !onSubmitReview}
                onPress={() => {
                  if (!onSubmitReview) return;
                  void onSubmitReview({
                    rating: reviewRating,
                    ...(reviewBody.trim() ? { body: reviewBody.trim() } : {}),
                  }).then(() => {
                    setReviewOpen(false);
                    setReviewBody('');
                    setReviewRating(5);
                  }).catch((err) => {
                    setError(err instanceof Error ? err.message : t('common.somethingWentWrong'));
                  });
                }}
                className="rounded-full bg-amber-600 px-4 py-3"
              >
                <Text className="text-center text-sm font-semibold text-white">{t('deal.reviewSubmit')}</Text>
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={() => setReviewOpen(false)}
                className="rounded-full border border-[#E8DFD0] px-4 py-3"
              >
                <Text className="text-center text-sm font-semibold text-[#5C4A3A]">{t('deal.reviewSkip')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
