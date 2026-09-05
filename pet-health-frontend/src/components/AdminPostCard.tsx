import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { memo, useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PetFeedCommentsSection } from './PetFeedCommentsSection';
import { usePetFeedPostComments } from '../hooks/usePetFeedPostComments';
import type { AnnouncementCategory, PetFeedComment, PetFeedPost } from '../types';
import { sharePetFeedPost } from '../utils/sharePetFeedPost';

type AdminPostCardProps = {
  post: PetFeedPost;
  onPress?: (post: PetFeedPost) => void;
  onToggleFavorite?: (post: PetFeedPost) => void;
  currentUserId?: string | null;
  onFetchComments?: (postId: string) => Promise<PetFeedComment[]>;
  onSubmitComment?: (postId: string, body: string, parentId?: string | null) => Promise<PetFeedComment | null>;
  onDeleteComment?: (comment: PetFeedComment, removedCount?: number) => Promise<boolean>;
  testID?: string;
  featured?: boolean;
};

const NEWS_BOOKMARK_STORAGE_KEY = 'petFeed.newsBookmarks';

function categoryKey(category: string): AnnouncementCategory {
  const value = category.trim().toLowerCase();
  if (value === 'app_update' || value === 'health_tip' || value === 'community' || value === 'general') {
    return value;
  }
  return 'general';
}

