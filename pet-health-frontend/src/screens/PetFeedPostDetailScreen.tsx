import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PetFeedCommentComposer, PetFeedCommentsSection } from '../components/PetFeedCommentsSection';
import { PetFeedPostCard } from '../components/PetFeedPostCard';
import { useIosKeyboardOverlap } from '../hooks/useIosKeyboardOverlap';
import { usePetFeedPostComments } from '../hooks/usePetFeedPostComments';
import { usePetFeedPostDetail } from '../hooks/usePetFeedPostDetail';
import type { BreederProfile, PetFeedComment, PetFeedPost } from '../types';
import { modalBottomInset } from '../utils/modalSafeArea';

const PRIMARY = '#1E6FE8';

type PetFeedPostDetailScreenProps = {
  postId: string;
  listPosts: PetFeedPost[];
  onBack: () => void;
  onToggleFavorite: (post: PetFeedPost) => void;
  onReportPost: (post: PetFeedPost, reason: string, note?: string) => void;
  onHideBreeder: (profile: BreederProfile) => void;
  onMessageBreeder?: (post: PetFeedPost) => void;
  onFetchPostDetail?: (postId: string) => Promise<PetFeedPost | null>;
  onFetchPostComments?: (postId: string) => Promise<PetFeedComment[]>;
  onSubmitPostComment?: (postId: string, body: string, parentId?: string | null) => Promise<PetFeedComment | null>;
  onDeletePostComment?: (comment: PetFeedComment, removedCount?: number) => Promise<boolean>;
  currentUserId?: string | null;
};

export function PetFeedPostDetailScreen({
  postId,
  listPosts,
  onBack,
  onToggleFavorite,
  onReportPost,
  onHideBreeder,
  onMessageBreeder,
  onFetchPostDetail,
  onFetchPostComments,
  onSubmitPostComment,
  onDeletePostComment,
  currentUserId,
}: PetFeedPostDetailScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomInset = modalBottomInset(insets.bottom);
  const keyboardOverlap = useIosKeyboardOverlap();
  const composerPad = keyboardOverlap > 0 ? 8 : bottomInset;

  const { selectedPost, detailLoading } = usePetFeedPostDetail(postId, listPosts, onFetchPostDetail);
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

  return (
    <View className="flex-1 bg-[#F2F4F8]" style={{ paddingBottom: keyboardOverlap }}>
      <View className="flex-row items-center border-b border-gray-200 bg-white px-2 py-2">
        <Pressable
          testID="pet-feed-detail-back-button"
          accessibilityRole="button"
          accessibilityLabel={t('petFeed.accessibility.closeDetail')}
          className="w-14 rounded-lg p-2 active:bg-slate-100"
          hitSlop={8}
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-semibold text-slate-900">{t('petFeed.detailTitle')}</Text>
        <View className="w-14" />
      </View>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
      >
        {selectedPost ? (
          <>
            <PetFeedPostCard
              post={selectedPost}
              onToggleFavorite={onToggleFavorite}
              onReportPost={onReportPost}
              onHideBreeder={onHideBreeder}
              onMessageBreeder={onMessageBreeder}
              currentUserId={currentUserId}
              showHideBreeder
              autoPlayVideo={false}
              mediaLoading={detailLoading}
              testID={`pet-feed-detail-post-${selectedPost.id}`}
            />
            <PetFeedCommentsSection
              threads={threads}
              loading={commentsLoading}
              currentUserId={currentUserId}
              onReply={setReplyTo}
              onDelete={(comment) => void removeComment(comment)}
            />
          </>
        ) : detailLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator color={PRIMARY} />
          </View>
        ) : (
          <View className="items-center px-6 py-16">
            <Text className="text-center text-sm text-slate-500">{t('petFeed.loadFailedTitle')}</Text>
          </View>
        )}
      </ScrollView>

      {selectedPost ? (
        <View className="border-t border-gray-200 bg-white" style={{ paddingBottom: composerPad }}>
          <PetFeedCommentComposer
            submitting={commentSubmitting}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onSubmit={addComment}
          />
        </View>
      ) : null}
    </View>
  );
}
