import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BRAND } from '../theme/brand';
import type { PetFeedPost } from '../types';
import { formatPetFeedPrice } from '../utils/petFeedCurrency';
import {
  LISTING_CARD_IMAGE_HEIGHT,
  readListingWarrantyPolicy,
} from '../utils/marketplaceListingCard';
import { buildPetFeedDetailSpecs } from '../utils/petFeedDetailSpecs';
import { formatListingBirthDateLabel, listingBirthDateDisplayIso } from '../utils/petAge';
import { canShowWarrantyUpdateCta } from '../utils/listingAvailabilityBadge';
import {
  fillListingWarrantyFileUrl,
  mapWarrantyPolicies,
  mapWarrantyPolicy,
  warrantyUploadedFileHref,
} from '../utils/warrantyPolicy';
import { listingDetailMediaSlideCount } from '../utils/petFeedPostDetail';
import { ListingMediaOverlayBadges } from './ListingMediaOverlayBadges';
import { WarrantyPolicyViewer } from './WarrantyPolicyViewer';

type MediaItem =
  | { type: 'image'; uri: string }
  | { type: 'video'; uri: string };

function mediaItemsForPost(post: PetFeedPost): MediaItem[] {
  const images = post.media_urls.filter(Boolean).map((uri) => ({ type: 'image' as const, uri }));
  return post.video_url ? [...images, { type: 'video' as const, uri: post.video_url }] : images;
}

function MediaSkeleton({ className = '' }: { className?: string }) {
  return <View className={`bg-slate-200 ${className}`} />;
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
  onEditPost?: (post: PetFeedPost) => void;
  showFavorite?: boolean;
  favoriteDisabled?: boolean;
  showEditButton?: boolean;
  isOwner?: boolean;
  onPressWarrantyUpdate?: () => void;
};

