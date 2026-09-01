import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMySaleReview } from '../api';
import { PetFeedCommentsSection } from '../components/PetFeedCommentsSection';
import { PetFeedDetailSiblingListingsBar } from '../components/PetFeedDetailSiblingListingsBar';
import { PetFeedPostDetailBody } from '../components/PetFeedPostDetailBody';
import { FarmReviewModal } from '../components/FarmReviewModal';
import { ReportModal } from '../components/ReportModal';
import { useIosKeyboardOverlap } from '../hooks/useIosKeyboardOverlap';
import { usePetFeedPostComments } from '../hooks/usePetFeedPostComments';
import { usePetFeedPostDetail } from '../hooks/usePetFeedPostDetail';
import { BRAND } from '../theme/brand';
import type { PetFeedComment, PetFeedPost } from '../types';
import { sharePetFeedPost } from '../utils/sharePetFeedPost';
import { petFeedDetailShowsEditButton, petFeedDetailShowsMessageButton } from '../utils/petFeedDetailHeader';
import { similarForSaleListings } from '../utils/petFeedDetailSiblingListings';
import { modalBottomInset } from '../utils/modalSafeArea';
import { type PetFeedReportReason } from '../constants/petFeedReportReasons';
import { canShowListingStatusUpdate } from '../utils/listingAvailabilityBadge';

type PetFeedPostDetailScreenProps = {
  postId: string;
  listPosts: PetFeedPost[];
  focusCommentId?: string | null;
  onFocusCommentHandled?: () => void;
  onBack: () => void;
  onToggleFavorite: (post: PetFeedPost) => void;
  onReportPost: (post: PetFeedPost, reason: string, note?: string) => void;
  onMessageBreeder?: (post: PetFeedPost) => void;
  onEditPost?: (post: PetFeedPost) => void;
  onFetchPostDetail?: (postId: string) => Promise<PetFeedPost | null>;
  onFetchPostComments?: (postId: string) => Promise<PetFeedComment[]>;
  onSubmitPostComment?: (postId: string, body: string, parentId?: string | null) => Promise<PetFeedComment | null>;
  onDeletePostComment?: (comment: PetFeedComment, removedCount?: number) => Promise<boolean>;
  onOpenListing?: (postId: string) => void;
  currentUserId?: string | null;
  allowMediaDownload?: boolean;
  token?: string | null;
  openSaleReviewInitially?: boolean;
  onPatchListingStatus?: (
    postId: string,
    body: { status: string; saleChannel?: string; buyerEmail?: string },
  ) => Promise<PetFeedPost | null>;
  onSubmitSaleReview?: (
    postId: string,
    body: { rating: number; body?: string; photoUrls?: string[] },
  ) => Promise<boolean>;
};

function Bone({ className }: { className: string }) {
  return <View className={`bg-slate-200 ${className}`} />;
}

function PetFeedPostDetailSkeleton() {
  return (
    <View className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
      <Bone className="h-72 w-full" />
      <View className="gap-3 p-4">
        <View className="gap-2.5">
          <View className="flex-row items-start justify-between gap-3">
            <Bone className="h-5 flex-1 rounded-full" />
            <Bone className="h-5 w-24 shrink-0 rounded-full" />
          </View>
          <View className="flex-row items-center justify-between gap-3">
            <Bone className="h-9 w-14 rounded-xl" />
            <Bone className="h-9 w-24 rounded-xl" />
          </View>
        </View>
        <View className="flex-row gap-3">
          <Bone className="h-16 flex-1 rounded-xl" />
          <Bone className="h-16 flex-1 rounded-xl" />
        </View>
        <View className="flex-row gap-3">
          <Bone className="h-16 flex-1 rounded-xl" />
          <Bone className="h-16 flex-1 rounded-xl" />
        </View>
        <Bone className="h-14 w-full rounded-xl" />
      </View>
    </View>
  );
}

