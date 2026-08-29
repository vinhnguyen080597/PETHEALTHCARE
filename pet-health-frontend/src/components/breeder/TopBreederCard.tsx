import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DEFAULT_FARM_AVATAR, DEFAULT_FARM_COVER } from '../../assets/farmProfileAssets';
import {
  breederCardFooterMetrics,
  breederCardHasPetPreview,
  breederCardPetsPreviewTitleKey,
  shortPetPriceLabel,
  type BreederActivityCue,
  type BreederPetThumb,
} from '../../utils/breederDirectoryCard';
import { farmImageSource } from '../../utils/farmProfileDisplay';
import { listingSpeciesEmoji } from '../../utils/marketplaceListingCard';

const BORDER = '#F3E2C8';
const MUTED = '#6E5A51';
const INK = '#2B1E19';
const ACCENT = '#D97706';
const ACCENT_DEEP = '#B45309';
const PRICE = '#9A3412';

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
};

type TopBreederCardProps = {
  data: TopBreederCardData;
  showMessageButton: boolean;
  showEditProfileButton?: boolean;
  onPressVisit: () => void;
  onPressMessage?: () => void;
  onPressEditProfile?: () => void;
  onPressPet?: (listingId: string) => void;
  accessibilityLabel?: string;
};

function ActivityChip({ kind }: { kind: BreederActivityCue['kind'] }) {
  const { t } = useTranslation();
  if (kind === 'none') return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      {kind === 'fast_response' ? (
        <Text style={{ fontSize: 10 }}>⚡</Text>
      ) : (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#10B981',
          }}
        />
      )}
      <Text style={{ fontSize: 10, fontWeight: '700', color: INK }}>
        {kind === 'fast_response'
          ? t('petFeed.breedersCard.fastResponse')
          : t('petFeed.breedersCard.activeKennel')}
      </Text>
    </View>
  );
}

export function TopBreederCard({
  data,
  showMessageButton,
  showEditProfileButton = false,
  onPressVisit,
  onPressMessage,
  onPressEditProfile,
  onPressPet,
  accessibilityLabel,
}: TopBreederCardProps) {
  const { t } = useTranslation();
  const showOnlineDot =
    data.activityKind === 'active_kennel' || data.activityKind === 'fast_response';
  const hasPets = breederCardHasPetPreview(data.petThumbs.length);
  const petsTitleKey = breederCardPetsPreviewTitleKey(data.petThumbs.length);
  const footerMetrics = breederCardFooterMetrics(data.rating, data.reviewCount, data.trustScore);

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
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 48,
            backgroundColor: 'rgba(43,30,25,0.28)',
          }}
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
        <ActivityChip kind={data.activityKind} />
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {footerMetrics.ratingText ? (
              <Text style={{ fontSize: 11, fontWeight: '500', color: '#475569' }}>
                {`⭐ ${footerMetrics.ratingText}`}
              </Text>
            ) : null}
            <Text style={{ fontSize: 11, fontWeight: '500', color: '#475569' }}>
              {`🛡️ ${footerMetrics.trustScore}/100`}
            </Text>
          </View>
        </View>

        <Text style={{ marginTop: 4, fontSize: 14, color: '#6B7280' }} numberOfLines={1}>
          {`📍 ${data.location}`}
        </Text>

        <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap' }}>
          <View
            style={{
              maxWidth: '100%',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: '#F8EEDD',
              borderWidth: 1,
              borderColor: BORDER,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '500', color: MUTED }} numberOfLines={1}>
              {data.specialtyLabel}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 16, minHeight: hasPets ? 84 : undefined }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: MUTED, marginBottom: hasPets ? 8 : 0 }}>
            {t(petsTitleKey, { n: data.petThumbs.length })}
          </Text>
          {hasPets ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {data.petThumbs.map((pet) => {
                const price = shortPetPriceLabel(pet.price);
                const emoji = listingSpeciesEmoji(pet.species);
                return (
                  <Pressable
                    key={pet.listingId}
                    accessibilityRole="button"
                    onPress={() => onPressPet?.(pet.listingId)}
                    style={{ width: 68, alignItems: 'center', gap: 4 }}
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
                    {price ? (
                      <Text
                        style={{ fontSize: 10, fontWeight: '700', color: PRICE }}
                        numberOfLines={1}
                      >
                        {`${emoji} ${price}`}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: 20, flexDirection: 'row', gap: 8 }}>
          {showMessageButton ? (
            <Pressable
              accessibilityRole="button"
              onPress={onPressMessage}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: BORDER,
                backgroundColor: pressed ? '#FDFBF7' : '#fff',
                paddingVertical: 10,
              })}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={15} color={INK} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: INK }}>
                {t('petFeed.breedersCard.message')}
              </Text>
            </Pressable>
          ) : showEditProfileButton ? (
            <Pressable
              testID="top-breeder-edit-profile-button"
              accessibilityRole="button"
              accessibilityLabel={t('farm.owner.editProfile')}
              onPress={onPressEditProfile}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: BORDER,
                backgroundColor: pressed ? '#FDFBF7' : '#fff',
                paddingVertical: 10,
              })}
            >
              <Ionicons name="create-outline" size={15} color={INK} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: INK }}>
                {t('farm.owner.editProfile')}
              </Text>
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            onPress={onPressVisit}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              borderRadius: 12,
              backgroundColor: pressed ? ACCENT_DEEP : ACCENT,
              paddingVertical: 10,
            })}
          >
            <Ionicons name="storefront-outline" size={15} color="#fff" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>
              {t('petFeed.breedersCard.cta')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
