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
import { TrustLevelChip } from '../components/breeder/TrustLevelChip';
import { TrustTicksGauge } from '../components/breeder/TrustTicksGauge';
import { WarrantyPolicyViewer } from '../components/WarrantyPolicyViewer';
import { deleteWarrantyPolicy } from '../api';
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
  farmNameExtraMargin,
  farmTabLabelKey,
  farmDetailTabBarLayout,
  farmWarrantyPoliciesFromMetadata,
  resolveFarmAvatarUrl,
  resolveFarmCoverUrl,
  type FarmDetailTab,
} from '../utils/farmProfileDisplay';
import {
  farmTransparencyMeaning,
  farmTrustLevelChipLabel,
} from '../utils/farmTrustDisplay';
import type { WarrantyPolicy } from '../utils/warrantyPolicy';

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
  onOpenPostDetail: (postId: string) => void;
  onOpenFarmHealth?: () => void;
  onOpenTemplatePicker?: () => void;
  onOpenBreederProfile?: () => void;
  onOpenCreatePetFeedPost?: () => void;
  onEditPost?: (post: PetFeedPost) => void;
  onMessageFarm?: (profile: BreederProfile) => void;
  onUploadFarmPhoto?: (kind: FarmPhotoKind, imageUri: string) => Promise<boolean>;
  onOpenWarrantyLibrary?: (editPolicy?: WarrantyPolicy | null) => void;
  onBreederProfileUpdated?: (profile: BreederProfile) => void;
  allowTemplateChange?: boolean;
  currentUserId?: string | null;
  token?: string | null;
  initialTab?: FarmDetailTab;
};

const STATUS_ORDER: FarmPetAvailability[] = ['for_sale', 'deposit_hold', 'completed'];

