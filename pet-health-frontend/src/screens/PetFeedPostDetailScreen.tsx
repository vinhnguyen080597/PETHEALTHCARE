import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PetFeedCommentComposer, PetFeedCommentsSection } from '../components/PetFeedCommentsSection';
import { ListingDealPanel, type ListingDealMutation } from '../components/ListingDealPanel';
import { MarketplaceDisclaimerAlert } from '../components/MarketplaceLegalNotice';
import { PetFeedPostDetailBody } from '../components/PetFeedPostDetailBody';
import { useIosKeyboardOverlap } from '../hooks/useIosKeyboardOverlap';
import { usePetFeedPostComments } from '../hooks/usePetFeedPostComments';
import { usePetFeedPostDetail } from '../hooks/usePetFeedPostDetail';
import { BRAND } from '../theme/brand';
import type { PetFeedComment, PetFeedPost } from '../types';
import {
  canShowDepositRequest,
  readDealFromPostMetadata,
} from '../utils/listingDealHandoff';
import { sharePetFeedPost } from '../utils/sharePetFeedPost';
import { modalBottomInset } from '../utils/modalSafeArea';
import { type PetFeedReportReason } from '../constants/petFeedReportReasons';
import { ReportModal } from '../components/ReportModal';

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
  onDeletePost?: (post: PetFeedPost) => Promise<boolean> | boolean;
  onFetchPostDetail?: (postId: string) => Promise<PetFeedPost | null>;
  onFetchPostComments?: (postId: string) => Promise<PetFeedComment[]>;
  onSubmitPostComment?: (postId: string, body: string, parentId?: string | null) => Promise<PetFeedComment | null>;
  onDeletePostComment?: (comment: PetFeedComment, removedCount?: number) => Promise<boolean>;
  onMutateListingDeal?: (
    postId: string,
    mutation: ListingDealMutation,
  ) => Promise<{ post: PetFeedPost; reviewEligible?: boolean } | null>;
  onSubmitListingDealReview?: (
    postId: string,
    payload: { rating: number; body?: string },
  ) => Promise<void>;
  currentUserId?: string | null;
  allowMediaDownload?: boolean;
};

function Bone({ className }: { className: string }) {
  return <View className={`bg-slate-200 ${className}`} />;
}

