import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, type ReactNode } from 'react';
import { Pressable, Text, View, type GestureResponderEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BRAND } from '../theme/brand';
import { DEFAULT_FARM_AVATAR } from '../assets/farmProfileAssets';
import type { PetFeedPost } from '../types';
import { computeBreederTrust } from '../utils/breederTrust';
import { farmImageSource, resolveFarmAvatarUrl } from '../utils/farmProfileDisplay';
import { formatPetFeedPrice } from '../utils/petFeedCurrency';
import {
  listingAvailabilityBadgeKey,
  listingAvailabilityBadgeLabelKey,
} from '../utils/listingAvailabilityBadge';
import {
  fillTemplate,
  listingAvailability,
  isOwnListingPost,
  LISTING_CARD_IMAGE_HEIGHT,
  listingBreederFooterMetrics,
  listingCardShowsEditAction,
  listingHotBadges,
  formatListingCardPostedDate,
  listingMetadataMarksCancelled,
  listingMetadataMarksSold,
  listingPreviewImages,
  listingSpeciesEmoji,
  type ListingHotBadge,
} from '../utils/marketplaceListingCard';

const LISTING_POSTED_DATE_PILL = {
  backgroundColor: 'rgba(51,65,85,0.88)',
  color: 'rgba(248,250,252,0.95)',
} as const;

type PetFeedListingCardProps = {
  post: PetFeedPost;
  onToggleFavorite?: (post: PetFeedPost) => void;
  onMessageBreeder?: (post: PetFeedPost) => void;
  onEditPost?: (post: PetFeedPost) => void;
  currentUserId?: string | null;
  showFavorite?: boolean;
  showContact?: boolean;
  showEscrowUi?: boolean;
  onPress?: (post: PetFeedPost) => void;
  testID?: string;
};

