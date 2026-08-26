import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { PetFeedListingCard } from '../components/PetFeedListingCard';
import { ReportModal } from '../components/ReportModal';
import { TrustLevelChip } from '../components/breeder/TrustLevelChip';
import { TrustTicksGauge } from '../components/breeder/TrustTicksGauge';
import { type PetFeedReportReason } from '../constants/petFeedReportReasons';
import type { BreederProfile, PetFeedPost } from '../types';
import { DEFAULT_FARM_AVATAR, DEFAULT_FARM_COVER } from '../assets/farmProfileAssets';
import { BRAND } from '../theme/brand';
import { effectiveTrustScore } from '../utils/breederQualityIndex';
import { trustLevelFromScore } from '../utils/breederTrustLevel';
import {
  farmFacilityHasContent,
  farmFacilitySocialLinks,
  publicFacilityVideoUrl,
} from '../utils/farmFacility';
import {
  countFarmPetsByAvailability,
  countFarmPetsRehomed,
  farmPetTabCount,
  filterFarmPetsByAvailability,
  type FarmPetAvailability,
  type FarmPetAvailabilityFilter,
} from '../utils/farmPets';
import {
  farmPhotoPickerAspect,
  farmPhotoResizeWidth,
  type FarmPhotoKind,
} from '../utils/farmPhotos';
import {
  FARM_DETAIL_TABS,
  farmImageSource,
  farmTabLabelKey,
  farmWarrantyPoliciesFromMetadata,
  resolveFarmAvatarUrl,
  resolveFarmCoverUrl,
  type FarmDetailTab,
} from '../utils/farmProfileDisplay';
import {
  farmTransparencyMeaning,
  farmTrustLevelChipLabel,
} from '../utils/farmTrustDisplay';

const FARM_BG = '#FDFBF7';
const FARM_BORDER = '#F3E2C8';
const FARM_TEXT = '#2B1E19';
const FARM_MUTED = '#6E5A51';
const FARM_ACCENT = '#D97706';
const FARM_ACCENT_ACTIVE = '#B45309';

type BreederDetailScreenProps = {
  profile: BreederProfile;
  posts: PetFeedPost[];
  onBack: () => void;
  onReportBreeder: (profile: BreederProfile, reason: string, note?: string) => void;
  onHideBreeder: (profile: BreederProfile) => void;
  onOpenPostDetail: (postId: string) => void;
  onOpenFarmHealth?: () => void;
  onOpenTemplatePicker?: () => void;
  onOpenBreederProfile?: () => void;
  onOpenCreatePetFeedPost?: () => void;
  onMessageFarm?: (profile: BreederProfile) => void;
  onUploadFarmPhoto?: (kind: FarmPhotoKind, imageUri: string) => Promise<boolean>;
  allowTemplateChange?: boolean;
  currentUserId?: string | null;
};

const STATUS_ORDER: FarmPetAvailability[] = ['for_sale', 'deposit_hold', 'completed'];

