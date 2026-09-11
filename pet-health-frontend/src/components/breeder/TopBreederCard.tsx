import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Linking, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DEFAULT_FARM_AVATAR, DEFAULT_FARM_COVER } from '../../assets/farmProfileAssets';
import {
  breederCardFooterMetrics,
  breederCardHasPetPreview,
  breederCardPetsPreviewTitleKey,
  type BreederActivityCue,
  type BreederCardSocialId,
  type BreederPetThumb,
} from '../../utils/breederDirectoryCard';
import { farmImageSource } from '../../utils/farmProfileDisplay';

const BORDER = '#F3E2C8';
const MUTED = '#6E5A51';
const INK = '#2B1E19';
const ACCENT = '#D97706';

export type TopBreederCardData = {
  name: string;
  location: string;
  specialtyLabel: string;
  coverUrl: string | null;
  avatarUrl: string | null;
  trustScore: number;
  rating: number | null;
  reviewCount: number;
  petsRehomed: number;
  showSold: boolean;
  activityKind: BreederActivityCue['kind'];
  petThumbs: BreederPetThumb[];
  socialLinks?: { id: BreederCardSocialId; href: string | null }[];
};

type TopBreederCardProps = {
  data: TopBreederCardData;
  showMessageButton: boolean;
  showEditProfileButton?: boolean;
  showVisitButton?: boolean;
  showReviewButton?: boolean;
  onPressVisit: () => void;
  onPressMessage?: () => void;
  onPressEditProfile?: () => void;
  onPressReview?: () => void;
  onPressPet?: (listingId: string) => void;
  accessibilityLabel?: string;
};

function SocialGlyph({ id }: { id: BreederCardSocialId }) {
  if (id === 'facebook') {
    return <Ionicons name="logo-facebook" size={16} color="#1877F2" />;
  }
  if (id === 'instagram') {
    return <Ionicons name="logo-instagram" size={16} color="#E4405F" />;
  }
  if (id === 'tiktok') {
    return <Ionicons name="logo-tiktok" size={15} color="#111827" />;
  }
  if (id === 'twitter') {
    return (
      <Text style={{ fontSize: 13, fontWeight: '800', color: '#111827', lineHeight: 16 }}>𝕏</Text>
    );
  }
  return (
    <View
      style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        backgroundColor: '#0068FF',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff', lineHeight: 12 }}>Z</Text>
    </View>
  );
}