export function PetFeedPostDetailScreen({
  postId,
  listPosts,
  focusCommentId = null,
  onFocusCommentHandled,
  onBack,
  onToggleFavorite,
  onReportPost,
  onMessageBreeder,
  onEditPost,
  onFetchPostDetail,
  onFetchPostComments,
  onSubmitPostComment,
  onDeletePostComment,
  onOpenListing,
  currentUserId,
  token = null,
  openSaleReviewInitially = false,
  onPatchListingStatus,
  onSubmitSaleReview,
}: PetFeedPostDetailScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomInset = modalBottomInset(insets.bottom);
  const keyboardOverlap = useIosKeyboardOverlap();
  const bottomBarPad = Math.max(bottomInset, 10);
  const scrollRef = useRef<ScrollView>(null);
  const commentsSectionYRef = useRef(0);
  const scrolledFocusIdRef = useRef<string | null>(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState<PetFeedReportReason>('scam');
  const [reportNote, setReportNote] = useState('');
  const [buyerEmailModalOpen, setBuyerEmailModalOpen] = useState(false);
  const [buyerEmailDraft, setBuyerEmailDraft] = useState('');
  const [listingStatusModalOpen, setListingStatusModalOpen] = useState(false);
  const [saleChannelModalOpen, setSaleChannelModalOpen] = useState(false);
  const [saleReviewModalOpen, setSaleReviewModalOpen] = useState(false);
  const [saleReviewBusy, setSaleReviewBusy] = useState(false);
  const [saleReviewError, setSaleReviewError] = useState('');
  const saleReviewPromptedRef = useRef(false);

  const { selectedPost, detailLoading } = usePetFeedPostDetail(
    postId,
    listPosts,
    onFetchPostDetail,
  );
  const {
    threads,
    loading: commentsLoading,
    submitting: commentSubmitting,
    replyTo,
    setReplyTo,
    addComment,
    removeComment,
  } = usePetFeedPostComments(
    postId,
    onFetchPostComments,
    onSubmitPostComment,
    onDeletePostComment,
  );

  useEffect(() => {
    scrolledFocusIdRef.current = null;
  }, [focusCommentId, postId]);

  const handleFocusCommentOffset = useCallback((offsetInSection: number) => {
    if (!focusCommentId) return;
    if (scrolledFocusIdRef.current === focusCommentId) return;
    scrolledFocusIdRef.current = focusCommentId;
    if (offsetInSection < 0) {
      onFocusCommentHandled?.();
      return;
    }
    const y = Math.max(0, commentsSectionYRef.current + offsetInSection - 12);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y, animated: true });
    });
  }, [focusCommentId, onFocusCommentHandled]);

  const isOwnPost = Boolean(selectedPost && currentUserId && selectedPost.user_id === currentUserId);
  const showMessageCta = petFeedDetailShowsMessageButton(Boolean(isOwnPost), Boolean(onMessageBreeder));
  const showEditCta = petFeedDetailShowsEditButton(Boolean(isOwnPost), Boolean(onEditPost));
  const siblingListings = useMemo(
    () => (selectedPost ? similarForSaleListings(listPosts, selectedPost) : []),
    [listPosts, selectedPost],
  );
  const showSiblingBar = Boolean(
    selectedPost
    && selectedPost.post_kind !== 'announcement'
    && siblingListings.length > 0
    && onOpenListing,
  );
  const showStatusUpdate = Boolean(
    selectedPost
    && onPatchListingStatus
    && canShowListingStatusUpdate({ isOwner: isOwnPost, status: selectedPost.status }),
  );

  function openSaleReviewModal() {
    if (!selectedPost || !onSubmitSaleReview) return;
    setSaleReviewError('');
    setSaleReviewModalOpen(true);
  }

  async function submitSaleReview(payload: { rating: number; body: string; photoUrls: string[] }) {
    if (!selectedPost || !onSubmitSaleReview) return;
    setSaleReviewBusy(true);
    setSaleReviewError('');
    try {
      const ok = await onSubmitSaleReview(selectedPost.id, payload);
      if (ok) setSaleReviewModalOpen(false);
    } catch (error: unknown) {
      setSaleReviewError(error instanceof Error ? error.message : t('farm.review.failed'));
    } finally {
      setSaleReviewBusy(false);
    }
  }

  useEffect(() => {
    if (!openSaleReviewInitially || !selectedPost || !onSubmitSaleReview) return;
    if (saleReviewPromptedRef.current) return;
    saleReviewPromptedRef.current = true;
    void (async () => {
      if (token) {
        try {
          const res = await getMySaleReview(token, selectedPost.id);
          if (res.data?.hasReviewed) {
            Alert.alert(t('common.ok'), t('farm.review.alreadyReviewed'));
            return;
          }
        } catch {
          // Fall through to modal when eligibility check fails.
        }
      }
      openSaleReviewModal();
    })();
  }, [openSaleReviewInitially, onSubmitSaleReview, selectedPost, t, token]);

  function submitSoldOnPlatform(buyerEmail?: string) {
    if (!selectedPost || !onPatchListingStatus) return;
    void onPatchListingStatus(selectedPost.id, {
      status: 'sold',
      saleChannel: 'on_platform',
      buyerEmail: buyerEmail?.trim() || undefined,
    });
    setBuyerEmailModalOpen(false);
    setBuyerEmailDraft('');
  }

  function openListingStatusModal() {
    if (!selectedPost || !onPatchListingStatus) return;
    setListingStatusModalOpen(true);
  }

  function applyListingStatus(status: 'published' | 'deposit_hold') {
    if (!selectedPost || !onPatchListingStatus) return;
    setListingStatusModalOpen(false);
    void onPatchListingStatus(selectedPost.id, { status });
  }

  function openSaleChannelModal() {
    setListingStatusModalOpen(false);
    setSaleChannelModalOpen(true);
  }

  function submitSoldOffPlatform() {
    if (!selectedPost || !onPatchListingStatus) return;
    setSaleChannelModalOpen(false);
    void onPatchListingStatus(selectedPost.id, {
      status: 'sold',
      saleChannel: 'off_platform',
    });
  }

  function openBuyerEmailForSold() {
    setSaleChannelModalOpen(false);
    setBuyerEmailDraft('');
    setBuyerEmailModalOpen(true);
  }

  function submitReport() {
    if (!selectedPost) return;
    onReportPost(selectedPost, reportReason, reportNote);
    setReportVisible(false);
    setReportNote('');
  }

  return (
    <View className="flex-1" style={{ backgroundColor: BRAND.appBackground, paddingBottom: keyboardOverlap }}>
      <View
        className="flex-row items-center border-b bg-white px-2 py-2"
        style={{ borderBottomColor: BRAND.borderLight }}
      >
        <Pressable
          testID="pet-feed-detail-back-button"
          accessibilityRole="button"
          accessibilityLabel={t('petFeed.accessibility.closeDetail')}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100"
          hitSlop={8}
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
        </Pressable>
        <Text className="flex-1 text-center text-base font-semibold text-slate-900">{t('petFeed.detailTitle')}</Text>
        <View className="flex-row items-center">
          {selectedPost ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('petFeed.accessibility.shareListing', { title: selectedPost.title })}
              className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100"
              onPress={() => void sharePetFeedPost(selectedPost)}
            >
              <Ionicons name="share-outline" size={20} color={BRAND.textSecondary} />
            </Pressable>
          ) : null}
          {selectedPost && !isOwnPost ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('petFeed.accessibility.reportListing', { title: selectedPost.title })}
              className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100"
              onPress={() => setReportVisible(true)}
            >
              <Ionicons name="flag-outline" size={20} color={BRAND.textSecondary} />
            </Pressable>
          ) : selectedPost && isOwnPost && showEditCta ? (
            <Pressable
              testID={`pet-feed-detail-edit-button-${selectedPost.id}`}
              accessibilityRole="button"
              accessibilityLabel={t('petFeed.accessibility.editListing', { title: selectedPost.title })}
              className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100"
              onPress={() => onEditPost?.(selectedPost)}
            >
              <Ionicons name="create-outline" size={20} color={BRAND.btnPrimary} />
            </Pressable>
          ) : (
            <View className="w-10" />
          )}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: showSiblingBar ? 24 : 16,
        }}
      >
        {selectedPost ? (
          <>
            <PetFeedPostDetailBody
              post={selectedPost}
              mediaLoading={detailLoading}
              onToggleFavorite={onToggleFavorite}
              onMessageBreeder={onMessageBreeder}
              onEditPost={onEditPost}
              showFavorite
              showMessageButton={showMessageCta}
              showEditButton={false}
              showStatusButton={showStatusUpdate}
              onPressStatusUpdate={openListingStatusModal}
            />
            <View
              collapsable={false}
              className="mt-3"
              onLayout={(event) => {
                commentsSectionYRef.current = event.nativeEvent.layout.y;
              }}
            >
              <PetFeedCommentsSection
                threads={threads}
                loading={commentsLoading}
                currentUserId={currentUserId}
                focusCommentId={focusCommentId}
                onFocusCommentOffset={handleFocusCommentOffset}
                onReply={setReplyTo}
                onDelete={(comment) => void removeComment(comment)}
                commentSubmitting={commentSubmitting}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
                onSubmitComment={onSubmitPostComment ? addComment : undefined}
              />
            </View>
          </>
        ) : detailLoading ? (
          <>
            <PetFeedPostDetailSkeleton />
            <PetFeedCommentsSection threads={[]} loading currentUserId={currentUserId} />
          </>
        ) : (
          <View className="items-center px-6 py-16">
            <Text className="text-center text-sm text-slate-500">{t('petFeed.loadFailedTitle')}</Text>
          </View>
        )}
      </ScrollView>

      {showSiblingBar && selectedPost ? (
        <View
          className="w-full border-t bg-white"
          style={{
            borderTopColor: BRAND.borderLight,
            paddingBottom: bottomBarPad,
          }}
        >
          <PetFeedDetailSiblingListingsBar
            listings={siblingListings}
            onPressListing={onOpenListing!}
            paddingBottom={0}
          />
        </View>
      ) : null}

      <ReportModal
        visible={reportVisible}
        title={t('petFeed.reportListing')}
        body={t('petFeed.reportBody')}
        reason={reportReason}
        note={reportNote}
        reasonLabel={(item) => t(`petFeed.reportReasons.${item}`)}
        notePlaceholder={t('petFeed.reportNotePlaceholder')}
        submitLabel={t('petFeed.submitReport')}
        onChangeReason={setReportReason}
        onChangeNote={setReportNote}
        onCancel={() => setReportVisible(false)}
        onSubmit={submitReport}
      />

      <FarmReviewModal
        visible={saleReviewModalOpen}
        busy={saleReviewBusy}
        error={saleReviewError}
        token={token}
        onClose={() => {
          if (!saleReviewBusy) setSaleReviewModalOpen(false);
        }}
        onSubmit={submitSaleReview}
      />

      <Modal
        visible={listingStatusModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setListingStatusModalOpen(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          className="flex-1 items-center justify-center bg-black/40 px-6"
          onPress={() => setListingStatusModalOpen(false)}
        >
          <Pressable
            accessibilityRole="menu"
            className="w-full max-w-md rounded-2xl bg-white p-5"
            onPress={(event) => event.stopPropagation()}
          >
            <Text className="text-base font-bold text-slate-900">{t('listing.statusModal.title')}</Text>
            <View className="mt-4 gap-2">
              <Pressable
                testID="listing-status-published"
                accessibilityRole="button"
                className="rounded-xl bg-slate-50 py-3.5 active:bg-slate-100"
                onPress={() => applyListingStatus('published')}
              >
                <Text className="text-center text-sm font-semibold text-slate-800">
                  {t('listing.statusChoice.published')}
                </Text>
              </Pressable>
              <Pressable
                testID="listing-status-deposit-hold"
                accessibilityRole="button"
                className="rounded-xl bg-slate-50 py-3.5 active:bg-slate-100"
                onPress={() => applyListingStatus('deposit_hold')}
              >
                <Text className="text-center text-sm font-semibold text-slate-800">
                  {t('listing.statusChoice.deposit_hold')}
                </Text>
              </Pressable>
              <Pressable
                testID="listing-status-sold"
                accessibilityRole="button"
                className="rounded-xl bg-slate-50 py-3.5 active:bg-slate-100"
                onPress={openSaleChannelModal}
              >
                <Text className="text-center text-sm font-semibold text-slate-800">
                  {t('listing.statusChoice.sold')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                className="mt-1 rounded-xl border border-slate-200 py-3 active:bg-slate-50"
                onPress={() => setListingStatusModalOpen(false)}
              >
                <Text className="text-center text-sm font-semibold text-slate-600">{t('common.cancel')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={saleChannelModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSaleChannelModalOpen(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          className="flex-1 items-center justify-center bg-black/40 px-6"
          onPress={() => setSaleChannelModalOpen(false)}
        >
          <Pressable
            accessibilityRole="menu"
            className="w-full max-w-md rounded-2xl bg-white p-5"
            onPress={(event) => event.stopPropagation()}
          >
            <Text className="text-base font-bold text-slate-900">{t('listing.statusModal.saleChannel')}</Text>
            <View className="mt-4 gap-2">
              <Pressable
                testID="listing-sale-on-platform"
                accessibilityRole="button"
                className="rounded-xl bg-slate-50 py-3.5 active:bg-slate-100"
                onPress={openBuyerEmailForSold}
              >
                <Text className="text-center text-sm font-semibold text-slate-800">
                  {t('listing.statusModal.onPlatform')}
                </Text>
              </Pressable>
              <Pressable
                testID="listing-sale-off-platform"
                accessibilityRole="button"
                className="rounded-xl bg-slate-50 py-3.5 active:bg-slate-100"
                onPress={submitSoldOffPlatform}
              >
                <Text className="text-center text-sm font-semibold text-slate-800">
                  {t('listing.statusModal.offPlatform')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                className="mt-1 rounded-xl border border-slate-200 py-3 active:bg-slate-50"
                onPress={() => setSaleChannelModalOpen(false)}
              >
                <Text className="text-center text-sm font-semibold text-slate-600">{t('common.cancel')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={buyerEmailModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBuyerEmailModalOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full max-w-md rounded-2xl bg-white p-5">
            <Text className="text-base font-bold text-slate-900">
              {t('listing.statusModal.saleChannel')}
            </Text>
            <Text className="mt-2 text-sm text-slate-600">
              {t('listing.statusModal.onPlatform')}
            </Text>
            <TextInput
              className="mt-3 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={t('listing.statusModal.buyerEmailOptional')}
              value={buyerEmailDraft}
              onChangeText={setBuyerEmailDraft}
            />
            <View className="mt-4 flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                onPress={() => setBuyerEmailModalOpen(false)}
                className="flex-1 items-center rounded-full border border-slate-200 py-2.5"
              >
                <Text className="text-sm font-medium text-slate-600">{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => submitSoldOnPlatform(buyerEmailDraft)}
                className="flex-1 items-center rounded-full bg-[#D97706] py-2.5"
              >
                <Text className="text-sm font-medium text-white">{t('listing.statusModal.save')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