function PetFeedPostDetailSkeleton() {
  return (
    <View className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
      <Bone className="h-72 w-full" />
      <View className="gap-3 p-4">
        <Bone className="h-6 w-3/5 rounded-full" />
        <Bone className="h-8 w-2/5 rounded-full" />
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
  onDeletePost,
  onFetchPostDetail,
  onFetchPostComments,
  onSubmitPostComment,
  onDeletePostComment,
  onMutateListingDeal,
  onSubmitListingDealReview,
  currentUserId,
}: PetFeedPostDetailScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomInset = modalBottomInset(insets.bottom);
  const keyboardOverlap = useIosKeyboardOverlap();
  const composerPad = keyboardOverlap > 0 ? 8 : bottomInset;
  const scrollRef = useRef<ScrollView>(null);
  const commentsSectionYRef = useRef(0);
  const scrolledFocusIdRef = useRef<string | null>(null);
  const [depositModalTrigger, setDepositModalTrigger] = useState(0);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState<PetFeedReportReason>('scam');
  const [reportNote, setReportNote] = useState('');

  const { selectedPost, detailLoading, replaceDetailPost } = usePetFeedPostDetail(
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
  const deal = useMemo(
    () => (selectedPost ? readDealFromPostMetadata(selectedPost.metadata) : { status: undefined }),
    [selectedPost],
  );
  const showDepositCta = Boolean(
    selectedPost
    && selectedPost.post_kind !== 'announcement'
    && onMutateListingDeal
    && canShowDepositRequest({
      isOwner: Boolean(isOwnPost),
      listingStatus: selectedPost.status,
      dealStatus: deal.status,
    }),
  );
  const showMessageCta = Boolean(selectedPost && !isOwnPost && onMessageBreeder);
  const showStickyActions = showDepositCta || showMessageCta;

  function confirmDeletePost(post: PetFeedPost) {
    if (!onDeletePost) return;
    const runDelete = async () => {
      const ok = await onDeletePost(post);
      if (ok) onBack();
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined'
        ? window.confirm(`${t('petFeed.deleteListingTitle')}\n\n${t('petFeed.deleteListingBody')}`)
        : false;
      if (confirmed) void runDelete();
      return;
    }

    Alert.alert(t('petFeed.deleteListingTitle'), t('petFeed.deleteListingBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('petFeed.deleteListing'), style: 'destructive', onPress: () => void runDelete() },
    ]);
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
          ) : selectedPost && isOwnPost && onDeletePost ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('petFeed.accessibility.deleteListing', { title: selectedPost.title })}
              className="h-10 w-10 items-center justify-center rounded-full active:bg-red-50"
              onPress={() => confirmDeletePost(selectedPost)}
            >
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
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
          paddingBottom: showStickyActions ? 24 : 16,
        }}
      >
        <MarketplaceDisclaimerAlert compact className="mb-3" />
        {selectedPost ? (
          <>
            <PetFeedPostDetailBody
              post={selectedPost}
              mediaLoading={detailLoading}
              onToggleFavorite={onToggleFavorite}
              showFavorite
            />
            {isOwnPost && onEditPost ? (
              <Pressable
                className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 active:bg-slate-50"
                onPress={() => onEditPost(selectedPost)}
              >
                <Ionicons name="create-outline" size={17} color={BRAND.textSecondary} />
                <Text className="text-sm font-semibold text-slate-700">{t('petFeed.editListing')}</Text>
              </Pressable>
            ) : null}
            {onMutateListingDeal && selectedPost.post_kind !== 'announcement' ? (
              <View className="mt-3">
                <ListingDealPanel
                  post={selectedPost}
                  currentUserId={currentUserId}
                  hideDepositRequestButton
                  depositModalTrigger={depositModalTrigger}
                  onMutate={async (mutation) => {
                    const result = await onMutateListingDeal(selectedPost.id, mutation);
                    if (result?.post) replaceDetailPost(result.post);
                    return result;
                  }}
                  onSubmitReview={onSubmitListingDealReview
                    ? (payload) => onSubmitListingDealReview(selectedPost.id, payload)
                    : undefined}
                />
              </View>
            ) : null}
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

      {showStickyActions && selectedPost ? (
        <View
          className="border-t bg-white px-4 pt-3"
          style={{
            borderTopColor: BRAND.borderLight,
            paddingBottom: Math.max(composerPad, 10),
            gap: 10,
          }}
        >
          <View className="flex-row gap-2.5">
            {showMessageCta ? (
              <Pressable
                testID={`pet-feed-message-button-${selectedPost.id}`}
                accessibilityRole="button"
                accessibilityLabel={t('petFeed.accessibility.messageBreeder', { title: selectedPost.title })}
                className="min-w-0 flex-1 flex-row items-center justify-center gap-1.5 rounded-full border py-3.5"
                style={{
                  backgroundColor: BRAND.btnSecondary,
                  borderColor: BRAND.borderBrand,
                }}
                onPress={() => onMessageBreeder?.(selectedPost)}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={17} color={BRAND.textBrandLink} />
                <Text className="text-sm font-semibold" style={{ color: BRAND.textBrandLink }}>
                  {t('petFeed.messages.messageCta')}
                </Text>
              </Pressable>
            ) : null}
            {showDepositCta ? (
              <Pressable
                testID={`pet-feed-deposit-button-${selectedPost.id}`}
                accessibilityRole="button"
                accessibilityLabel={t('deal.requestDeposit')}
                className="min-w-0 flex-1 flex-row items-center justify-center gap-1.5 rounded-full py-3.5"
                style={{ backgroundColor: BRAND.btnPrimary }}
                onPress={() => setDepositModalTrigger((n) => n + 1)}
              >
                <Ionicons name="heart" size={16} color={BRAND.textInverse} />
                <Text className="text-sm font-semibold text-white">{t('deal.requestDeposit')}</Text>
              </Pressable>
            ) : null}
          </View>
          <PetFeedCommentComposer
            submitting={commentSubmitting}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onSubmit={addComment}
          />
        </View>
      ) : selectedPost ? (
        <View className="border-t border-gray-200 bg-white" style={{ paddingBottom: composerPad }}>
          <PetFeedCommentComposer
            submitting={commentSubmitting}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onSubmit={addComment}
          />
        </View>
      ) : detailLoading ? (
        <View className="border-t border-gray-200 bg-white px-4 py-3" style={{ paddingBottom: composerPad }}>
          <Bone className="h-11 w-full rounded-xl" />
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
    </View>
  );
}