export function BreederDetailScreen({
  profile,
  posts = [],
  onBack,
  onReportBreeder,
  onHideBreeder,
  onOpenPostDetail,
  onOpenFarmHealth,
  onOpenTemplatePicker,
  onOpenBreederProfile,
  onOpenCreatePetFeedPost,
  onMessageFarm,
  onUploadFarmPhoto,
  allowTemplateChange = false,
  currentUserId,
}: BreederDetailScreenProps) {
  const { t, i18n } = useTranslation();
  const isOwnProfile = Boolean(currentUserId && profile.user_id === currentUserId);
  const listingPosts = Array.isArray(posts) ? posts : [];
  const [activeTab, setActiveTab] = useState<FarmDetailTab>('overview');
  const [petFilter, setPetFilter] = useState<FarmPetAvailabilityFilter>('all');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState<PetFeedReportReason>('scam');
  const [reportNote, setReportNote] = useState('');
  const [warrantyViewTitle, setWarrantyViewTitle] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState<FarmPhotoKind | null>(null);

  const coverUrl = resolveFarmCoverUrl(profile);
  const avatarUrl = resolveFarmAvatarUrl(profile);
  const farmPetCount = farmPetTabCount(listingPosts);
  const farmPetCounts = countFarmPetsByAvailability(listingPosts);
  const visiblePets = filterFarmPetsByAvailability(listingPosts, petFilter);
  const petsRehomed = countFarmPetsRehomed(listingPosts);
  const score = effectiveTrustScore(profile, listingPosts);
  const trustLevel = trustLevelFromScore(score);
  const trustChipLabel = farmTrustLevelChipLabel(trustLevel.level, t(trustLevel.labelKey));
  const transparencyMeaning = farmTransparencyMeaning(score, i18n.language || 'en');
  const facilitySocials = farmFacilitySocialLinks(profile.contact || {});
  const facilityVideoUrl = publicFacilityVideoUrl(profile.metadata);
  const hasFacility = farmFacilityHasContent({
    bio: profile.bio,
    socialCount: facilitySocials.length,
    videoUrl: facilityVideoUrl,
  });
  const warranties = farmWarrantyPoliciesFromMetadata(profile.metadata);
  const locationLabel = profile.location?.trim() || t('farm.locationFallback');

  const tabs = useMemo(
    () =>
      FARM_DETAIL_TABS.map((key) => ({
        key,
        label:
          key === 'listings'
            ? `${t(farmTabLabelKey(key))} (${farmPetCount})`
            : t(farmTabLabelKey(key)),
      })),
    [farmPetCount, t],
  );

  function confirmHideBreeder() {
    Alert.alert(t('breederDetail.blockTitle'), t('breederDetail.blockBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('breederDetail.blockConfirm'), style: 'destructive', onPress: () => onHideBreeder(profile) },
    ]);
  }

  function submitProfileReport() {
    onReportBreeder(profile, reportReason, reportNote);
    setReportVisible(false);
    setReportNote('');
  }

  async function changeFarmPhoto(kind: FarmPhotoKind) {
    if (!isOwnProfile || !onUploadFarmPhoto || photoBusy) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('alerts.permissionGallery.title'), t('alerts.permissionGallery.message'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: farmPhotoPickerAspect(kind),
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;

    setPhotoBusy(kind);
    try {
      const resized = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: farmPhotoResizeWidth(kind) } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );
      await onUploadFarmPhoto(kind, resized.uri);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('farm.owner.photoUploadFailed');
      Alert.alert(t('farm.owner.photoUploadFailed'), message);
    } finally {
      setPhotoBusy(null);
    }
  }

  return (
    <View testID="breeder-detail-screen" style={{ flex: 1, backgroundColor: FARM_BG }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: FARM_BORDER,
          paddingHorizontal: 8,
          paddingVertical: 8,
        }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          className="w-14 rounded-lg p-2"
          style={{ borderRadius: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={FARM_TEXT} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: FARM_TEXT }} numberOfLines={1}>
          {t('breederDetail.title')}
        </Text>
        <View className="w-14" />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: isOwnProfile ? 28 : 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <View style={{ height: 148, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E7D5C0' }}>
            <Image
              source={farmImageSource(coverUrl, DEFAULT_FARM_COVER)}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
            {isOwnProfile && photoBusy === 'cover' ? (
              <View
                accessibilityRole="progressbar"
                accessibilityLabel={t('farm.owner.photoUploading')}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                  backgroundColor: 'rgba(0,0,0,0.45)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <ActivityIndicator color="#fff" size="large" />
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{t('farm.owner.photoUploading')}</Text>
              </View>
            ) : null}
            {isOwnProfile && onUploadFarmPhoto ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('farm.owner.editCover')}
                disabled={photoBusy !== null}
                onPress={() => void changeFarmPhoto('cover')}
                style={{
                  position: 'absolute',
                  right: 10,
                  bottom: 10,
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#fff',
                  opacity: photoBusy !== null ? 0.6 : 1,
                  shadowColor: '#000',
                  shadowOpacity: 0.12,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Ionicons name="camera-outline" size={16} color={FARM_TEXT} />
              </Pressable>
            ) : null}
          </View>

          <View style={{ marginTop: -44, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ position: 'relative', width: 88, height: 88 }}>
              <Pressable
                accessibilityRole={isOwnProfile && onUploadFarmPhoto ? 'button' : undefined}
                accessibilityLabel={isOwnProfile ? t('farm.owner.editAvatar') : undefined}
                disabled={!isOwnProfile || !onUploadFarmPhoto || photoBusy !== null}
                onPress={isOwnProfile && onUploadFarmPhoto ? () => void changeFarmPhoto('avatar') : undefined}
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  borderWidth: 4,
                  borderColor: '#fff',
                  backgroundColor: BRAND.btnSecondary,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOpacity: 0.12,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <Image
                  source={farmImageSource(avatarUrl, DEFAULT_FARM_AVATAR)}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
                {isOwnProfile && photoBusy === 'avatar' ? (
                  <View
                    accessibilityRole="progressbar"
                    accessibilityLabel={t('farm.owner.photoUploading')}
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      bottom: 0,
                      left: 0,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ActivityIndicator color="#fff" />
                  </View>
                ) : null}
              </Pressable>
              {isOwnProfile && onUploadFarmPhoto && photoBusy !== 'avatar' ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: FARM_ACCENT,
                    borderWidth: 2,
                    borderColor: '#fff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    elevation: 4,
                  }}
                >
                  <Ionicons name="camera" size={14} color="#fff" />
                </View>
              ) : null}
            </View>
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
              <Text style={{ fontSize: 19, fontWeight: '800', color: FARM_TEXT }} numberOfLines={2}>
                {profile.display_name || t('petFeed.breederFallback')}
              </Text>
              <Text style={{ marginTop: 2, fontSize: 13, color: FARM_MUTED }} numberOfLines={1}>
                📍 {locationLabel}
              </Text>
            </View>
          </View>

          {isOwnProfile ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {onOpenBreederProfile ? (
                <OwnerChip label={`✏️ ${t('farm.owner.editProfile')}`} onPress={onOpenBreederProfile} />
              ) : null}
              {allowTemplateChange && onOpenTemplatePicker ? (
                <OwnerChip label={`🎨 ${t('farm.owner.template')}`} onPress={onOpenTemplatePicker} />
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <View
            style={{
              backgroundColor: '#FFFBEB',
              borderWidth: 1,
              borderColor: '#FDE68A',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: 'row',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 14 }}>⚠️</Text>
            <Text style={{ flex: 1, fontSize: 11, color: '#92400E', lineHeight: 16 }}>
              {t('breederDetail.disclaimer')}
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 14, borderBottomWidth: 1, borderBottomColor: FARM_BORDER }}
          contentContainerStyle={{ paddingHorizontal: 12 }}
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                onPress={() => setActiveTab(tab.key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderBottomWidth: 2,
                  borderBottomColor: active ? FARM_ACCENT : 'transparent',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? FARM_ACCENT_ACTIVE : FARM_MUTED }}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {activeTab === 'overview' ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 14 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: FARM_BORDER, padding: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: FARM_TEXT, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {t('farm.trust.scoreTitle')}
              </Text>
              <Text style={{ marginTop: 6, fontSize: 13, color: FARM_MUTED, lineHeight: 19 }}>
                {t('farm.trust.scoreSubtitle')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 }}>
                <TrustTicksGauge score={score} caption={t('farm.trust.gaugeCaption')} size={148} />
                <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                  <TrustLevelChip level={trustLevel.level} label={trustChipLabel} />
                  <Text style={{ fontSize: 13, color: FARM_TEXT, fontWeight: '600' }}>
                    {t('farm.trust.scoreLine', { score })}
                  </Text>
                  <Text style={{ fontSize: 12, color: FARM_MUTED, lineHeight: 17 }}>
                    {transparencyMeaning}
                  </Text>
                </View>
              </View>
              {isOwnProfile && onOpenFarmHealth ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('farm.trust.guideCta')}
                  onPress={onOpenFarmHealth}
                  style={{
                    marginTop: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: FARM_BORDER,
                    backgroundColor: FARM_BG,
                    paddingVertical: 11,
                    paddingHorizontal: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 13 }}>📋</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: FARM_ACCENT_ACTIVE }}>
                    {t('farm.trust.guideCta')}
                  </Text>
                </Pressable>
              ) : null}
              <View
                style={{
                  marginTop: 16,
                  paddingTop: 14,
                  borderTopWidth: 1,
                  borderTopColor: FARM_BORDER,
                  gap: 10,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: FARM_MUTED, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  {t('farm.trust.title')}
                </Text>
                <Text style={{ fontSize: 14, color: FARM_TEXT }}>⭐ {t('farm.trust.ratingEmpty')}</Text>
                <Text style={{ fontSize: 14, color: FARM_TEXT }}>⚡ {t('farm.trust.responseEmpty')}</Text>
                <Text style={{ fontSize: 14, color: FARM_TEXT }}>
                  📦 {petsRehomed} {t('farm.trust.adopted')}
                </Text>
              </View>
            </View>

            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: FARM_TEXT, marginBottom: 10 }}>
                {t('farm.tab.facility')}
              </Text>
              <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: FARM_BORDER, padding: 16, gap: 14 }}>
                {hasFacility ? (
                  <>
                    {profile.bio?.trim() ? (
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: FARM_TEXT, marginBottom: 4 }}>
                          {t('farm.facility.about')}
                        </Text>
                        <Text style={{ fontSize: 13, color: FARM_MUTED, lineHeight: 20 }}>{profile.bio.trim()}</Text>
                      </View>
                    ) : null}
                    {facilitySocials.length > 0 ? (
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: FARM_TEXT, marginBottom: 8 }}>
                          {t('farm.facility.social')}
                        </Text>
                        {facilitySocials.map((item) => (
                          <Pressable
                            key={item.id}
                            disabled={!item.href}
                            onPress={() => {
                              if (item.href) void Linking.openURL(item.href);
                            }}
                            style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '600', color: FARM_TEXT }}>{t(item.labelKey)}</Text>
                            <Text
                              style={{
                                flex: 1,
                                fontSize: 13,
                                color: item.href ? FARM_ACCENT_ACTIVE : FARM_MUTED,
                                textDecorationLine: item.href ? 'underline' : 'none',
                              }}
                              numberOfLines={1}
                            >
                              {item.display}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                    {facilityVideoUrl ? (
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: FARM_TEXT, marginBottom: 8 }}>
                          {t('farm.facility.video')}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => void Linking.openURL(facilityVideoUrl)}
                          style={{
                            borderRadius: 12,
                            backgroundColor: '#0F172A',
                            paddingVertical: 14,
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                            ▶ {t('farm.facility.openVideo')}
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </>
                ) : (
                  <Text style={{ fontSize: 13, color: FARM_MUTED, lineHeight: 19 }}>{t('farm.facility.empty')}</Text>
                )}
              </View>
            </View>

            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: FARM_TEXT, marginBottom: 10 }}>
                {t('farm.tab.reviews')}
              </Text>
              <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: FARM_BORDER, padding: 20 }}>
                <Text style={{ fontSize: 13, color: FARM_MUTED, textAlign: 'center' }}>{t('farm.reviews.empty')}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {activeTab === 'listings' ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, minWidth: 0 }}>
                {STATUS_ORDER.map((status, index) => {
                  const active = petFilter === status;
                  return (
                    <Pressable
                      key={status}
                      onPress={() => setPetFilter(active ? 'all' : status)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      {index > 0 ? <Text style={{ color: '#D6C4B0' }}>|</Text> : null}
                      <Text
                        style={{
                          fontSize: 11,
                          color: active ? FARM_ACCENT_ACTIVE : FARM_MUTED,
                          fontWeight: active ? '700' : '500',
                        }}
                      >
                        <Text style={{ fontWeight: '700' }}>{farmPetCounts[status]}</Text>{' '}
                        {t(`farm.listings.status.${status}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('farm.listings.filter')}
                onPress={() => setFilterMenuOpen(true)}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: FARM_BORDER,
                  backgroundColor: '#fff',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: FARM_TEXT }}>
                  {petFilter === 'all'
                    ? t('farm.listings.filterAll')
                    : t(`farm.listings.status.${petFilter}`)}{' '}
                  ▾
                </Text>
              </Pressable>
              {isOwnProfile && onOpenCreatePetFeedPost ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={onOpenCreatePetFeedPost}
                  style={{
                    borderRadius: 999,
                    backgroundColor: FARM_ACCENT,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>
                    + {t('farm.listings.createPost')}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {visiblePets.length === 0 ? (
              <View style={{ paddingVertical: 28, alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 13, color: FARM_MUTED, textAlign: 'center' }}>
                  {t(farmPetCount > 0 ? 'farm.listings.filterEmpty' : 'farm.listings.empty')}
                </Text>
                {isOwnProfile && farmPetCount === 0 && onOpenCreatePetFeedPost ? (
                  <Pressable
                    onPress={onOpenCreatePetFeedPost}
                    style={{
                      borderRadius: 999,
                      backgroundColor: FARM_ACCENT,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                      {t('farm.listings.createPost')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {visiblePets.map((item) => (
                  <PetFeedListingCard
                    key={item.id}
                    post={item}
                    showFavorite={false}
                    showContact={false}
                    currentUserId={currentUserId}
                    onPress={(post) => onOpenPostDetail(post.id)}
                  />
                ))}
              </View>
            )}
          </View>
        ) : null}

        {activeTab === 'warranty' ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: FARM_BORDER, padding: 16, gap: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: FARM_TEXT }}>{t('farm.warranty.title')}</Text>
              <Text style={{ fontSize: 12, color: FARM_MUTED, lineHeight: 18 }}>{t('farm.warranty.note')}</Text>
              {warranties.length > 0 ? (
                warranties.map((policy) => (
                  <Pressable
                    key={policy.id}
                    onPress={() => setWarrantyViewTitle(policy.title)}
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: FARM_BORDER,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: FARM_TEXT }} numberOfLines={1}>
                      🛡️ {policy.title}
                    </Text>
                    <Text style={{ marginTop: 4, fontSize: 12, fontWeight: '600', color: FARM_ACCENT }}>
                      {t('farm.warranty.viewCta')}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text style={{ fontSize: 13, color: FARM_MUTED, lineHeight: 19 }}>
                  {isOwnProfile ? t('farm.warranty.createCta') : t('farm.warranty.fallback')}
                </Text>
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {!isOwnProfile ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            borderTopWidth: 1,
            borderTopColor: FARM_BORDER,
            backgroundColor: '#fff',
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 16,
            gap: 8,
          }}
        >
          <Pressable
            testID="farm-message-breeder-button"
            accessibilityRole="button"
            onPress={() => onMessageFarm?.(profile)}
            style={{
              borderRadius: 12,
              backgroundColor: FARM_ACCENT,
              paddingVertical: 13,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>💬 {t('farm.cta.message')}</Text>
          </Pressable>
          <Pressable
            disabled
            accessibilityState={{ disabled: true }}
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: FARM_BORDER,
              paddingVertical: 11,
              alignItems: 'center',
              opacity: 0.55,
            }}
          >
            <Text style={{ color: FARM_TEXT, fontWeight: '600', fontSize: 13 }}>
              📹 {t('farm.cta.video')} · {t('farm.cta.videoSoon')}
            </Text>
          </Pressable>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, paddingTop: 2 }}>
            <Pressable onPress={() => setReportVisible(true)}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: FARM_MUTED }}>{t('breederDetail.reportProfile')}</Text>
            </Pressable>
            <Pressable onPress={confirmHideBreeder}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#DC2626' }}>{t('breederDetail.hideBreeder')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Modal visible={filterMenuOpen} transparent animationType="fade" onRequestClose={() => setFilterMenuOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'flex-end' }} onPress={() => setFilterMenuOpen(false)}>
          <Pressable
            style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24, paddingTop: 8 }}
            onPress={() => {}}
          >
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0' }} />
            </View>
            {(['all', ...STATUS_ORDER] as FarmPetAvailabilityFilter[]).map((option) => {
              const selected = petFilter === option;
              const label =
                option === 'all' ? t('farm.listings.filterAll') : t(`farm.listings.status.${option}`);
              return (
                <Pressable
                  key={option}
                  onPress={() => {
                    setPetFilter(option);
                    setFilterMenuOpen(false);
                  }}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    backgroundColor: selected ? '#FFFBEB' : '#fff',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: selected ? '700' : '500', color: selected ? FARM_ACCENT_ACTIVE : FARM_TEXT }}>
                    {label}
                  </Text>
                  {option !== 'all' ? (
                    <Text style={{ fontSize: 13, color: FARM_MUTED }}>{farmPetCounts[option]}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(warrantyViewTitle)} transparent animationType="fade" onRequestClose={() => setWarrantyViewTitle(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }} onPress={() => setWarrantyViewTitle(null)}>
          <Pressable
            style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: FARM_BORDER }}
            onPress={() => {}}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: FARM_TEXT }}>🛡️ {warrantyViewTitle}</Text>
            <Text style={{ marginTop: 10, fontSize: 13, color: FARM_MUTED, lineHeight: 19 }}>
              {t('farm.warranty.note')}
            </Text>
            <Pressable
              onPress={() => setWarrantyViewTitle(null)}
              style={{ marginTop: 16, borderRadius: 12, backgroundColor: FARM_ACCENT, paddingVertical: 11, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>{t('common.cancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <ReportModal
        visible={reportVisible}
        title={t('breederDetail.reportProfile')}
        body={t('breederDetail.reportBody')}
        reason={reportReason}
        note={reportNote}
        reasonLabel={(reason) => t(`breederDetail.reportReasons.${reason}`)}
        notePlaceholder={t('breederDetail.reportNotePlaceholder')}
        submitLabel={t('breederDetail.submitReport')}
        onChangeReason={setReportReason}
        onChangeNote={setReportNote}
        onCancel={() => setReportVisible(false)}
        onSubmit={submitProfileReport}
      />
    </View>
  );
}

function OwnerChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        borderRadius: 10,
        borderWidth: 1,
        borderColor: FARM_BORDER,
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: FARM_TEXT }}>{label}</Text>
    </Pressable>
  );
}
