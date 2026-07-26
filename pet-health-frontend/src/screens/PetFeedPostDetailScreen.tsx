import { Ionicons } from '@expo/vector-icons';
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
import { PetFeedPostCard } from '../components/PetFeedPostCard';
import { useIosKeyboardOverlap } from '../hooks/useIosKeyboardOverlap';
import { usePetFeedPostComments } from '../hooks/usePetFeedPostComments';
import { usePetFeedPostDetail } from '../hooks/usePetFeedPostDetail';
import type { PetFeedComment, PetFeedPost } from '../types';
import { sharePetFeedPost } from '../utils/sharePetFeedPost';
import { modalBottomInset } from '../utils/modalSafeArea';

type PetFeedPostDetailScreenProps = {
  postId: string;
  listPosts: PetFeedPost[];
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
  currentUserId?: string | null;
};

function Bone({ className }: { className: string }) {
  return <View className={`bg-slate-200 ${className}`} />;
}

function PetFeedPostDetailSkeleton() {
  return (
    <View className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <Bone className="h-80 w-full" />
      <View className="border-b border-gray-100 bg-white py-2">
        <View className="flex-row gap-2 px-3">
          {[0, 1, 2, 3].map((item) => (
            <Bone key={item} className="h-12 w-16 rounded-xl" />
          ))}
        </View>
      </View>
      <View className="gap-3 p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1 gap-2">
            <Bone className="h-5 w-4/5 rounded-full" />
            <Bone className="h-4 w-2/5 rounded-full" />
          </View>
          <Bone className="h-10 w-14 rounded-full" />
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Bone className="h-7 w-28 rounded-full" />
          <Bone className="h-7 w-24 rounded-full" />
          <Bone className="h-7 w-20 rounded-full" />
        </View>
        <Bone className="h-24 w-full rounded-xl" />
        <View className="flex-row gap-2">
          <Bone className="h-11 flex-1 rounded-xl" />
          <Bone className="h-11 w-11 rounded-xl" />
        </View>
      </View>
    </View>
  );
}

export function PetFeedPostDetailScreen({
  postId,
  listPosts,
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
              onMessageBreeder={onMessageBreeder}
              onEditPost={onEditPost}
              onDeletePost={confirmDeletePost}
              onSharePost={(post) => void sharePetFeedPost(post)}
              currentUserId={currentUserId}
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

      {selectedPost ? (
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
    </View>
  );
}
