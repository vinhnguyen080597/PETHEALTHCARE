import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, type ReactNode } from 'react';
import { Pressable, Text, View, type GestureResponderEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BRAND } from '../theme/brand';
import type { PetFeedPost } from '../types';
import { computeBreederTrust } from '../utils/breederTrust';
import { formatPetFeedPrice } from '../utils/petFeedCurrency';
import {
  fillTemplate,
  listingAvailability,
  listingBreederFooterMetrics,
  listingEscrowDepositLabel,
  listingHotBadges,
  listingMetadataMarksCancelled,
  listingMetadataMarksSold,
  listingPreviewImages,
  listingSpeciesEmoji,
  listingTrustTags,
  parseListingEscrowEnabled,
  type ListingHotBadge,
  type ListingTrustTag,
} from '../utils/marketplaceListingCard';
import { resolvePostGender } from '../utils/petFeedGender';

type PetFeedListingCardProps = {
  post: PetFeedPost;
  onToggleFavorite?: (post: PetFeedPost) => void;
  onMessageBreeder?: (post: PetFeedPost) => void;
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
  return (
    <View
      className="self-start rounded-full px-2.5 py-1"
      style={{
        backgroundColor: style?.backgroundColor ?? 'rgba(255,255,255,0.95)',
        borderWidth: style?.borderColor ? 1 : 0,
        borderColor: style?.borderColor,
      }}
    >
      <Text className="text-[10px] font-semibold" style={{ color: style?.color ?? BRAND.textPrimary }}>
        {children}
      </Text>
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
  return (
    <OverlayPill style={{ backgroundColor: 'rgba(15,23,42,0.85)', color: BRAND.textInverse }}>
      {`🎬 ${t('petFeed.card.video')}`}
    </OverlayPill>
  );
}

function TrustTag({ tag, t }: { tag: ListingTrustTag; t: (key: string, opts?: object) => string }) {
  if (tag.kind === 'warranty') {
    return (
      <View className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1">
        <Text className="text-[11px] font-medium text-emerald-800">
          {`🛡️ ${fillTemplate(t('petFeed.card.warranty'), tag.days)}`}
        </Text>
      </View>
    );
  }
  if (tag.kind === 'escrow') {
    return (
      <View className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1">
        <Text className="text-[11px] font-medium text-amber-900">{`🔒 ${t('petFeed.card.escrow')}`}</Text>
      </View>
    );
  }
  return (
    <View className="rounded-full border px-2 py-1" style={{ borderColor: BRAND.borderBrand, backgroundColor: BRAND.surface }}>
      <Text className="text-[11px] text-slate-700">{`💉 ${tag.label}`}</Text>
    </View>
  );
}

function PetFeedListingCardComponent({
  post,
  onToggleFavorite,
  onMessageBreeder,
  currentUserId = null,
  showFavorite = true,
  showContact = true,
  showEscrowUi = false,
  onPress,
  testID,
}: PetFeedListingCardProps) {
  const { t, i18n } = useTranslation();
  const breeder = post.breeder_profile;
  const isOwnPost = Boolean(currentUserId && post.user_id === currentUserId);
  const canShowFavorite = showFavorite && Boolean(onToggleFavorite);
  const canShowContact = showContact && !isOwnPost && Boolean(onMessageBreeder);
  const showActions = canShowFavorite || canShowContact;

  const speciesKey = `breederProfile.speciesOptions.${post.species.trim().toLowerCase()}`;
  const speciesTranslated = post.species ? t(speciesKey) : '';
  const speciesLabel = speciesTranslated === speciesKey ? post.species : speciesTranslated;
  const priceLabel = formatPetFeedPrice(post.price_note, i18n.language);
  const depositLabel = showEscrowUi && parseListingEscrowEnabled(post.metadata ?? {})
    ? listingEscrowDepositLabel(post.price_note, i18n.language)
    : null;
  const previewImage = listingPreviewImages(post)[0] ?? null;
  const hotBadges = listingHotBadges(post);
  const trustTags = listingTrustTags(post, { showEscrowTag: showEscrowUi });
  const meta = post.metadata ?? {};
  const isCancelled = post.status === 'cancelled' || listingMetadataMarksCancelled(meta);
  const isSold = post.status === 'sold' || listingMetadataMarksSold(meta);
  const availability = listingAvailability(post);
  const trustScore = breeder ? computeBreederTrust(breeder, [post]).score : 0;
  const breederFooterMetrics = listingBreederFooterMetrics(post, trustScore);

  const gender = resolvePostGender(post.gender);
  const genderEmoji = gender === 'male' ? '♂️' : gender === 'female' ? '♀️' : '';
  const ageGender = [
    genderEmoji,
    post.age_months != null && post.age_months > 0
      ? t('petFeed.ageMonths', { count: post.age_months })
      : '',
    !genderEmoji && post.gender ? post.gender : '',
  ].filter(Boolean).join(' ');

  function stopPress(event: GestureResponderEvent) {
    event.stopPropagation?.();
  }

  const body = (
    <>
      <View className="relative h-48 overflow-hidden" style={{ backgroundColor: BRAND.surfaceLight }}>
        {previewImage ? (
          <Image source={{ uri: previewImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name="paw-outline" size={42} color={BRAND.btnPrimary} />
          </View>
        )}
        <View className="absolute left-3 top-3 max-w-[75%] gap-1.5">
          <OverlayPill style={{ borderColor: `${BRAND.borderBrand}CC` }}>
            {`${listingSpeciesEmoji(post.species)} ${speciesLabel}`}
          </OverlayPill>
          {hotBadges.map((badge) => (
            <HotBadge key={badge.kind} badge={badge} t={t} />
          ))}
          {availability === 'deposit_hold' ? (
            <OverlayPill style={{ backgroundColor: 'rgba(245,158,11,0.95)', color: BRAND.textInverse }}>
              {showEscrowUi ? t('petFeed.card.depositHold') : t('petFeed.card.reserved')}
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
        </View>
      </View>

      <View className="p-4">
        <Text className="text-sm font-semibold leading-snug text-slate-900" numberOfLines={2}>
          {post.title}
        </Text>

        {priceLabel ? (
          <View className="mt-2 flex-row flex-wrap items-center">
            <Text className="text-base font-bold" style={{ color: BRAND.btnPrimary }}>
              {priceLabel}
            </Text>
            {depositLabel ? (
              <Text className="ml-1.5 text-xs font-medium text-slate-400">{depositLabel}</Text>
            ) : null}
          </View>
        ) : null}

        {trustTags.length ? (
          <View className="mt-2.5 flex-row flex-wrap gap-1.5">
            {trustTags.map((tag) => (
              <TrustTag key={tag.kind === 'vaccine' ? `vac-${tag.label}` : tag.kind} tag={tag} t={t} />
            ))}
          </View>
        ) : (
          <View className="mt-2.5 flex-row flex-wrap gap-1.5">
            {post.location ? (
              <View className="rounded-full border px-2 py-1" style={{ borderColor: BRAND.borderBrand, backgroundColor: BRAND.surface }}>
                <Text className="text-[11px] text-slate-700">{`📍 ${post.location}`}</Text>
              </View>
            ) : null}
            {ageGender ? (
              <View className="rounded-full border px-2 py-1" style={{ borderColor: BRAND.borderBrand, backgroundColor: BRAND.surface }}>
                <Text className="text-[11px] text-slate-700">{ageGender}</Text>
              </View>
            ) : null}
          </View>
        )}

        <View className="mt-2.5 flex-row items-center gap-2 border-t pt-2" style={{ borderTopColor: `${BRAND.borderBrand}CC` }}>
          {breeder?.avatar_url ? (
            <Image source={{ uri: breeder.avatar_url }} style={{ width: 24, height: 24, borderRadius: 12 }} contentFit="cover" />
          ) : (
            <View className="h-6 w-6 items-center justify-center rounded-full bg-slate-100">
              <Ionicons name="person-outline" size={14} color={BRAND.textMuted} />
            </View>
          )}
          <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
            {breeder?.verification_status === 'verified' ? (
              <View className="h-1.5 w-1.5 rounded-full bg-emerald-500" accessibilityLabel={t('petFeed.card.onlineTrust')} />
            ) : null}
            <Text className="min-w-0 flex-1 text-xs font-medium text-slate-900" numberOfLines={1}>
              {breeder?.display_name ?? t('petFeed.breederFallback')}
            </Text>
            {breeder?.verification_status === 'verified' ? (
              <View className="flex-row items-center gap-0.5">
                <Ionicons name="shield-checkmark" size={12} color="#059669" />
                <Text className="text-[10px] font-semibold text-emerald-700">{t('petFeed.topBreeders.verified')}</Text>
              </View>
            ) : null}
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
