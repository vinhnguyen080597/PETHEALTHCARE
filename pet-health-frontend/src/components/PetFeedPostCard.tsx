import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { memo, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { type PetFeedReportReason } from '../constants/petFeedReportReasons';
import type { BreederProfile, PetFeedPost } from '../types';
import { formatPetFeedPrice } from '../utils/petFeedCurrency';
import { ReportModal } from './ReportModal';

const PRIMARY = '#1E6FE8';

type PetFeedMediaItem =
  | { type: 'image'; uri: string }
  | { type: 'video'; uri: string };

type PetFeedPostCardProps = {
  post: PetFeedPost;
  onToggleFavorite?: (post: PetFeedPost) => void;
  onReportPost?: (post: PetFeedPost, reason: string, note?: string) => void;
  onHideBreeder?: (profile: BreederProfile) => void;
  showFavorite?: boolean;
  showContact?: boolean;
  showReport?: boolean;
  showHideBreeder?: boolean;
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
  const zaloUrl = safeZaloUrl(zalo);
  if (zaloUrl) return zaloUrl;
  const facebookUrl = safeFacebookUrl(facebook);
  if (facebookUrl) return facebookUrl;
  const phoneUrl = safePhoneUrl(phone);
  if (phoneUrl) return phoneUrl;
  return '';
}

function safeHttpUrl(value: string, allowedHosts: string[]) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') return '';
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`)) ? parsed.toString() : '';
  } catch {
    return '';
  }
}

function safeZaloUrl(value: string) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return safeHttpUrl(value, ['zalo.me']);
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 ? `https://zalo.me/${digits}` : '';
}

function safeFacebookUrl(value: string) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return safeHttpUrl(value, ['facebook.com', 'fb.com', 'm.me']);
  const handle = value.replace(/^@/, '').replace(/[^a-zA-Z0-9._-]/g, '');
  return handle ? `https://facebook.com/${encodeURIComponent(handle)}` : '';
}

function safePhoneUrl(value: string) {
  const cleaned = value.replace(/[^\d+]/g, '');
  return cleaned.replace(/\D/g, '').length >= 8 ? `tel:${cleaned}` : '';
}

function ContactButton({ post }: { post: PetFeedPost }) {
  const { t } = useTranslation();
  const url = firstContact(post);
  return (
    <Pressable
      testID={`pet-feed-contact-button-${post.id}`}
      accessibilityRole="button"
      accessibilityLabel={t('petFeed.accessibility.contactBreeder', { title: post.title })}
      accessibilityState={{ disabled: !url }}
      className={`min-w-[160px] flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 ${url ? 'bg-blue-600 active:opacity-90' : 'bg-slate-200'}`}
      disabled={!url}
      onPress={() => {
        if (!url) return;
        Alert.alert(t('petFeed.contactConfirmTitle'), t('petFeed.contactConfirmBody'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('petFeed.contactConfirmOpen'), onPress: () => void Linking.openURL(url) },
        ]);
      }}
    >
      <Ionicons name="chatbubble-ellipses-outline" size={17} color={url ? '#fff' : '#94a3b8'} />
      <Text className={`text-sm font-bold ${url ? 'text-white' : 'text-slate-400'}`}>{t('petFeed.contact')}</Text>
    </Pressable>
  );
}

function HideBreederButton({ profile, onHideBreeder }: { profile?: BreederProfile | null; onHideBreeder?: (profile: BreederProfile) => void }) {
  const { t } = useTranslation();
  if (!profile || !onHideBreeder) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('petFeed.accessibility.hideBreeder', { name: profile.display_name || t('petFeed.breederFallback') })}
      className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 active:bg-red-100"
      onPress={() => {
        Alert.alert(t('breederDetail.blockTitle'), t('breederDetail.blockBody'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('breederDetail.blockConfirm'), style: 'destructive', onPress: () => onHideBreeder(profile) },
        ]);
      }}
    >
      <Ionicons name="eye-off-outline" size={18} color="#b91c1c" />
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

