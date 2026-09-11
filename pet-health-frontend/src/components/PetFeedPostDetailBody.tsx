import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BRAND } from '../theme/brand';
import type { PetFeedPost } from '../types';
import { formatPetFeedPrice } from '../utils/petFeedCurrency';
import {
  LISTING_CARD_IMAGE_HEIGHT,
  listingBreederFooterMetrics,
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
import { listingDetailMediaSlideCount, listingMediaPagerIndex } from '../utils/petFeedPostDetail';
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

function AutoPlayVideo({ uri, playing }: { uri: string; playing: boolean }) {
  const player = useVideoPlayer({ uri }, (instance) => {
    instance.loop = true;
    instance.muted = true;
    if (playing) instance.play();
  });

  useEffect(() => {
    player.muted = true;
    if (playing) player.play();
    else player.pause();
  }, [playing, player]);

  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      style={{ height: '100%', width: '100%' }}
    />
  );
}

function HeroMediaSlide({
  item,
  active,
  mediaLoading,
}: {
  item: MediaItem | null;
  active: boolean;
  mediaLoading: boolean;
}) {
  if (!item) {
    if (mediaLoading) return <MediaSkeleton className="h-full w-full" />;
    return (
      <View className="h-full w-full items-center justify-center">
        <Ionicons name="paw-outline" size={48} color={BRAND.btnPrimary} />
      </View>
    );
  }
  if (item.type === 'video') {
    return (
      <View className="h-full w-full bg-black">
        <AutoPlayVideo uri={item.uri} playing={active} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: item.uri }}
      style={{ width: '100%', height: '100%' }}
      contentFit="cover"
      cachePolicy="memory-disk"
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
  showStatusButton?: boolean;
  onPressStatusUpdate?: () => void;
  isOwner?: boolean;
  onPressWarrantyUpdate?: () => void;
  onOpenFarm?: (profileId: string) => void;
};

