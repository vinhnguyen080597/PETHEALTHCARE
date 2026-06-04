import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect } from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PetFeedPost } from '../types';

const PRIMARY = '#1E6FE8';

type PetFeedPostCardProps = {
  post: PetFeedPost;
  onToggleFavorite?: (post: PetFeedPost) => void;
  onReportPost?: (post: PetFeedPost, reason: string, note?: string) => void;
  showFavorite?: boolean;
  showContact?: boolean;
  showReport?: boolean;
  variant?: 'compact' | 'full';
  autoPlayVideo?: boolean;
  onPress?: (post: PetFeedPost) => void;
  testID?: string;
};

function firstContact(post: PetFeedPost) {
  const contact = { ...(post.breeder_profile?.contact ?? {}), ...(post.contact ?? {}) };
  const zalo = typeof contact.zalo === 'string' ? contact.zalo.trim() : '';
  const facebook = typeof contact.facebook === 'string' ? contact.facebook.trim() : '';
  const phone = typeof contact.phone === 'string' ? contact.phone.trim() : '';
  if (zalo) return zalo.startsWith('http') ? zalo : `https://zalo.me/${zalo.replace(/\D/g, '')}`;
  if (facebook) return facebook.startsWith('http') ? facebook : `https://facebook.com/${facebook}`;
  if (phone) return `tel:${phone}`;
  return '';
}