export function PetFeedPostDetailBody({
  post,
  mediaLoading = false,
  onToggleFavorite,
  onEditPost,
  showFavorite = true,
  favoriteDisabled = false,
  showEditButton = false,
  isOwner = false,
  onPressWarrantyUpdate,
}: PetFeedPostDetailBodyProps) {
  const { t, i18n } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [policyOpen, setPolicyOpen] = useState(false);
  const mediaItems = useMemo(() => mediaItemsForPost(post), [post]);
  const selected = mediaItems[Math.min(selectedIndex, Math.max(mediaItems.length - 1, 0))] ?? null;
  const expectedStripCount = listingDetailMediaSlideCount(post);
  const showMediaStrip = expectedStripCount > 1;

  useEffect(() => {
    setSelectedIndex(0);
  }, [post.id]);

  const priceLabel = formatPetFeedPrice(post.price_note, i18n.language);
  const specs = useMemo(() => {
    const birthIso = listingBirthDateDisplayIso({
      ageMonths: post.age_months,
      metadata: post.metadata,
    });
    return buildPetFeedDetailSpecs(
      {
        breed: post.breed,
        gender: post.gender,
        location: post.location,
        birthDateLabel: birthIso ? formatListingBirthDateLabel(birthIso, i18n.language) : '',
      },
      {
        male: t('gender.male'),
        female: t('gender.female'),
      },
    );
  }, [i18n.language, post.age_months, post.breed, post.gender, post.location, post.metadata, t]);
  const warranty = readListingWarrantyPolicy(post);
  const attachedWarranty = mapWarrantyPolicy(post.warranty_policy);
  const warrantyFileHref = useMemo(() => {
    const meta = post.metadata && typeof post.metadata === 'object' ? post.metadata : {};
    const boundRaw = meta.warranty_policy_bound;
    const bound = boundRaw && typeof boundRaw === 'object' && !Array.isArray(boundRaw)
      ? (boundRaw as Record<string, unknown>)
      : {};
    const profileMeta = post.breeder_profile?.metadata ?? {};
    const library = [
      ...mapWarrantyPolicies(post.breeder_profile?.warranty_policies),
      ...mapWarrantyPolicies(profileMeta.warranty_policies),
    ];
    return warrantyUploadedFileHref(
      fillListingWarrantyFileUrl(
        attachedWarranty ?? { title: warranty?.title, fileUrl: warranty?.fileUrl },
        {
          boundFileUrl: bound.file_url ?? bound.fileUrl,
          library,
        },
      ),
    );
  }, [attachedWarranty, post.breeder_profile, post.metadata, warranty?.fileUrl, warranty?.title]);
  const viewingPolicy = attachedWarranty
    ? { ...attachedWarranty, fileUrl: warrantyFileHref || attachedWarranty.fileUrl }
    : null;
  const showWarrantyUpdate = Boolean(
    onPressWarrantyUpdate
    && canShowWarrantyUpdateCta({
      isOwner,
      status: post.status,
      frozen: Boolean(attachedWarranty?.frozen),
    }),
  );
  const breeder = post.breeder_profile;

  const openWarrantyInfo = useCallback(() => {
    if (warrantyFileHref) {
      void Linking.openURL(warrantyFileHref);
      return;
    }
    if (viewingPolicy) {
      setPolicyOpen(true);
      return;
    }
    Alert.alert(t('petFeed.detail.warrantyNone'), t('petFeed.detail.warrantyNoneHint'));
  }, [t, viewingPolicy, warrantyFileHref]);

  const iconForSpec = (icon: string): keyof typeof Ionicons.glyphMap => {
    if (icon === 'calendar') return 'calendar-outline';
    if (icon === 'male-female') return 'male-female-outline';
    if (icon === 'location') return 'location-outline';
    return 'paw-outline';
  };

  const showActionRow =
    (showFavorite && onToggleFavorite)
    || (showEditButton && onEditPost);

  return (
    <View className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
      <View className="relative bg-slate-100" style={{ height: LISTING_CARD_IMAGE_HEIGHT }}>
        {selected?.type === 'video' ? (
          <AutoPlayVideo uri={selected.uri} />
        ) : selected?.type === 'image' ? (
          <Image
            source={{ uri: selected.uri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : mediaLoading ? (
          <MediaSkeleton className="h-full w-full" />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name="paw-outline" size={48} color={BRAND.btnPrimary} />
          </View>
        )}
        <ListingMediaOverlayBadges post={post} />
        {expectedStripCount > 0 ? (
          <View className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1">
            <Text className="text-xs font-semibold text-white">
              {t('petFeed.detail.mediaCount', {
                current: Math.min(selectedIndex + 1, Math.max(expectedStripCount, 1)),
                total: expectedStripCount,
              })}
            </Text>
          </View>
        ) : null}
      </View>

      {showMediaStrip ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="border-b border-slate-100 bg-white"
          contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingVertical: 10 }}
        >
          {Array.from({ length: expectedStripCount }, (_, index) => {
            const item = mediaItems[index] ?? null;
            const active = Boolean(item) && index === selectedIndex;
            const poster =
              typeof post.metadata?.video_poster_url === 'string' ? post.metadata.video_poster_url.trim() : '';
            const thumbUri = item
              ? (item.type === 'image' ? item.uri : poster || post.media_urls[0] || '')
              : '';

            if (!item) {
              return (
                <View
                  key={`media-skeleton-${index}`}
                  className="h-14 w-14 overflow-hidden rounded-xl border border-slate-200"
                >
                  <MediaSkeleton className="h-full w-full" />
                </View>
              );
            }

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
                  accessibilityState={{ disabled: favoriteDisabled }}
                  disabled={favoriteDisabled}
                  className="shrink-0 flex-row items-center gap-1.5 py-1"
                  style={{ opacity: favoriteDisabled ? 0.45 : 1 }}
                  onPress={() => {
                    if (favoriteDisabled) return;
                    onToggleFavorite(post);
                  }}
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
          <Text className="text-sm leading-6 text-slate-600">
            <Text className="font-bold text-slate-900">{t('petFeed.detail.description')}: </Text>
            {post.description}
          </Text>
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
            <View className="mt-0.5 flex-row items-center gap-1">
              <Ionicons name="location-outline" size={12} color="#94A3B8" />
              <Text className="min-w-0 flex-1 text-xs text-slate-400" numberOfLines={1}>
                {breeder?.location || post.location || t('petFeed.locationUnknown')}
              </Text>
            </View>
          </View>
        </Pressable>

        <View
          className="rounded-xl border px-3.5 py-3"
          style={{
            borderColor: warranty ? '#BAE6FD' : BRAND.borderCard,
            backgroundColor: warranty ? '#F0F9FF' : BRAND.appBackground,
          }}
        >
          <View className="flex-row items-start justify-between gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('petFeed.detail.warrantyView')}
              className="min-w-0 flex-1 active:opacity-80"
              onPress={openWarrantyInfo}
            >
              <Text className="text-sm font-semibold text-slate-900">
                {`🛡️ ${warranty?.title || t('petFeed.detail.warrantyNone')}`}
              </Text>
              <Text className="mt-0.5 text-xs font-medium" style={{ color: warranty ? '#0369A1' : BRAND.textMuted }}>
                {warranty
                  ? t(warrantyFileHref ? 'farm.warranty.openFile' : 'petFeed.detail.warrantyView')
                  : t('petFeed.detail.warrantyNoneHint')}
              </Text>
            </Pressable>
            {showWarrantyUpdate ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('warranty.updateCta')}
                className="shrink-0 rounded-full border bg-white px-3 py-1.5 active:bg-slate-50"
                style={{ borderColor: warranty ? '#7DD3FC' : '#CBD5E1' }}
                onPress={onPressWarrantyUpdate}
              >
                <Text className="text-xs font-semibold" style={{ color: warranty ? '#0C4A6E' : '#334155' }}>
                  {t('warranty.updateCta')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

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
      <WarrantyPolicyViewer
        visible={policyOpen}
        policy={viewingPolicy}
        primarySpecies={breeder?.primary_species}
        onClose={() => setPolicyOpen(false)}
      />
    </View>
  );
}