export function PetFeedPostDetailBody({
  post,
  mediaLoading = false,
  onToggleFavorite,
  onEditPost,
  showFavorite = true,
  favoriteDisabled = false,
  showEditButton = false,
  showStatusButton = false,
  onPressStatusUpdate,
  isOwner = false,
  onPressWarrantyUpdate,
  onOpenFarm,
}: PetFeedPostDetailBodyProps) {
  const { t, i18n } = useTranslation();
  const pagerRef = useRef<ScrollView>(null);
  const selectedIndexRef = useRef(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pagerWidth, setPagerWidth] = useState(0);
  const [policyOpen, setPolicyOpen] = useState(false);
  const mediaItems = useMemo(() => mediaItemsForPost(post), [post]);
  const expectedStripCount = listingDetailMediaSlideCount(post);
  const slideCount = Math.max(expectedStripCount, mediaItems.length);
  const showMediaStrip = expectedStripCount > 1;
  selectedIndexRef.current = selectedIndex;

  const selectMediaIndex = useCallback((index: number, animated = true) => {
    setSelectedIndex(index);
    if (pagerWidth <= 0) return;
    pagerRef.current?.scrollTo({ x: index * pagerWidth, animated });
  }, [pagerWidth]);

  useEffect(() => {
    setSelectedIndex(0);
    pagerRef.current?.scrollTo({ x: 0, animated: false });
  }, [post.id]);

  useEffect(() => {
    if (pagerWidth <= 0) return;
    pagerRef.current?.scrollTo({ x: selectedIndexRef.current * pagerWidth, animated: false });
  }, [pagerWidth]);

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
  const breederFooterMetrics = listingBreederFooterMetrics(post, 0);
  const farmProfileId = (breeder?.id || post.breeder_profile_id || '').trim();
  const canOpenFarm = Boolean(isOwner && onOpenFarm && farmProfileId);

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
    || (showEditButton && onEditPost)
    || (showStatusButton && onPressStatusUpdate);

  const farmChipInner = (
    <>
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
        <View className="flex-row items-center gap-2">
          <Text className="min-w-0 flex-1 text-sm font-semibold text-slate-900" numberOfLines={1}>
            {breeder?.display_name ?? t('petFeed.breederFallback')}
          </Text>
          {breederFooterMetrics.ratingText ? (
            <Text className="shrink-0 text-[11px] font-medium text-slate-500">
              {`⭐ ${breederFooterMetrics.ratingText}`}
            </Text>
          ) : null}
        </View>
        <View className="mt-0.5 flex-row items-center gap-1">
          <Ionicons name="location-outline" size={12} color="#94A3B8" />
          <Text className="min-w-0 flex-1 text-xs text-slate-400" numberOfLines={1}>
            {breeder?.location || post.location || t('petFeed.locationUnknown')}
          </Text>
        </View>
      </View>
    </>
  );

  return (
    <View className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
      <View
        className="relative bg-slate-100"
        style={{ height: LISTING_CARD_IMAGE_HEIGHT }}
        onLayout={(event) => {
          const width = Math.round(event.nativeEvent.layout.width);
          if (width > 0 && width !== pagerWidth) setPagerWidth(width);
        }}
      >
        {slideCount > 0 && pagerWidth > 0 ? (
          <ScrollView
            ref={pagerRef}
            testID={`pet-feed-detail-media-pager-${post.id}`}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            directionalLockEnabled
            disableIntervalMomentum
            showsHorizontalScrollIndicator={false}
            scrollEnabled={slideCount > 1}
            keyboardShouldPersistTaps="handled"
            accessibilityRole="adjustable"
            accessibilityLabel={t('petFeed.accessibility.listingMedia', { title: post.title })}
            accessibilityHint={slideCount > 1 ? t('petFeed.accessibility.swipeListingMedia') : undefined}
            accessibilityActions={
              slideCount > 1
                ? [{ name: 'increment' }, { name: 'decrement' }]
                : undefined
            }
            onAccessibilityAction={(event) => {
              const action = event.nativeEvent.actionName;
              if (action === 'increment') {
                selectMediaIndex(Math.min(slideCount - 1, selectedIndex + 1));
              }
              if (action === 'decrement') {
                selectMediaIndex(Math.max(0, selectedIndex - 1));
              }
            }}
            style={{ height: LISTING_CARD_IMAGE_HEIGHT }}
            onScroll={(event) => {
              const next = listingMediaPagerIndex(
                event.nativeEvent.contentOffset.x,
                pagerWidth,
                slideCount,
              );
              if (next !== selectedIndex) setSelectedIndex(next);
            }}
            scrollEventThrottle={16}
          >
            {Array.from({ length: slideCount }, (_, index) => {
              const item = mediaItems[index] ?? null;
              return (
                <View
                  key={item ? `${item.type}-${item.uri}-${index}` : `media-slide-${index}`}
                  style={{ width: pagerWidth, height: LISTING_CARD_IMAGE_HEIGHT }}
                >
                  <HeroMediaSlide
                    item={item}
                    active={index === selectedIndex}
                    mediaLoading={mediaLoading}
                  />
                </View>
              );
            })}
          </ScrollView>
        ) : slideCount > 0 ? (
          <HeroMediaSlide
            item={mediaItems[Math.min(selectedIndex, Math.max(mediaItems.length - 1, 0))] ?? null}
            active
            mediaLoading={mediaLoading}
          />
        ) : mediaLoading ? (
          <MediaSkeleton className="h-full w-full" />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name="paw-outline" size={48} color={BRAND.btnPrimary} />
          </View>
        )}
        <View className="absolute inset-0" pointerEvents="none">
          <ListingMediaOverlayBadges post={post} />
        </View>
        {expectedStripCount > 0 ? (
          <View className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1" pointerEvents="none">
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
                onPress={() => selectMediaIndex(index)}
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
              {showStatusButton && onPressStatusUpdate ? (
                <Pressable
                  testID={`pet-feed-status-button-${post.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={t('listing.statusModal.open')}
                  className="shrink-0 flex-row items-center justify-center gap-1.5 rounded-xl border px-3 py-2"
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
              ) : (
                <View className="shrink-0" />
              )}
              <View className="shrink-0 flex-row items-center gap-3">
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
          <Text className="text-sm leading-6 text-slate-600">
            <Text className="font-bold text-slate-900">{t('petFeed.detail.description')}: </Text>
            {post.description}
          </Text>
        ) : null}

        {canOpenFarm ? (
          <Pressable
            accessibilityRole="button"
            className="flex-row items-center gap-3 rounded-xl bg-slate-50 p-3 active:bg-slate-100"
            onPress={() => onOpenFarm?.(farmProfileId)}
          >
            {farmChipInner}
          </Pressable>
        ) : (
          <View className="flex-row items-center gap-3 rounded-xl bg-slate-50 p-3">
            {farmChipInner}
          </View>
        )}

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