export function BreederDetailScreen({
  profile,
  posts = [],
  onBack,
  onOpenPostDetail,
  onOpenFarmHealth,
  onOpenTemplatePicker,
  onOpenBreederProfile,
  onOpenCreatePetFeedPost,
  onEditPost,
  onMessageFarm,
  onUploadFarmPhoto,
  onOpenWarrantyLibrary,
  onBreederProfileUpdated,
  allowTemplateChange = false,
  currentUserId,
  token = null,
  initialTab = 'overview',
}: BreederDetailScreenProps) {
  const { t, i18n } = useTranslation();
  const isOwnProfile = Boolean(currentUserId && profile.user_id === currentUserId);
  const listingPosts = Array.isArray(posts) ? posts : [];
  const [activeTab, setActiveTab] = useState<FarmDetailTab>(initialTab);
  const [petFilter, setPetFilter] = useState<FarmPetAvailabilityFilter>('all');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [viewingWarranty, setViewingWarranty] = useState<WarrantyPolicy | null>(null);
  const [warrantyMenuId, setWarrantyMenuId] = useState<string | null>(null);
  const [warrantyBusyId, setWarrantyBusyId] = useState<string | null>(null);
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

  function confirmDeleteWarranty(policy: WarrantyPolicy) {
    if (!token) return;
    Alert.alert(t('farm.warranty.delete'), t('farm.warranty.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('farm.warranty.delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setWarrantyMenuId(null);
            setWarrantyBusyId(policy.id);
            try {
              const result = await deleteWarrantyPolicy(token, policy.id);
              onBreederProfileUpdated?.(result.data);
            } catch (error) {
              Alert.alert(
                t('common.error'),
                error instanceof Error ? error.message : t('farm.warranty.deleteFailed'),
              );
            } finally {
              setWarrantyBusyId(null);
            }
          })();
        },
      },
    ]);
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
    <View testID="breeder-detail-screen" style={{ flex: 1, minHeight: 0, backgroundColor: FARM_BG }}>
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

      <ScrollView
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{ paddingBottom: 28, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
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

          <View style={{ marginTop: -44, flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
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
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'center', paddingBottom: 2 }}>
              <Text
                style={{
                  fontSize: 19,
                  fontWeight: '800',
                  color: FARM_TEXT,
                  marginBottom: farmNameExtraMargin(isOwnProfile),
                }}
                numberOfLines={2}
              >
                {profile.display_name || t('petFeed.breederFallback')}
              </Text>
              <View
                style={{
                  marginTop: 4,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <Text style={{ flexShrink: 1, fontSize: 13, color: FARM_MUTED }} numberOfLines={1}>
                  📍 {locationLabel}
                </Text>
                {isOwnProfile ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {onOpenBreederProfile ? (
                      <OwnerChip
                        testID="farm-owner-edit-profile"
                        label={`✏️ ${t('farm.owner.editProfile')}`}
                        onPress={onOpenBreederProfile}
                      />
                    ) : null}
                    {allowTemplateChange && onOpenTemplatePicker ? (
                      <OwnerChip
                        testID="farm-owner-change-template"
                        label={`🎨 ${t('farm.owner.template')}`}
                        onPress={onOpenTemplatePicker}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          style={{
            marginTop: 14,
            borderBottomWidth: 1,
            borderBottomColor: FARM_BORDER,
            ...farmDetailTabBarLayout(),
          }}
          contentContainerStyle={{ paddingHorizontal: 12, flexGrow: 0 }}
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
                    onEditPost={isOwnProfile ? onEditPost : undefined}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: FARM_TEXT }}>{t('farm.warranty.title')}</Text>
                {isOwnProfile ? (
                  <Pressable
                    testID="farm-warranty-create-button"
                    accessibilityRole="button"
                    onPress={() => onOpenWarrantyLibrary?.(null)}
                    style={{
                      borderRadius: 999,
                      backgroundColor: FARM_ACCENT,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{t('farm.warranty.createButton')}</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={{ fontSize: 12, color: FARM_MUTED, lineHeight: 18 }}>{t('farm.warranty.note')}</Text>
              {warranties.length > 0 ? (
                warranties.map((policy) => (
                  <View
                    key={policy.id}
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: FARM_BORDER,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <Pressable
                        style={{ flex: 1, minWidth: 0 }}
                        onPress={() => {
                          setWarrantyMenuId(null);
                          setViewingWarranty(policy);
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '700', color: FARM_TEXT }} numberOfLines={1}>
                          🛡️ {policy.title}
                        </Text>
                        <Text style={{ marginTop: 4, fontSize: 12, fontWeight: '600', color: FARM_ACCENT }}>
                          {t('warranty.viewCta')}
                        </Text>
                      </Pressable>
                      {isOwnProfile ? (
                        <View style={{ position: 'relative' }}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('farm.warranty.menu')}
                            disabled={warrantyBusyId === policy.id}
                            onPress={() =>
                              setWarrantyMenuId((cur) => (cur === policy.id ? null : policy.id))
                            }
                            style={{
                              height: 32,
                              width: 32,
                              borderRadius: 16,
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: warrantyBusyId === policy.id ? 0.5 : 1,
                            }}
                          >
                            <Text style={{ fontSize: 18, color: FARM_MUTED, fontWeight: '700' }}>⋮</Text>
                          </Pressable>
                          {warrantyMenuId === policy.id ? (
                            <View
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: 36,
                                zIndex: 20,
                                minWidth: 140,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: FARM_BORDER,
                                backgroundColor: '#fff',
                                paddingVertical: 4,
                                elevation: 4,
                                shadowColor: '#000',
                                shadowOpacity: 0.12,
                                shadowRadius: 8,
                                shadowOffset: { width: 0, height: 4 },
                              }}
                            >
                              <Pressable
                                onPress={() => {
                                  setWarrantyMenuId(null);
                                  onOpenWarrantyLibrary?.(policy);
                                }}
                                style={{ paddingHorizontal: 12, paddingVertical: 10 }}
                              >
                                <Text style={{ fontSize: 14, color: FARM_TEXT }}>{t('farm.warranty.update')}</Text>
                              </Pressable>
                              <Pressable
                                onPress={() => confirmDeleteWarranty(policy)}
                                style={{ paddingHorizontal: 12, paddingVertical: 10 }}
                              >
                                <Text style={{ fontSize: 14, color: '#DC2626' }}>{t('farm.warranty.delete')}</Text>
                              </Pressable>
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))
              ) : isOwnProfile ? (
                <Pressable onPress={() => onOpenWarrantyLibrary?.(null)}>
                  <Text style={{ fontSize: 13, color: FARM_MUTED, lineHeight: 19 }}>
                    {t('farm.warranty.createCta')}
                  </Text>
                </Pressable>
              ) : (
                <Text style={{ fontSize: 13, color: FARM_MUTED, lineHeight: 19 }}>
                  {t('farm.warranty.fallback')}
                </Text>
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {!isOwnProfile ? (
        <View
          style={{
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

      <WarrantyPolicyViewer
        visible={Boolean(viewingWarranty)}
        policy={viewingWarranty}
        primarySpecies={profile.primary_species}
        onClose={() => setViewingWarranty(null)}
      />
    </View>
  );
}

function OwnerChip({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={{
        borderRadius: 10,
        borderWidth: 1,
        borderColor: FARM_BORDER,
        backgroundColor: '#fff',
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: FARM_TEXT }}>{label}</Text>
    </Pressable>
  );
}