function OverlayPill({
  children,
  style,
}: {
  children: ReactNode;
  style?: { backgroundColor: string; color?: string; borderColor?: string };
}) {
  const textColor = style?.color ?? BRAND.textPrimary;
  return (
    <View
      className="self-start rounded-full px-2.5 py-1"
      style={{
        backgroundColor: style?.backgroundColor ?? 'rgba(255,255,255,0.95)',
        borderWidth: style?.borderColor ? 1 : 0,
        borderColor: style?.borderColor,
      }}
    >
      {typeof children === 'string' ? (
        <Text className="text-[10px] font-semibold" style={{ color: textColor }}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

function HotBadge({ badge, t }: { badge: ListingHotBadge; t: (key: string, opts?: object) => string }) {
  if (badge.kind === 'saves') {
    return (
      <OverlayPill style={{ backgroundColor: 'rgba(234,88,12,0.95)', color: BRAND.textInverse }}>
        {`🔥 ${fillTemplate(t('petFeed.card.saves'), badge.count)}`}
      </OverlayPill>
    );
  }
  if (badge.kind === 'new') {
    return (
      <OverlayPill style={{ backgroundColor: 'rgba(251,191,36,0.95)', color: '#78350F' }}>
        {`✨ ${t('petFeed.card.new')}`}
      </OverlayPill>
    );
  }
  return null;
}

function PetFeedListingCardComponent({
  post,
  onToggleFavorite,
  onMessageBreeder,
  onEditPost,
  currentUserId = null,
  showFavorite = true,
  showContact = true,
  showEscrowUi: _showEscrowUi = false,
  onPress,
  testID,
}: PetFeedListingCardProps) {
  const { t, i18n } = useTranslation();
  const breeder = post.breeder_profile;
  const isOwnPost = isOwnListingPost(currentUserId, post);
  const canShowFavorite = showFavorite && Boolean(onToggleFavorite);
  const canShowContact = showContact && !isOwnPost && Boolean(onMessageBreeder);
  const canShowEdit = listingCardShowsEditAction(isOwnPost, Boolean(onEditPost));
  const showActions = canShowFavorite || canShowContact || canShowEdit;

  const speciesKey = `breederProfile.speciesOptions.${post.species.trim().toLowerCase()}`;
  const speciesTranslated = post.species ? t(speciesKey) : '';
  const speciesLabel = speciesTranslated === speciesKey ? post.species : speciesTranslated;
  const priceLabel = formatPetFeedPrice(post.price_note, i18n.language);
  const previewImage = listingPreviewImages(post)[0] ?? null;
  const hotBadges = listingHotBadges(post);
  const postedDateLabel = formatListingCardPostedDate(post.created_at, i18n.language);
  const meta = post.metadata ?? {};
  const isCancelled = post.status === 'cancelled' || listingMetadataMarksCancelled(meta);
  const isSold = post.status === 'sold' || listingMetadataMarksSold(meta);
  const availability = listingAvailability(post);
  const availabilityBadgeKey = listingAvailabilityBadgeLabelKey(
    listingAvailabilityBadgeKey(post.status),
  );
  const trustScore = breeder ? computeBreederTrust(breeder, [post]).score : 0;
  const breederFooterMetrics = listingBreederFooterMetrics(post, trustScore);
  const breederAvatarUrl = breeder ? resolveFarmAvatarUrl(breeder) : null;
  const locationLabel = post.location?.trim() ?? '';

  function stopPress(event: GestureResponderEvent) {
    event.stopPropagation?.();
  }

  const body = (
    <>
      <View
        className="relative w-full overflow-hidden bg-slate-100"
        style={{ height: LISTING_CARD_IMAGE_HEIGHT }}
      >
        {previewImage ? (
          <Image source={{ uri: previewImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name="paw-outline" size={42} color={BRAND.btnPrimary} />
          </View>
        )}
        {availabilityBadgeKey ? (
          <View className="absolute right-3 top-3">
            <OverlayPill style={{ backgroundColor: 'rgba(217,119,6,0.95)', color: BRAND.textInverse }}>
              {t(availabilityBadgeKey)}
            </OverlayPill>
          </View>
        ) : null}
        <View className="absolute left-3 top-3 max-w-[75%] gap-1.5">
          <OverlayPill style={{ borderColor: `${BRAND.borderBrand}CC` }}>
            {`${listingSpeciesEmoji(post.species)} ${speciesLabel}`}
          </OverlayPill>
          {hotBadges.map((badge) => (
            <HotBadge key={badge.kind} badge={badge} t={t} />
          ))}
          {availability === 'deposit_hold' ? (
            <OverlayPill style={{ backgroundColor: 'rgba(245,158,11,0.95)', color: BRAND.textInverse }}>
              {_showEscrowUi ? t('petFeed.card.depositHold') : t('petFeed.card.reserved')}
            </OverlayPill>
          ) : null}
          {post.status === 'pending_review' ? (
            <OverlayPill style={{ backgroundColor: 'rgba(245,158,11,0.95)', color: BRAND.textInverse }}>
              {t('petFeed.card.pendingReview')}
            </OverlayPill>
          ) : null}
          {isSold && !isCancelled ? (
            <OverlayPill style={{ backgroundColor: 'rgba(15,23,42,0.85)', color: BRAND.textInverse }}>
              {t('petFeed.card.sold')}
            </OverlayPill>
          ) : null}
          {isCancelled ? (
            <OverlayPill style={{ backgroundColor: 'rgba(190,18,60,0.9)', color: BRAND.textInverse }}>
              {t('petFeed.card.cancelled')}
            </OverlayPill>
          ) : null}
          {postedDateLabel ? (
            <OverlayPill style={LISTING_POSTED_DATE_PILL}>
              <View className="flex-row items-center gap-1">
                <Ionicons name="calendar-outline" size={11} color={LISTING_POSTED_DATE_PILL.color} />
                <Text className="text-[10px] font-semibold" style={{ color: LISTING_POSTED_DATE_PILL.color }}>
                  {postedDateLabel}
                </Text>
              </View>
            </OverlayPill>
          ) : null}
        </View>
      </View>

      <View className="p-4">
        <Text className="text-sm font-semibold leading-snug text-slate-900" numberOfLines={2}>
          {post.title}
        </Text>

        {locationLabel || priceLabel ? (
          <View className="mt-2 flex-row items-center gap-2">
            {locationLabel ? (
              <Text className="min-w-0 flex-1 text-xs text-slate-600" numberOfLines={1}>
                {`📍 ${locationLabel}`}
              </Text>
            ) : (
              <View className="min-w-0 flex-1" />
            )}
            {priceLabel ? (
              <Text className="shrink-0 text-sm font-bold" style={{ color: BRAND.btnPrimary }}>
                {priceLabel}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View className="mt-2.5 flex-row items-center gap-2 border-t pt-2" style={{ borderTopColor: `${BRAND.borderBrand}CC` }}>
          <Image
            source={farmImageSource(breederAvatarUrl, DEFAULT_FARM_AVATAR)}
            style={{ width: 24, height: 24, borderRadius: 12 }}
            contentFit="cover"
            accessibilityLabel={breeder?.display_name ?? t('petFeed.breederFallback')}
          />
          <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
            {breeder?.verification_status === 'verified' ? (
              <View className="h-1.5 w-1.5 rounded-full bg-emerald-500" accessibilityLabel={t('petFeed.card.onlineTrust')} />
            ) : null}
            <Text className="min-w-0 flex-1 text-xs font-medium text-slate-900" numberOfLines={1}>
              {breeder?.display_name ?? t('petFeed.breederFallback')}
            </Text>
          </View>
          <View className="shrink-0 flex-row items-center gap-2">
            {breederFooterMetrics.ratingText ? (
              <Text className="text-[11px] font-medium text-slate-600" testID={`pet-feed-listing-rating-${post.id}`}>
                {`⭐ ${breederFooterMetrics.ratingText}`}
              </Text>
            ) : null}
            <Text className="text-[11px] font-medium text-slate-600" testID={`pet-feed-listing-trust-${post.id}`}>
              {`🛡️ ${breederFooterMetrics.trustScore}/100`}
            </Text>
          </View>
        </View>

        {showActions ? (
          <View className="mt-3 flex-row items-center gap-2">
            {canShowFavorite ? (
              <Pressable
                testID={`pet-feed-favorite-button-${post.id}`}
                accessibilityRole="button"
                accessibilityLabel={post.is_favorited ? t('petFeed.accessibility.unsaveListing') : t('petFeed.accessibility.saveListing')}
                accessibilityState={{ selected: post.is_favorited }}
                className="flex-row items-center gap-1 rounded-xl border px-2.5 py-2"
                style={{
                  borderColor: post.is_favorited ? '#FECDD3' : BRAND.borderBrand,
                  backgroundColor: post.is_favorited ? '#FFF1F2' : BRAND.card,
                }}
                onPress={(event) => {
                  stopPress(event);
                  onToggleFavorite?.(post);
                }}
              >
                <Text className="text-xs font-semibold" style={{ color: post.is_favorited ? '#E11D48' : '#6E5A51' }}>
                  {post.is_favorited ? '♥' : '♡'}
                </Text>
                <Text className="text-xs font-semibold" style={{ color: post.is_favorited ? '#E11D48' : '#6E5A51' }}>
                  {post.favorite_count ?? 0}
                </Text>
              </Pressable>
            ) : null}
            {canShowEdit ? (
              <Pressable
                testID={`pet-feed-edit-button-${post.id}`}
                accessibilityRole="button"
                accessibilityLabel={t('petFeed.accessibility.editListing', { title: post.title })}
                className="min-w-0 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl px-3 py-2"
                style={{ backgroundColor: BRAND.btnPrimary }}
                onPress={(event) => {
                  stopPress(event);
                  onEditPost?.(post);
                }}
              >
                <Ionicons name="create-outline" size={15} color={BRAND.textInverse} />
                <Text className="text-xs font-semibold text-white">{t('petFeed.editListing')}</Text>
              </Pressable>
            ) : null}
            {canShowContact ? (
              <Pressable
                testID={`pet-feed-message-button-${post.id}`}
                accessibilityRole="button"
                accessibilityLabel={t('petFeed.accessibility.messageBreeder', { title: post.title })}
                className="min-w-0 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl px-3 py-2"
                style={{ backgroundColor: BRAND.btnPrimary }}
                onPress={(event) => {
                  stopPress(event);
                  onMessageBreeder?.(post);
                }}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={15} color={BRAND.textInverse} />
                <Text className="text-xs font-semibold text-white">{t('petFeed.card.chat')}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID ?? `pet-feed-post-${post.id}`}
        accessibilityRole="button"
        accessibilityLabel={t('petFeed.accessibility.openListing', { title: post.title })}
        className="overflow-hidden rounded-2xl bg-white active:opacity-95"
        style={{ borderWidth: 1, borderColor: BRAND.borderBrand }}
        onPress={() => onPress(post)}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View
      testID={testID ?? `pet-feed-post-${post.id}`}
      className="overflow-hidden rounded-2xl bg-white"
      style={{ borderWidth: 1, borderColor: BRAND.borderBrand }}
    >
      {body}
    </View>
  );
}

export const PetFeedListingCard = memo(PetFeedListingCardComponent);
