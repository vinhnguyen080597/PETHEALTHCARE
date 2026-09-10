import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { ScrollView, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BRAND } from '../theme/brand';
import type { PetFeedPost } from '../types';
import { listingPreviewImages } from '../utils/marketplaceListingCard';

const THUMB_SIZE = 52;

export const LISTING_SIMILAR_THUMB_SIZE = THUMB_SIZE;
const OVERLAY_SCROLL_PAD = 176;

type PetFeedDetailSiblingListingsBarProps = {
  listings: PetFeedPost[];
  onPressListing: (postId: string) => void;
  paddingBottom?: number;
  /** Pill over the right edge of the thumb row; thumbs still scroll underneath. */
  overlay?: ReactNode;
};

export function PetFeedDetailSiblingListingsBar({
  listings,
  onPressListing,
  paddingBottom = 10,
  overlay = null,
}: PetFeedDetailSiblingListingsBarProps) {
  const { t } = useTranslation();
  const [overlayWidth, setOverlayWidth] = useState(OVERLAY_SCROLL_PAD);
  if (!listings.length) return null;

  return (
    <View
      className="w-full border-t bg-white px-4 pt-3"
      style={{
        alignSelf: 'stretch',
        borderTopColor: BRAND.borderLight,
        paddingBottom,
      }}
    >
      <Text
        className="text-[13px] font-semibold text-slate-800"
        style={{ marginBottom: 12 }}
      >
        {t('petFeed.detail.similarListings')}
      </Text>
      <View className="relative">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: 10,
            paddingRight: overlay ? overlayWidth : 2,
          }}
        >
          {listings.map((post) => {
            const thumb = listingPreviewImages(post)[0] ?? null;
            return (
              <Pressable
                key={post.id}
                testID={`pet-feed-similar-listing-${post.id}`}
                accessibilityRole="button"
                accessibilityLabel={t('petFeed.accessibility.openListing', { title: post.title })}
                onPress={() => onPressListing(post.id)}
                className="active:opacity-80"
              >
                <View
                  className="overflow-hidden bg-slate-100"
                  style={{
                    width: THUMB_SIZE,
                    height: THUMB_SIZE,
                    borderRadius: THUMB_SIZE / 2,
                    borderWidth: 1.5,
                    borderColor: BRAND.borderCard,
                  }}
                >
                  {thumb ? (
                    <Image
                      source={{ uri: thumb }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center bg-slate-100" />
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        {overlay ? (
          <View
            pointerEvents="box-none"
            className="absolute inset-y-0 right-0 flex-row items-center"
            onLayout={(event) => {
              const next = Math.ceil(event.nativeEvent.layout.width);
              if (next > 0 && next !== overlayWidth) setOverlayWidth(next);
            }}
          >
            <View
              pointerEvents="none"
              style={{
                width: 28,
                height: THUMB_SIZE,
                backgroundColor: 'rgba(255,255,255,0.72)',
              }}
            />
            <View className="bg-white">
              {overlay}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