export function TopBreederCard({
  data,
  showMessageButton,
  showEditProfileButton = false,
  showVisitButton = false,
  showReviewButton = false,
  onPressVisit,
  onPressMessage,
  onPressEditProfile,
  onPressReview,
  onPressPet,
  accessibilityLabel,
}: TopBreederCardProps) {
  const { t } = useTranslation();
  const showOnlineDot =
    data.activityKind === 'active_kennel' || data.activityKind === 'fast_response';
  const hasPets = breederCardHasPetPreview(data.petThumbs.length);
  const petsTitleKey = breederCardPetsPreviewTitleKey(data.petThumbs.length);
  const footerMetrics = breederCardFooterMetrics(data.rating, data.reviewCount, data.trustScore);
  const socialLinks = data.socialLinks ?? [];

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: BORDER,
        overflow: 'hidden',
      }}
    >
      <View style={{ height: 128, backgroundColor: 'rgba(255,251,235,0.5)' }}>
        <Image
          source={farmImageSource(data.coverUrl, DEFAULT_FARM_COVER)}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
        <Image
          source={farmImageSource(data.avatarUrl, DEFAULT_FARM_AVATAR)}
          style={{
            position: 'absolute',
            left: 16,
            bottom: -28,
            width: 56,
            height: 56,
            borderRadius: 28,
            borderWidth: 3,
            borderColor: '#fff',
            backgroundColor: '#fff',
          }}
          contentFit="cover"
        />
        <View
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            maxWidth: '52%',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: 'rgba(248,238,221,0.95)',
            borderWidth: 1,
            borderColor: BORDER,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '500', color: MUTED }} numberOfLines={1}>
            {data.specialtyLabel}
          </Text>
        </View>
      </View>

      <View style={{ paddingTop: 36, paddingHorizontal: 16, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <Text
              style={{ flexShrink: 1, fontSize: 18, fontWeight: '800', color: '#050505', letterSpacing: -0.3 }}
              numberOfLines={1}
            >
              {data.name}
            </Text>
            {showOnlineDot ? (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#10B981',
                  flexShrink: 0,
                }}
              />
            ) : null}
          </View>
          {footerMetrics.ratingText ? (
            <Text style={{ fontSize: 11, fontWeight: '500', color: '#475569', flexShrink: 0 }}>
              {`⭐ ${footerMetrics.ratingText}`}
            </Text>
          ) : null}
        </View>

        <View
          style={{
            marginTop: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            minWidth: 0,
          }}
        >
          <Text
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 13,
              color: '#6B7280',
            }}
            numberOfLines={1}
          >
            {`📍 ${data.location}`}
          </Text>
          <View
            style={{
              flexShrink: 0,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
              gap: 8,
              maxWidth: '58%',
            }}
          >
            {socialLinks.map((link) => {
              const openable = Boolean(link.href);
              const glyph = <SocialGlyph id={link.id} />;
              const label = t(`farm.facility.${link.id === 'twitter' ? 'twitter' : link.id}`);
              if (!openable) {
                return (
                  <View
                    key={link.id}
                    accessibilityLabel={label}
                    style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}
                  >
                    {glyph}
                  </View>
                );
              }
              return (
                <Pressable
                  key={link.id}
                  accessibilityRole="link"
                  accessibilityLabel={label}
                  hitSlop={4}
                  onPress={() => {
                    if (!link.href) return;
                    void Linking.openURL(link.href);
                  }}
                  style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}
                >
                  {glyph}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ marginTop: 16, minHeight: hasPets ? 44 : undefined }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: MUTED, marginBottom: hasPets ? 8 : 0 }}>
            {t(petsTitleKey, { n: data.petThumbs.length })}
          </Text>
          {hasPets ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {data.petThumbs.map((pet) => (
                <Pressable
                  key={pet.listingId}
                  accessibilityRole="button"
                  accessibilityLabel={pet.title}
                  onPress={() => onPressPet?.(pet.listingId)}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      overflow: 'hidden',
                      borderWidth: 2,
                      borderColor: '#fff',
                      backgroundColor: '#FDFBF7',
                      shadowColor: '#000',
                      shadowOpacity: 0.08,
                      shadowRadius: 2,
                      shadowOffset: { width: 0, height: 1 },
                      elevation: 1,
                    }}
                  >
                    <Image
                      source={{ uri: pet.mediaUrl }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {(showMessageButton || showEditProfileButton || showVisitButton || showReviewButton) ? (
          <View className="mt-5 w-full flex-row items-center gap-2">
          {showMessageButton ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('petFeed.breedersCard.message')}
              onPress={onPressMessage}
              className="flex-row items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5"
              style={{
                borderColor: BORDER,
                backgroundColor: '#fff',
                maxWidth: '48%',
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={15} color={INK} />
              <Text className="text-xs font-bold" style={{ color: INK }} numberOfLines={1}>
                {t('petFeed.breedersCard.message')}
              </Text>
            </Pressable>
          ) : showEditProfileButton ? (
            <Pressable
              testID="top-breeder-edit-profile-button"
              accessibilityRole="button"
              accessibilityLabel={t('farm.owner.editProfile')}
              onPress={onPressEditProfile}
              className="flex-row items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5"
              style={{
                borderColor: BORDER,
                backgroundColor: '#fff',
                maxWidth: '48%',
              }}
            >
              <Ionicons name="create-outline" size={15} color={INK} />
              <Text className="text-xs font-bold" style={{ color: INK }} numberOfLines={1}>
                {t('farm.owner.editProfile')}
              </Text>
            </Pressable>
          ) : null}
          {showVisitButton ? (
            <Pressable
              testID="top-breeder-visit-button"
              accessibilityRole="button"
              accessibilityLabel={t('petFeed.breedersCard.cta')}
              onPress={onPressVisit}
              className="min-w-0 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl px-3 py-2.5"
              style={{ backgroundColor: ACCENT }}
            >
              <Ionicons name="storefront-outline" size={15} color="#fff" />
              <Text className="min-w-0 shrink text-xs font-bold text-white" numberOfLines={1}>
                {t('petFeed.breedersCard.cta')}
              </Text>
            </Pressable>
          ) : showReviewButton ? (
            <Pressable
              testID="top-breeder-review-button"
              accessibilityRole="button"
              accessibilityLabel={t('petFeed.breedersCard.sendReview')}
              onPress={onPressReview}
              className="min-w-0 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl px-3 py-2.5"
              style={{ backgroundColor: ACCENT }}
            >
              <Ionicons name="star-outline" size={15} color="#fff" />
              <Text className="min-w-0 shrink text-xs font-bold text-white" numberOfLines={1}>
                {t('petFeed.breedersCard.sendReview')}
              </Text>
            </Pressable>
          ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