function ContactButton({ post }: { post: PetFeedPost }) {
  const { t } = useTranslation();
  const url = firstContact(post);
  return (
    <Pressable
      testID={`pet-feed-contact-button-${post.id}`}
      accessibilityRole="button"
      accessibilityLabel={`Contact breeder for ${post.title}`}
      className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 ${url ? 'bg-blue-600 active:opacity-90' : 'bg-slate-200'}`}
      disabled={!url}
      onPress={() => {
        if (url) void Linking.openURL(url);
      }}
    >
      <Ionicons name="chatbubble-ellipses-outline" size={17} color={url ? '#fff' : '#94a3b8'} />
      <Text className={`text-sm font-bold ${url ? 'text-white' : 'text-slate-400'}`}>{t('petFeed.contact')}</Text>
    </Pressable>
  );
}

function DetailLine({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  if (!text) return null;
  return (
    <View className="flex-row items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1.5">
      <Ionicons name={icon} size={13} color="#64748b" />
      <Text className="text-xs font-medium text-slate-600">{text}</Text>
    </View>
  );
}

function AutoPlayVideo({ uri, autoPlay }: { uri: string; autoPlay: boolean }) {
  const player = useVideoPlayer({ uri }, (instance) => {
    instance.loop = true;
    instance.muted = true;
    if (autoPlay) instance.play();
  });

  useEffect(() => {
    player.muted = true;
    if (autoPlay) player.play();
    else player.pause();
  }, [autoPlay, player]);

  return (
    <VideoView
      player={player}
      nativeControls={!autoPlay}
      contentFit="cover"
      style={{ height: '100%', width: '100%' }}
    />
  );
}

function PetFeedMedia({ post, autoPlayVideo }: { post: PetFeedPost; autoPlayVideo: boolean }) {
  const imageUrl = post.media_urls[0];
  if (post.video_url) {
    return <AutoPlayVideo uri={post.video_url} autoPlay={autoPlayVideo} />;
  }
  if (imageUrl) {
    return <Image source={{ uri: imageUrl }} className="h-full w-full" resizeMode="cover" />;
  }
  return (
    <View className="h-full w-full items-center justify-center">
      <Ionicons name="paw-outline" size={46} color={PRIMARY} />
    </View>
  );
}

export function PetFeedPostCard({
  post,
  onToggleFavorite,
  onReportPost,
  showFavorite = true,
  showContact = true,
  showReport = true,
  variant = 'full',
  autoPlayVideo = false,
  onPress,
  testID,
}: PetFeedPostCardProps) {
  const { t } = useTranslation();
  const breeder = post.breeder_profile;
  const showActions = showContact || showReport;
  const isCompact = variant === 'compact';

  const content = (
    <>
      <View className="h-48 bg-blue-50">
        <PetFeedMedia post={post} autoPlayVideo={autoPlayVideo} />
      </View>
      {isCompact ? (
        <View className="p-4">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="min-w-0 flex-1 text-lg font-bold text-slate-900" numberOfLines={2}>{post.title}</Text>
            {post.price_note ? (
              <Text className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-sm font-bold text-blue-700" numberOfLines={1}>
                {post.price_note}
              </Text>
            ) : null}
          </View>
          <Text className="mt-1 text-sm text-slate-500" numberOfLines={1}>
            {breeder?.display_name ?? t('petFeed.breederFallback')}
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <DetailLine icon="male-female-outline" text={post.gender} />
            <DetailLine icon="calendar-outline" text={post.age_months != null ? t('petFeed.ageMonths', { count: post.age_months }) : ''} />
            <DetailLine icon="location-outline" text={post.location || t('petFeed.locationUnknown')} />
          </View>
        </View>
      ) : (
      <View className="p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-lg font-bold text-slate-900" numberOfLines={2}>{post.title}</Text>
            <Text className="mt-1 text-sm text-slate-500" numberOfLines={1}>
              {breeder?.display_name ?? t('petFeed.breederFallback')} · {post.location || t('petFeed.locationUnknown')}
            </Text>
          </View>
          {showFavorite ? (
            <Pressable
              testID={`pet-feed-favorite-button-${post.id}`}
              accessibilityRole="button"
              accessibilityLabel={post.is_favorited ? 'Remove saved pet listing' : 'Save pet listing'}
              className="rounded-full bg-slate-50 p-2"
              onPress={() => onToggleFavorite?.(post)}
            >
              <Ionicons name={post.is_favorited ? 'heart' : 'heart-outline'} size={22} color={post.is_favorited ? '#dc2626' : '#64748b'} />
            </Pressable>
          ) : null}
        </View>
        <View className="mt-3 flex-row flex-wrap gap-2">
          <DetailLine icon="paw-outline" text={[post.species, post.breed].filter(Boolean).join(' · ')} />
          <DetailLine icon="calendar-outline" text={post.age_months != null ? t('petFeed.ageMonths', { count: post.age_months }) : ''} />
          <DetailLine icon="male-female-outline" text={post.gender} />
          <DetailLine icon="cash-outline" text={post.price_note} />
        </View>
        {post.personality.length > 0 ? (
          <Text className="mt-3 text-sm leading-5 text-slate-700">{t('petFeed.personality')}: {post.personality.join(', ')}</Text>
        ) : null}
        <View className="mt-3 rounded-xl bg-slate-50 p-3">
          <Text className="text-xs font-bold uppercase text-slate-500">{t('petFeed.healthInfo')}</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-700">
            {post.vaccine_status || t('petFeed.vaccineUnknown')}
            {post.deworming_status ? ` · ${post.deworming_status}` : ''}
          </Text>
          {post.paperwork.length > 0 ? (
            <Text className="mt-1 text-sm leading-5 text-slate-700">{t('petFeed.paperwork')}: {post.paperwork.join(', ')}</Text>
          ) : null}
        </View>
        {post.description ? <Text className="mt-3 text-sm leading-5 text-slate-700">{post.description}</Text> : null}
        {showActions ? (
          <View className="mt-4 flex-row gap-3">
            {showContact ? <ContactButton post={post} /> : null}
            {showReport ? (
              <Pressable
                testID={`pet-feed-report-button-${post.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Report listing ${post.title}`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 active:bg-slate-50"
                onPress={() => onReportPost?.(post, 'needs_review')}
              >
                <Ionicons name="flag-outline" size={18} color="#64748b" />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID ?? `pet-feed-post-${post.id}`}
        accessibilityRole="button"
        accessibilityLabel={`Open listing ${post.title}`}
        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm active:opacity-95"
        onPress={() => onPress(post)}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View testID={testID ?? `pet-feed-post-${post.id}`} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {content}
    </View>
  );
}