function mediaItemsForPost(post: PetFeedPost): PetFeedMediaItem[] {
  const imageItems = post.media_urls.filter(Boolean).map((uri) => ({ type: 'image' as const, uri }));
  return post.video_url ? [...imageItems, { type: 'video' as const, uri: post.video_url }] : imageItems;
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

function PetFeedMedia({
  media,
  autoPlayVideo,
  mediaLabel,
}: {
  media: PetFeedMediaItem | null;
  autoPlayVideo: boolean;
  mediaLabel: string;
}) {
  if (media?.type === 'video') {
    return <AutoPlayVideo uri={media.uri} autoPlay={autoPlayVideo} />;
  }
  if (media?.type === 'image') {
    return (
      <View className="h-full w-full">
        <Image
          source={{ uri: media.uri }}
          style={{ height: '100%', width: '100%' }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={160}
          accessibilityLabel={mediaLabel}
        />
      </View>
    );
  }
  return (
    <View className="h-full w-full items-center justify-center">
      <Ionicons name="paw-outline" size={46} color={PRIMARY} />
    </View>
  );
}

function PetFeedPostCardComponent({
  post,
  onToggleFavorite,
  onReportPost,
  onHideBreeder,
  showFavorite = true,
  showContact = true,
  showReport = true,
  showHideBreeder = false,
  variant = 'full',
  autoPlayVideo = false,
  onPress,
  testID,
}: PetFeedPostCardProps) {
  const { t, i18n } = useTranslation();
  const breeder = post.breeder_profile;
  const showActions = showContact || showReport || showHideBreeder;
  const isCompact = variant === 'compact';
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState<PetFeedReportReason>('scam');
  const [reportNote, setReportNote] = useState('');
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const mediaItems = mediaItemsForPost(post);
  const selectedMedia = mediaItems[Math.min(selectedMediaIndex, Math.max(mediaItems.length - 1, 0))] ?? null;

  useEffect(() => {
    setSelectedMediaIndex(0);
  }, [post.id]);

  function submitReport() {
    onReportPost?.(post, reportReason, reportNote);
    setReportVisible(false);
    setReportNote('');
  }

  const speciesKey = `breederProfile.speciesOptions.${post.species.trim().toLowerCase()}`;
  const speciesLabel = post.species ? t(speciesKey) : '';
  const petIdentity = [post.breed, speciesLabel === speciesKey ? post.species : speciesLabel].filter(Boolean).join(' · ');
  const ageLabel = post.age_months != null ? t('petFeed.ageMonths', { count: post.age_months }) : '';
  const locationLabel = post.location || t('petFeed.locationUnknown');
  const healthLabel = post.vaccine_status || t('petFeed.vaccineUnknown');
  const priceLabel = formatPetFeedPrice(post.price_note, i18n.language);

  const content = (
    <>
      <View className="h-48 bg-blue-50">
        <PetFeedMedia
          media={selectedMedia}
          autoPlayVideo={autoPlayVideo}
          mediaLabel={t('petFeed.accessibility.listingMedia', { title: post.title })}
        />
      </View>
      {mediaItems.length > 1 ? (
        <View className="border-b border-gray-100 bg-white py-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}
          >
            {mediaItems.map((item, index) => {
              const active = index === selectedMediaIndex;
              const posterFromMeta =
                typeof post.metadata?.video_poster_url === 'string' ? post.metadata.video_poster_url.trim() : '';
              const posterUri =
                item.type === 'image' ? item.uri : posterFromMeta || post.media_urls[0];
              return (
                <Pressable
                  key={`${item.type}-${item.uri}-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={item.type === 'video'
                    ? t('petFeed.accessibility.openListingVideo', { index: index + 1 })
                    : t('petFeed.accessibility.openListingPhoto', { index: index + 1 })}
                  accessibilityState={{ selected: active }}
                  className={`h-12 w-16 overflow-hidden rounded-xl border ${
                    active ? 'border-blue-600' : 'border-gray-200'
                  }`}
                  onPress={(event) => {
                    event.stopPropagation();
                    setSelectedMediaIndex(index);
                  }}
                >
                  {posterUri ? (
                    <Image
                      source={{ uri: posterUri }}
                      style={{ height: '100%', width: '100%' }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center bg-blue-50">
                      <Ionicons name="paw-outline" size={18} color={PRIMARY} />
                    </View>
                  )}
                  {item.type === 'video' ? (
                    <View className="absolute inset-0 items-center justify-center bg-black/35">
                      <View className="h-7 w-7 items-center justify-center rounded-full bg-black/65">
                        <Ionicons name="play" size={14} color="#fff" />
                      </View>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
      {isCompact ? (
        <View className="p-4">
          <Text className="text-lg font-bold text-slate-900" numberOfLines={2}>{post.title}</Text>
          <View className="mt-1 flex-row flex-wrap items-center gap-1.5">
            <Text className="text-sm font-medium text-slate-500" numberOfLines={1}>
              {breeder?.display_name ?? t('petFeed.breederFallback')}
            </Text>
            {breeder?.verification_status === 'verified' ? (
              <>
                <Text className="text-sm text-slate-300">·</Text>
                <View className="flex-row items-center gap-1">
                  <Ionicons name="shield-checkmark-outline" size={13} color="#047857" />
                  <Text className="text-xs font-bold text-emerald-700">{t('petFeed.topBreeders.verified')}</Text>
                </View>
              </>
            ) : null}
          </View>
          <View className="mt-2 flex-row flex-wrap items-center gap-2">
            <Text className="text-sm font-semibold text-slate-800" numberOfLines={1}>
              {petIdentity}
            </Text>
            {priceLabel ? (
              <Text className="rounded-full bg-blue-50 px-2.5 py-1 text-sm font-bold text-blue-700" numberOfLines={1}>
                {priceLabel}
              </Text>
            ) : null}
          </View>
          <View className="mt-2 flex-row items-center gap-1.5">
            <Ionicons name="calendar-outline" size={14} color="#64748b" />
            <Text className="min-w-0 flex-1 text-sm text-slate-600" numberOfLines={1}>
              {[ageLabel, locationLabel].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <View className="mt-3 gap-2 rounded-2xl bg-slate-50 px-3 py-2.5">
            <View className="flex-row items-center gap-2">
              <Ionicons name="medical-outline" size={15} color={PRIMARY} />
              <Text className="min-w-0 flex-1 text-sm font-semibold text-slate-800" numberOfLines={1}>
                {healthLabel}
              </Text>
            </View>
            {post.gender ? (
              <View className="flex-row items-center gap-2">
                <Ionicons name="male-female-outline" size={15} color="#64748b" />
                <Text className="min-w-0 flex-1 text-xs font-medium text-slate-500" numberOfLines={1}>
                  {post.gender}
                </Text>
              </View>
            ) : null}
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
              accessibilityLabel={post.is_favorited ? t('petFeed.accessibility.unsaveListing') : t('petFeed.accessibility.saveListing')}
              accessibilityState={{ selected: post.is_favorited }}
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
          <DetailLine icon="cash-outline" text={priceLabel} />
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
          <View className="mt-4 flex-row flex-wrap gap-3">
            {showContact ? <ContactButton post={post} /> : null}
            {showHideBreeder ? <HideBreederButton profile={breeder} onHideBreeder={onHideBreeder} /> : null}
            {showReport ? (
              <Pressable
                testID={`pet-feed-report-button-${post.id}`}
                accessibilityRole="button"
                accessibilityLabel={t('petFeed.accessibility.reportListing', { title: post.title })}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 active:bg-slate-50"
                onPress={() => setReportVisible(true)}
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
        accessibilityLabel={t('petFeed.accessibility.openListing', { title: post.title })}
        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm active:opacity-95"
        onPress={() => onPress(post)}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <>
      <View testID={testID ?? `pet-feed-post-${post.id}`} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {content}
      </View>
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
    </>
  );
}

export const PetFeedPostCard = memo(PetFeedPostCardComponent);
