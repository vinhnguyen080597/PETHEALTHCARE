import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BRAND } from '../theme/brand';
import type { PetFeedPost } from '../types';
import { formatPetFeedPrice } from '../utils/petFeedCurrency';
import {
  fillTemplate,
  LISTING_CARD_IMAGE_HEIGHT,
  listingWarrantyCoverageDays,
  readListingWarrantyPolicy,
} from '../utils/marketplaceListingCard';
import { buildPetFeedDetailSpecs } from '../utils/petFeedDetailSpecs';
import { PetFeedPostTimeMeta } from './PetFeedPostTimeMeta';

type MediaItem =
  | { type: 'image'; uri: string }
  | { type: 'video'; uri: string };

function mediaItemsForPost(post: PetFeedPost): MediaItem[] {
  const images = post.media_urls.filter(Boolean).map((uri) => ({ type: 'image' as const, uri }));
  return post.video_url ? [...images, { type: 'video' as const, uri: post.video_url }] : images;
}

function AutoPlayVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri }, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });
  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      style={{ height: '100%', width: '100%' }}
    />
  );
}

function SpecCell({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="min-w-0 flex-1 flex-row items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
      <Ionicons name={icon} size={18} color={BRAND.textMuted} style={{ marginTop: 2 }} />
      <View className="min-w-0 flex-1">
        <Text className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</Text>
        <Text className="text-sm font-semibold leading-snug text-slate-900" numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

type PetFeedPostDetailBodyProps = {
  post: PetFeedPost;
  mediaLoading?: boolean;
  onToggleFavorite?: (post: PetFeedPost) => void;
  onMessageBreeder?: (post: PetFeedPost) => void;
  onEditPost?: (post: PetFeedPost) => void;
  showFavorite?: boolean;
  showMessageButton?: boolean;
  showEditButton?: boolean;
  showStatusButton?: boolean;
  onPressStatusUpdate?: () => void;
};

export function PetFeedPostDetailBody({
  post,
  mediaLoading = false,
  onToggleFavorite,
  onMessageBreeder,
  onEditPost,
  showFavorite = true,
  showMessageButton = false,
  showEditButton = false,
  showStatusButton = false,
  onPressStatusUpdate,
}: PetFeedPostDetailBodyProps) {
  const { t, i18n } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const mediaItems = useMemo(() => mediaItemsForPost(post), [post]);
  const selected = mediaItems[Math.min(selectedIndex, Math.max(mediaItems.length - 1, 0))] ?? null;

  useEffect(() => {
    setSelectedIndex(0);
  }, [post.id]);

  const priceLabel = formatPetFeedPrice(post.price_note, i18n.language);
  const specs = useMemo(
    () =>
      buildPetFeedDetailSpecs(post, {
        ageMonths: (count) => t('petFeed.ageMonths', { count }),
        male: t('gender.male'),
        female: t('gender.female'),
      }),
    [post, t],
  );
  const warranty = readListingWarrantyPolicy(post);
  const warrantyDays = listingWarrantyCoverageDays(warranty);
  const breeder = post.breeder_profile;

  const openWarrantyInfo = useCallback(() => {
    if (!warranty) {
      Alert.alert(t('petFeed.detail.warrantyNone'), t('petFeed.detail.warrantyNoneHint'));
      return;
    }
    const lines = [
      warranty.title,
      warrantyDays != null ? fillTemplate(t('petFeed.card.warranty'), warrantyDays) : null,
    ].filter(Boolean);
    Alert.alert(warranty.title || t('petFeed.detail.warrantyView'), lines.join('\n'));
  }, [t, warranty, warrantyDays]);

  const iconForSpec = (icon: string): keyof typeof Ionicons.glyphMap => {
    if (icon === 'calendar') return 'calendar-outline';
    if (icon === 'male-female') return 'male-female-outline';
    if (icon === 'location') return 'location-outline';
    return 'paw-outline';
  };

  const showActionRow =
    (showFavorite && onToggleFavorite)
    || (showMessageButton && onMessageBreeder)
    || (showEditButton && onEditPost)
    || (showStatusButton && onPressStatusUpdate);

  return (
    <View className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
      <View className="relative bg-slate-100" style={{ height: LISTING_CARD_IMAGE_HEIGHT }}>
        {selected?.type === 'video' ? (
          <AutoPlayVideo uri={selected.uri} />
        ) : selected?.type === 'image' ? (
          <Image source={{ uri: selected.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : mediaLoading ? (
          <View className="h-full w-full bg-slate-200" />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name="paw-outline" size={48} color={BRAND.btnPrimary} />
          </View>
        )}
        {mediaItems.length > 0 ? (
          <View className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1">
            <Text className="text-xs font-semibold text-white">
              {t('petFeed.detail.mediaCount', {
                current: Math.min(selectedIndex + 1, mediaItems.length),
                total: mediaItems.length,
              })}
            </Text>
          </View>
        ) : null}
      </View>

      {mediaItems.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="border-b border-slate-100 bg-white"
          contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingVertical: 10 }}
        >
          {mediaItems.map((item, index) => {
            const active = index === selectedIndex;
            const poster =
              typeof post.metadata?.video_poster_url === 'string' ? post.metadata.video_poster_url.trim() : '';
            const thumbUri = item.type === 'image' ? item.uri : poster || post.media_urls[0] || '';
            return (
              <Pressable
                key={`${item.type}-${item.uri}-${index}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className="h-14 w-14 overflow-hidden rounded-xl"
                style={{
                  borderWidth: 2,
                  borderColor: active ? BRAND.btnPrimary : '#E2E8F0',
                }}
                onPress={() => setSelectedIndex(index)}
              >
                {thumbUri ? (
                  <Image source={{ uri: thumbUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <View className="h-full w-full items-center justify-center bg-slate-100">
                    <Ionicons name="videocam-outline" size={18} color={BRAND.textMuted} />
                  </View>
                )}
                {item.type === 'video' ? (
                  <View className="absolute inset-0 items-center justify-center bg-black/35">
                    <Ionicons name="play" size={14} color="#fff" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View className="gap-4 p-4">
        <View className="gap-2.5">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="min-w-0 flex-1 text-lg font-bold leading-snug text-slate-900" numberOfLines={2}>
              {post.title}
            </Text>
            {priceLabel ? (
              <Text className="shrink-0 text-lg font-bold leading-snug" style={{ color: BRAND.btnPrimary }}>
                {priceLabel}
              </Text>
            ) : null}
          </View>

          {showActionRow ? (
            <View className="flex-row items-center justify-between gap-3">
              {showFavorite && onToggleFavorite ? (
                <Pressable
                  testID={`pet-feed-favorite-button-${post.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={post.is_favorited ? t('petFeed.accessibility.unsaveListing') : t('petFeed.accessibility.saveListing')}
                  className="shrink-0 flex-row items-center gap-1.5 py-1"
                  onPress={() => onToggleFavorite(post)}
                >
                  <Ionicons
                    name={post.is_favorited ? 'heart' : 'heart-outline'}
                    size={20}
                    color={post.is_favorited ? '#E11D48' : '#6E5A51'}
                  />
                  <Text className="text-xs font-semibold" style={{ color: post.is_favorited ? '#E11D48' : '#6E5A51' }}>
                    {post.favorite_count ?? 0}
                  </Text>
                </Pressable>
              ) : (
                <View className="shrink-0" />
              )}
              <View className="shrink-0 flex-row flex-wrap items-center justify-end gap-2">
                {showMessageButton && onMessageBreeder ? (
                  <Pressable
                    testID={`pet-feed-message-button-${post.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={t('petFeed.accessibility.messageBreeder', { title: post.title })}
                    className="flex-row items-center justify-center gap-1.5 rounded-xl border px-3 py-2"
                    style={{
                      backgroundColor: BRAND.btnSecondary,
                      borderColor: BRAND.borderBrand,
                    }}
                    onPress={() => onMessageBreeder(post)}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={15} color={BRAND.textBrandLink} />
                    <Text className="text-xs font-semibold" style={{ color: BRAND.textBrandLink }}>
                      {t('petFeed.messages.messageCta')}
                    </Text>
                  </Pressable>
                ) : null}
                {showEditButton && onEditPost ? (
                  <Pressable
                    testID={`pet-feed-edit-button-${post.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={t('petFeed.accessibility.editListing', { title: post.title })}
                    className="flex-row items-center justify-center gap-1.5 rounded-xl border px-3 py-2"
                    style={{
                      backgroundColor: BRAND.btnSecondary,
                      borderColor: BRAND.borderBrand,
                    }}
                    onPress={() => onEditPost(post)}
                  >
                    <Ionicons name="create-outline" size={15} color={BRAND.textBrandLink} />
                    <Text className="text-xs font-semibold" style={{ color: BRAND.textBrandLink }}>
                      {t('petFeed.editListing')}
                    </Text>
                  </Pressable>
                ) : null}
                {showStatusButton && onPressStatusUpdate ? (
                  <Pressable
                    testID={`pet-feed-status-button-${post.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={t('listing.statusModal.open')}
                    className="z-10 flex-row items-center justify-center gap-1.5 rounded-xl border px-3 py-2"
                    style={{
                      backgroundColor: BRAND.btnSecondary,
                      borderColor: BRAND.borderBrand,
                    }}
                    onPress={onPressStatusUpdate}
                  >
                    <Ionicons name="flag-outline" size={15} color={BRAND.textBrandLink} />
                    <Text className="text-xs font-semibold" style={{ color: BRAND.textBrandLink }}>
                      {t('listing.statusModal.open')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>

        {specs.length > 0 ? (
          <View className="gap-3">
            {[0, 2].map((rowStart) => {
              const row = specs.slice(rowStart, rowStart + 2);
              if (!row.length) return null;
              return (
                <View key={rowStart} className="flex-row gap-3">
                  {row.map((spec) => (
                    <SpecCell
                      key={spec.key}
                      icon={iconForSpec(spec.icon)}
                      label={t(spec.labelKey)}
                      value={spec.value}
                    />
                  ))}
                  {row.length === 1 ? <View className="flex-1" /> : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {post.personality.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {post.personality.map((tag) => (
              <View key={tag} className="rounded-full bg-slate-100 px-2.5 py-1">
                <Text className="text-xs font-medium text-slate-600">{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {post.description ? (
          <Text className="text-sm leading-6 text-slate-600">{post.description}</Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          className="flex-row items-center gap-3 rounded-xl bg-slate-50 p-3 active:bg-slate-100"
        >
          {breeder?.avatar_url ? (
            <Image
              source={{ uri: breeder.avatar_url }}
              style={{ width: 40, height: 40, borderRadius: 20 }}
              contentFit="cover"
            />
          ) : (
            <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: BRAND.surfaceLight }}>
              <Ionicons name="paw" size={18} color={BRAND.btnPrimary} />
            </View>
          )}
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-semibold text-slate-900" numberOfLines={1}>
              {breeder?.display_name ?? t('petFeed.breederFallback')}
            </Text>
            <Text className="text-xs text-slate-400" numberOfLines={1}>
              {breeder?.location || post.location || t('petFeed.locationUnknown')}
            </Text>
            <PetFeedPostTimeMeta post={post} className="mt-0.5 text-[11px] text-slate-400" />
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('petFeed.detail.warrantyView')}
          className="rounded-xl border px-3.5 py-3"
          style={{
            borderColor: warranty ? '#BAE6FD' : BRAND.borderCard,
            backgroundColor: warranty ? '#F0F9FF' : BRAND.appBackground,
          }}
          onPress={openWarrantyInfo}
        >
          <Text className="text-sm font-semibold text-slate-900">
            {`🛡️ ${warranty?.title || t('petFeed.detail.warrantyNone')}`}
          </Text>
          <Text className="mt-0.5 text-xs font-medium" style={{ color: warranty ? '#0369A1' : BRAND.textMuted }}>
            {warranty ? t('petFeed.detail.warrantyView') : t('petFeed.detail.warrantyNoneHint')}
          </Text>
        </Pressable>

        {(post.vaccine_status || post.deworming_status) ? (
          <View className="rounded-xl bg-slate-50 p-3">
            <Text className="text-xs font-bold uppercase text-slate-500">{t('petFeed.healthInfo')}</Text>
            <Text className="mt-1 text-sm leading-5 text-slate-700">
              {post.vaccine_status || t('petFeed.vaccineUnknown')}
              {post.deworming_status ? ` · ${post.deworming_status}` : ''}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