function formatNewsDate(value: string, locale: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';
  try {
    return new Intl.DateTimeFormat(locale.toLowerCase().startsWith('vi') ? 'vi-VN' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(time);
  } catch {
    return '';
  }
}

function estimateReadMinutes(text: string) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

function newsBodyNeedsExpand(text: string, featured: boolean) {
  const normalized = String(text || '').trim();
  if (!normalized) return false;
  const lines = normalized.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
  const words = normalized.split(/\s+/).filter(Boolean).length;
  return featured ? lines > 3 || words > 42 : lines > 2 || words > 26;
}

function AdminPostCardComponent({
  post,
  onPress,
  onToggleFavorite,
  currentUserId,
  onFetchComments,
  onSubmitComment,
  onDeleteComment,
  testID,
  featured = false,
}: AdminPostCardProps) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const category = categoryKey(String(post.metadata?.category ?? 'general'));
  const ctaLabel = typeof post.metadata?.ctaLabel === 'string' ? post.metadata.ctaLabel.trim() : '';
  const ctaUrl = typeof post.metadata?.ctaUrl === 'string' ? post.metadata.ctaUrl.trim() : '';
  const cover = post.media_urls[0] ?? null;
  const dateLabel = formatNewsDate(post.created_at, i18n.language);
  const readMinutes = estimateReadMinutes(post.description || '');
  const saved = Boolean(post.is_favorited);
  const canExpand = newsBodyNeedsExpand(post.description || '', featured);

  const toggleExpand = () => setExpanded((current) => !current);
  const toggleComments = () => setCommentsOpen((current) => !current);
  const {
    threads,
    loading: commentsLoading,
    submitting: commentSubmitting,
    replyTo,
    setReplyTo,
    addComment,
    removeComment,
  } = usePetFeedPostComments(
    commentsOpen ? post.id : null,
    onFetchComments,
    onSubmitComment,
    onDeleteComment,
  );

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(NEWS_BOOKMARK_STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        const ids = raw ? (JSON.parse(raw) as string[]) : [];
        setBookmarked(Array.isArray(ids) && ids.includes(post.id));
      })
      .catch(() => {
        if (!cancelled) setBookmarked(false);
      });
    return () => {
      cancelled = true;
    };
  }, [post.id]);

  const toggleBookmark = async () => {
    const next = !bookmarked;
    setBookmarked(next);
    try {
      const raw = await AsyncStorage.getItem(NEWS_BOOKMARK_STORAGE_KEY);
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      const nextIds = next
        ? Array.from(new Set([...(Array.isArray(ids) ? ids : []), post.id]))
        : (Array.isArray(ids) ? ids : []).filter((id) => id !== post.id);
      await AsyncStorage.setItem(NEWS_BOOKMARK_STORAGE_KEY, JSON.stringify(nextIds));
    } catch {
      setBookmarked(!next);
    }
  };

  const body = (
    <>
      {cover ? (
        <View className="relative overflow-hidden rounded-t-2xl bg-[#FDFBF7]">
          <Image source={{ uri: cover }} style={{ width: '100%', height: featured ? 300 : 240 }} contentFit="cover" />
          {featured ? (
            <View className="absolute left-3 top-3 self-start rounded-full bg-[#2B1E19]/90 px-2.5 py-1">
              <Text className="text-[11px] font-bold text-amber-100">🔥 {t('petFeed.newsCard.featured')}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      <View className={`gap-3 ${featured ? 'p-5' : 'p-4'}`}>
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="self-start rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
            {t(`adminPost.category.${category}`)}
          </Text>
          <Text className="text-xs font-medium text-[#6E5A51]">Pet Health Care</Text>
          {dateLabel ? <Text className="text-xs text-[#6E5A51]">· {dateLabel}</Text> : null}
          <Text className="text-xs text-[#6E5A51]">· {t('petFeed.newsCard.readMinutes', { count: readMinutes })}</Text>
        </View>
        <Text className={`${featured ? 'text-[18px]' : 'text-[16px]'} font-bold leading-7 text-[#2B1E19]`}>
          {post.title}
        </Text>
        <Text className="text-sm leading-7 text-[#5C4A3A]" numberOfLines={expanded ? undefined : featured ? 3 : 2}>
          {post.description}
        </Text>
        {canExpand || expanded ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={expanded ? t('petFeed.newsCard.readLess') : t('petFeed.newsCard.readMore')}
            className="self-start"
            onPress={(event) => {
              event.stopPropagation?.();
              toggleExpand();
            }}
          >
            <Text className="text-sm font-semibold text-[#D97706]">
              {expanded ? t('petFeed.newsCard.readLess') : `${t('petFeed.newsCard.readMore')} →`}
            </Text>
          </Pressable>
        ) : null}
        {ctaLabel && ctaUrl ? (
          <Pressable
            className="self-start rounded-full bg-[#D97706] px-3.5 py-2 active:opacity-90"
            onPress={(event) => {
              event.stopPropagation?.();
              void Linking.openURL(ctaUrl);
            }}
          >
            <Text className="text-xs font-bold text-white">{ctaLabel}</Text>
          </Pressable>
        ) : null}
        <View className="h-px bg-[#F3E2C8]" />
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-row items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={saved ? t('petFeed.newsCard.saved') : t('petFeed.newsCard.favorite')}
              className="mr-6 flex-row items-center gap-1.5 py-1.5"
              onPress={(event) => {
                event.stopPropagation?.();
                onToggleFavorite?.(post);
              }}
            >
              <Ionicons name={saved ? 'heart' : 'heart-outline'} size={15} color={saved ? '#E11D48' : '#6E5A51'} />
              <Text className="text-xs font-semibold" style={{ color: saved ? '#E11D48' : '#6E5A51' }}>
                {post.favorite_count ?? 0}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('petFeed.comments.title')}
              accessibilityState={{ expanded: commentsOpen }}
              className="flex-row items-center gap-1.5 py-1.5"
              onPress={(event) => {
                event.stopPropagation?.();
                toggleComments();
              }}
            >
              <Ionicons name="chatbubble-outline" size={14} color="#6E5A51" />
              <Text className="text-xs font-semibold text-[#6E5A51]">{post.comment_count ?? 0}</Text>
            </Pressable>
          </View>
          <View className="flex-row items-center gap-4">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('petFeed.newsCard.share')}
              className="flex-row items-center gap-1.5 py-1.5"
              onPress={(event) => {
                event.stopPropagation?.();
                void sharePetFeedPost(post);
              }}
            >
              <Ionicons name="share-social-outline" size={14} color="#6E5A51" />
              <Text className="text-xs font-semibold text-[#6E5A51]">{t('petFeed.newsCard.share')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={bookmarked ? t('petFeed.newsCard.bookmarked') : t('petFeed.newsCard.bookmark')}
              className="flex-row items-center gap-1.5 py-1.5"
              onPress={(event) => {
                event.stopPropagation?.();
                void toggleBookmark();
              }}
            >
              <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={14} color={bookmarked ? '#D97706' : '#6E5A51'} />
              <Text className="text-xs font-semibold" style={{ color: bookmarked ? '#D97706' : '#6E5A51' }}>
                {bookmarked ? t('petFeed.newsCard.bookmarked') : t('petFeed.newsCard.bookmark')}
              </Text>
            </Pressable>
          </View>
        </View>
        {commentsOpen ? (
          <PetFeedCommentsSection
            threads={threads}
            loading={commentsLoading}
            currentUserId={currentUserId}
            onReply={setReplyTo}
            onDelete={(comment) => void removeComment(comment)}
            commentSubmitting={commentSubmitting}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onSubmitComment={onSubmitComment ? addComment : undefined}
          />
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        className="overflow-hidden rounded-2xl border border-[#F3E2C8] bg-white shadow-sm active:opacity-95"
        onPress={() => onPress(post)}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View testID={testID} className="overflow-hidden rounded-2xl border border-[#F3E2C8] bg-white shadow-sm">
      {body}
    </View>
  );
}

export const AdminPostCard = memo(AdminPostCardComponent);
