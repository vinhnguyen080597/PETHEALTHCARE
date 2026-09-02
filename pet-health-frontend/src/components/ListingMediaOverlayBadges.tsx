import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BRAND } from '../theme/brand';
import type { PetFeedPost } from '../types';
import {
  listingOverlayStatusLabelKey,
} from '../utils/listingAvailabilityBadge';
import {
  fillTemplate,
  formatListingCardPostedDate,
  listingHotBadges,
  listingMetadataMarksCancelled,
  listingMetadataMarksSold,
  listingSpeciesEmoji,
  type ListingHotBadge,
} from '../utils/marketplaceListingCard';

const LISTING_POSTED_DATE_PILL = {
  backgroundColor: 'rgba(51,65,85,0.88)',
  color: 'rgba(248,250,252,0.95)',
} as const;

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

type ListingMediaOverlayBadgesProps = {
  post: PetFeedPost;
};

export function ListingMediaOverlayBadges({
  post,
}: ListingMediaOverlayBadgesProps) {
  const { t, i18n } = useTranslation();
  const speciesKey = `breederProfile.speciesOptions.${post.species.trim().toLowerCase()}`;
  const speciesTranslated = post.species ? t(speciesKey) : '';
  const speciesLabel = speciesTranslated === speciesKey ? post.species : speciesTranslated;
  const hotBadges = listingHotBadges(post);
  const postedDateLabel = formatListingCardPostedDate(post.created_at, i18n.language);
  const meta = post.metadata ?? {};
  const isCancelled = post.status === 'cancelled' || listingMetadataMarksCancelled(meta);
  const isSold = post.status === 'sold' || listingMetadataMarksSold(meta);
  const statusLabelKey = listingOverlayStatusLabelKey({
    status: post.status,
    isSold,
    isCancelled,
  });
  const statusPillStyle =
    statusLabelKey === 'petFeed.card.sold'
      ? { backgroundColor: 'rgba(15,23,42,0.85)', color: BRAND.textInverse }
      : statusLabelKey === 'listing.availability.available'
        ? { backgroundColor: 'rgba(5,150,105,0.95)', color: BRAND.textInverse }
        : { backgroundColor: 'rgba(217,119,6,0.95)', color: BRAND.textInverse };

  return (
    <>
      {statusLabelKey ? (
        <View className="absolute right-3 top-3 z-10">
          <OverlayPill style={statusPillStyle}>
            {t(statusLabelKey)}
          </OverlayPill>
        </View>
      ) : null}
      <View className="absolute left-3 top-3 z-10 max-w-[75%] gap-1.5">
        {speciesLabel ? (
          <OverlayPill style={{ borderColor: `${BRAND.borderBrand}CC` }}>
            {`${listingSpeciesEmoji(post.species)} ${speciesLabel}`}
          </OverlayPill>
        ) : null}
        {hotBadges.map((badge) => (
          <HotBadge key={badge.kind} badge={badge} t={t} />
        ))}
        {post.status === 'pending_review' ? (
          <OverlayPill style={{ backgroundColor: 'rgba(245,158,11,0.95)', color: BRAND.textInverse }}>
            {t('petFeed.card.pendingReview')}
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
    </>
  );
}
