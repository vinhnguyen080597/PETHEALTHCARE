import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type TextStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdminPostCard } from '../components/AdminPostCard';
import { TopBreederCard } from '../components/breeder/TopBreederCard';
import { ModalScreenShell } from '../components/ModalScreenShell';
import { PetFeedPostCard } from '../components/PetFeedPostCard';
import { PetTypeFilterRow } from '../components/PetTypeFilterRow';
import type { BreederProfile, PetFeedPost } from '../types';
import { ALL_PROVINCES_FILTER, VIETNAM_PROVINCES, type ProvinceFilter } from '../constants/vietnamProvinces';
import { metadataString } from '../utils/breederTrust';
import {
  breederCardSpecialtyLabel,
  buildBreederPetThumbs,
  canShowBreederMessageAction,
  canShowBreederEditProfileAction,
  getBreederDirectoryCardMetrics,
  resolveBreederCardActivity,
} from '../utils/breederDirectoryCard';
import { countFarmPetsRehomed } from '../utils/farmPets';
import { resolveFarmAvatarUrl, resolveFarmCoverUrl } from '../utils/farmProfileDisplay';
import { rankBreedersWithHomeQuota } from '../utils/breederQualityIndex';
import {
  countPostsByGender,
  postMatchesGender,
  type GenderFilter,
} from '../utils/petFeedGender';
import { breederMatchesProvince, postMatchesProvince } from '../utils/petFeedLocation';
import { normalizeSearchText } from '../utils/petFeedText';
import { LISTING_CARD_IMAGE_HEIGHT } from '../utils/marketplaceListingCard';
import {
  PET_FEED_TAB_ORDER,
  type PetFeedScreenTab,
} from '../constants/petFeedTabFlags';
import {
  DEFAULT_PET_FEED_SORT_DIRECTION,
  DEFAULT_PET_FEED_SORT_FIELD,
  PET_FEED_SORT_CHIP_FIELDS,
  type PetFeedSortChipField,
  type PetFeedSortField,
} from '../constants/petFeedSort';
import {
  breederMatchesPetType,
  postMatchesPetType,
  type PetTypeFilter,
} from '../utils/petType';
import { parsePetFeedPriceToVnd } from '../utils/petFeedCurrency';
import { isPetFeedQuickFilterActive } from '../utils/petFeedQuickFilters';
import { modalTopInset } from '../utils/modalSafeArea';
import { BRAND } from '../theme/brand';

const DEFAULT_PET_TYPE_FILTER: SpeciesFilter = 'cat';
const WEB_SEARCH_INPUT_STYLE =
  Platform.OS === 'web' ? ({ outlineStyle: 'none', boxShadow: 'none' } as unknown as TextStyle) : undefined;

type SpeciesFilter = PetTypeFilter;
type SortField = PetFeedSortField;
type SortDirection = 'asc' | 'desc';
type FeedTab = PetFeedScreenTab;
type ChipItem<T extends string> = {
  key: T;
  label: string;
  count?: number;
  icon: keyof typeof Ionicons.glyphMap;
};

type PetFeedScreenProps = {
  posts: PetFeedPost[];
  announcementPosts: PetFeedPost[];
  breederProfiles: BreederProfile[];
  initialLoading: boolean;
  initialError: string;
  announcementInitialLoading: boolean;
  announcementInitialError: string;
  refreshing: boolean;
  loadingMore: boolean;
  announcementLoadingMore: boolean;
  hasMore: boolean;
  announcementHasMore: boolean;
  loadMoreError: string;
  announcementLoadMoreError: string;
  onRefresh: () => void;
  onLoadMore: () => void;
  onLoadMoreAnnouncements: () => void;
  onOpenBreederDetail: (profileId: string) => void;
  onOpenPostDetail: (postId: string) => void;
  onToggleFavorite?: (post: PetFeedPost) => void;
  onMessageBreeder?: (post: PetFeedPost) => void;
  onMessageFarm?: (profile: BreederProfile) => void;
  onOpenBreederProfile?: () => void;
  onEditPost?: (post: PetFeedPost) => void;
  currentUserId?: string | null;
  /** When set, switch to feed tab and scroll to this post, then call onFocusPostHandled. */
  focusPostId?: string | null;
  onFocusPostHandled?: () => void;
  enabledTabs?: { news: boolean; feed: boolean; breeders: boolean };
};

function searchableText(post: PetFeedPost) {
  return normalizeSearchText([
    post.title,
    post.species,
    post.breed,
    post.gender,
    post.location,
    post.age_months != null ? String(post.age_months) : '',
    post.age_months != null ? `${post.age_months} thang` : '',
    post.price_note,
    post.description,
    post.vaccine_status,
    post.deworming_status,
    post.breeder_profile?.display_name,
    post.breeder_profile?.location,
    ...post.personality,
    ...post.paperwork,
  ].filter(Boolean).join(' '));
}

function searchableAnnouncementText(post: PetFeedPost) {
  return normalizeSearchText([
    post.title,
    post.description,
    String(post.metadata?.category ?? ''),
    String(post.metadata?.ctaLabel ?? ''),
    'pet health care',
  ].filter(Boolean).join(' '));
}

function createdTime(post: PetFeedPost) {
  const time = new Date(post.created_at).getTime();
  return Number.isFinite(time) ? time : 0;
}

function compareMaybeNumber(a: number | null, b: number | null, direction: 'asc' | 'desc') {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return direction === 'asc' ? a - b : b - a;
}

type TopBreeder = {
  profile: BreederProfile;
  postCount: number;
  latestPostAt: number;
  species: string[];
  posts: PetFeedPost[];
};

type FeedListItem =
  | { type: 'post'; id: string; post: PetFeedPost }
  | { type: 'breeder'; id: string; item: TopBreeder; rank: number };

function ListSeparator() {
  return <View className="h-4" />;
}

function PetFeedSkeleton() {
  return (
    <View className="gap-4 px-5">
      {[0, 1, 2].map((item) => (
        <View key={item} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <View className="bg-slate-200" style={{ height: LISTING_CARD_IMAGE_HEIGHT }} />
          <View className="gap-3 p-4">
            <View className="h-5 w-4/5 rounded-full bg-slate-200" />
            <View className="h-4 w-2/5 rounded-full bg-slate-100" />
            <View className="flex-row gap-2">
              <View className="h-7 w-20 rounded-full bg-slate-100" />
              <View className="h-7 w-24 rounded-full bg-slate-100" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function PetFeedScreen({
  posts,
  announcementPosts,
  breederProfiles,
  initialLoading,
  initialError,
  announcementInitialLoading,
  announcementInitialError,
  refreshing,
  loadingMore,
  announcementLoadingMore,
  hasMore,
  announcementHasMore,
  loadMoreError,
  announcementLoadMoreError,
  onRefresh,
  onLoadMore,
  onLoadMoreAnnouncements,
  onOpenBreederDetail,
  onOpenPostDetail,
  onToggleFavorite,
  onMessageBreeder,
  onMessageFarm,
  onOpenBreederProfile,
  onEditPost,
  currentUserId = null,
  focusPostId = null,
  onFocusPostHandled,
  enabledTabs = { news: true, feed: true, breeders: true },
}: PetFeedScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const listRef = useRef<FlatList<FeedListItem>>(null);
  const visibleTabs = useMemo(
    () => PET_FEED_TAB_ORDER.filter((tab) => enabledTabs[tab]),
    [enabledTabs],
  );
  const [activeTab, setActiveTab] = useState<FeedTab>(() =>
    (visibleTabs.includes('feed') ? 'feed' : visibleTabs[0]) ?? 'feed',
  );

  useEffect(() => {
    if (!visibleTabs.includes(activeTab) && visibleTabs.length > 0) {
      setActiveTab(visibleTabs.includes('feed') ? 'feed' : visibleTabs[0]);
    }
  }, [activeTab, visibleTabs]);
  const [query, setQuery] = useState('');
  const [petTypeFilter, setPetTypeFilter] = useState<SpeciesFilter>(DEFAULT_PET_TYPE_FILTER);
  const [provinceFilter, setProvinceFilter] = useState<ProvinceFilter>(ALL_PROVINCES_FILTER);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [sortField, setSortField] = useState<SortField>(DEFAULT_PET_FEED_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState<SortDirection>(DEFAULT_PET_FEED_SORT_DIRECTION);
  const [filterVisible, setFilterVisible] = useState(false);
  const [provincePickerOpen, setProvincePickerOpen] = useState(false);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null);

  const normalizedQuery = useMemo(() => normalizeSearchText(query), [query]);
  const searchMatchedPosts = useMemo(() => {
    if (!normalizedQuery) return posts;
    return posts.filter((post) => searchableText(post).includes(normalizedQuery));
  }, [normalizedQuery, posts]);

  const searchMatchedAnnouncements = useMemo(() => {
    if (!normalizedQuery) return announcementPosts;
    return announcementPosts.filter((post) => searchableAnnouncementText(post).includes(normalizedQuery));
  }, [announcementPosts, normalizedQuery]);

  const speciesMatchedPosts = useMemo(() => {
    return petTypeFilter === 'all'
      ? searchMatchedPosts
      : searchMatchedPosts.filter((post) => postMatchesPetType(post, petTypeFilter));
  }, [searchMatchedPosts, petTypeFilter]);

  const provinceMatchedPosts = useMemo(() => {
    return provinceFilter === ALL_PROVINCES_FILTER
      ? speciesMatchedPosts
      : speciesMatchedPosts.filter((post) => postMatchesProvince(post, provinceFilter));
  }, [provinceFilter, speciesMatchedPosts]);

  const genderFilterItems = useMemo<ChipItem<Exclude<GenderFilter, 'all'>>[]>(() => {
    const maleCount = countPostsByGender(provinceMatchedPosts, 'male');
    const femaleCount = countPostsByGender(provinceMatchedPosts, 'female');
    return [
      { key: 'male', label: t('gender.male'), count: maleCount, icon: 'male-outline' },
      { key: 'female', label: t('gender.female'), count: femaleCount, icon: 'female-outline' },
    ];
  }, [provinceMatchedPosts, t]);

  function toggleSort(field: PetFeedSortChipField) {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection('asc');
  }

  const sortItems = useMemo<ChipItem<PetFeedSortChipField>[]>(() => (
    PET_FEED_SORT_CHIP_FIELDS.map((key) => ({
      key,
      label: t(`petFeed.sort.${key}`),
      icon: key === 'age' ? 'calendar-outline' : 'cash-outline',
    }))
  ), [t]);

  const filteredPosts = useMemo(() => {
    const byGender = genderFilter === 'all'
      ? provinceMatchedPosts
      : provinceMatchedPosts.filter((post) => postMatchesGender(post, genderFilter));
    return [...byGender].sort((a, b) => {
      if (sortField === 'age') {
        return compareMaybeNumber(a.age_months, b.age_months, sortDirection);
      }
      if (sortField === 'price') {
        return compareMaybeNumber(parsePetFeedPriceToVnd(a.price_note), parsePetFeedPriceToVnd(b.price_note), sortDirection);
      }
      return sortDirection === 'asc' ? createdTime(a) - createdTime(b) : createdTime(b) - createdTime(a);
    });
  }, [genderFilter, provinceMatchedPosts, sortDirection, sortField]);

  const filteredAnnouncements = useMemo(() => {
    return [...searchMatchedAnnouncements].sort((a, b) => (
      sortDirection === 'asc' ? createdTime(a) - createdTime(b) : createdTime(b) - createdTime(a)
    ));
  }, [searchMatchedAnnouncements, sortDirection]);

  const selectedAnnouncement = selectedAnnouncementId ? announcementPosts.find((post) => post.id === selectedAnnouncementId) ?? null : null;
  const topBreeders = useMemo<TopBreeder[]>(() => {
    const byBreeder = new Map<string, TopBreeder>();
    breederProfiles
      .filter((profile) => profile.verification_status === 'verified')
      .forEach((profile) => {
        const key = profile.id || profile.user_id;
        byBreeder.set(key, {
          profile,
          postCount: 0,
          latestPostAt: new Date(profile.updated_at ?? profile.created_at).getTime() || 0,
          species: profile.primary_species,
          posts: [],
        });
      });
    posts.forEach((post) => {
      const profile = post.breeder_profile;
      if (!profile || profile.verification_status !== 'verified') return;
      const key = profile.id || profile.user_id;
      const current = byBreeder.get(key);
      const species = post.species ? [post.species] : [];
      if (!current) {
        byBreeder.set(key, {
          profile,
          postCount: 1,
          latestPostAt: createdTime(post),
          species,
          posts: [post],
        });
        return;
      }
      current.postCount += 1;
      current.latestPostAt = Math.max(current.latestPostAt, createdTime(post));
      current.species = Array.from(new Set([...current.species, ...species]));
      current.posts = [...current.posts, post];
    });
    return rankBreedersWithHomeQuota(Array.from(byBreeder.values())).map(({ qualityIndex: _qi, ...item }) => item);
  }, [breederProfiles, posts]);

  const filteredTopBreeders = useMemo(() => {
    const byPetType = petTypeFilter === 'all'
      ? topBreeders
      : topBreeders.filter((item) => breederMatchesPetType(item.profile, petTypeFilter, item.species));
    const byProvince = provinceFilter === ALL_PROVINCES_FILTER
      ? byPetType
      : byPetType.filter((item) => breederMatchesProvince(
        item.profile,
        item.posts.map((post) => post.location),
        provinceFilter,
      ));
    const byGender = genderFilter === 'all'
      ? byProvince
      : byProvince.filter((item) => item.posts.some((post) => postMatchesGender(post, genderFilter)));
    if (!normalizedQuery) return byGender;
    return byGender.filter((item) => {
      const profile = item.profile;
      const searchable = normalizeSearchText([
        profile.display_name,
        profile.location,
        profile.bio,
        profile.care_environment,
        ...profile.primary_species,
        ...profile.main_breeds,
        metadataString(profile.metadata, 'breederType'),
        metadataString(profile.metadata, 'scaleRange'),
      ].filter(Boolean).join(' '));
      return searchable.includes(normalizedQuery);
    });
  }, [genderFilter, normalizedQuery, petTypeFilter, provinceFilter, topBreeders]);
  const filterPanelWidth = Math.min(Math.round(windowWidth * 0.76), 330);
  const filterPanelMaxHeight = Math.min(Math.round(windowHeight * 0.58), 480);
  const filterPanelTopOffset = modalTopInset(insets.top) + 112;
  const hasActiveFilters = isPetFeedQuickFilterActive({
    provinceFilter,
    genderFilter,
    sortField,
    sortDirection,
  });
  const showListSkeleton =
    (activeTab === 'feed' && initialLoading)
    || (activeTab === 'news' && announcementInitialLoading)
    || (activeTab === 'breeders' && (initialLoading || announcementInitialLoading));
  const listItems = useMemo<FeedListItem[]>(() => {
    if (showListSkeleton) return [];
    if (activeTab === 'feed') {
      return filteredPosts.map((post) => ({ type: 'post', id: post.id, post }));
    }
    if (activeTab === 'news') {
      return filteredAnnouncements.map((post) => ({ type: 'post', id: post.id, post }));
    }
    return filteredTopBreeders.map((item, index) => ({
      type: 'breeder',
      id: item.profile.id || item.profile.user_id,
      item,
      rank: index + 1,
    }));
  }, [activeTab, filteredAnnouncements, filteredPosts, filteredTopBreeders, showListSkeleton]);
  const shouldLoadMore = activeTab === 'feed'
    ? hasMore && !loadingMore && !loadMoreError && filteredPosts.length > 0 && !showListSkeleton
    : activeTab === 'news' && announcementHasMore && !announcementLoadingMore && !announcementLoadMoreError && filteredAnnouncements.length > 0 && !showListSkeleton;

  const tabCounts = useMemo(() => ({
    news: filteredAnnouncements.length,
    feed: filteredPosts.length,
    breeders: filteredTopBreeders.length,
  }), [filteredAnnouncements.length, filteredPosts.length, filteredTopBreeders.length]);

  useEffect(() => {
    if (!focusPostId || !enabledTabs.feed) return;

    if (activeTab !== 'feed') {
      setActiveTab('feed');
      return;
    }

    // Clear filters that would hide the post so we can scroll to it.
    const inRawFeed = posts.some((post) => post.id === focusPostId);
    if (!inRawFeed) {
      onFocusPostHandled?.();
      return;
    }
    const inFiltered = filteredPosts.some((post) => post.id === focusPostId);
    if (!inFiltered) {
      setQuery('');
      setPetTypeFilter('all');
      setProvinceFilter(ALL_PROVINCES_FILTER);
      setGenderFilter('all');
      setSortField(DEFAULT_PET_FEED_SORT_FIELD);
      setSortDirection(DEFAULT_PET_FEED_SORT_DIRECTION);
      return;
    }

    const index = listItems.findIndex((item) => item.type === 'post' && item.id === focusPostId);
    if (index < 0) {
      onFocusPostHandled?.();
      return;
    }

    const timer = setTimeout(() => {
      try {
        listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.08 });
      } catch {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      }
      onFocusPostHandled?.();
    }, 80);

    return () => clearTimeout(timer);
  }, [
    activeTab,
    enabledTabs.feed,
    filteredPosts,
    focusPostId,
    listItems,
    onFocusPostHandled,
    posts,
  ]);

  const resetFilters = useCallback(() => {
    setPetTypeFilter(DEFAULT_PET_TYPE_FILTER);
    setProvinceFilter(ALL_PROVINCES_FILTER);
    setGenderFilter('all');
    setSortField(DEFAULT_PET_FEED_SORT_FIELD);
    setSortDirection(DEFAULT_PET_FEED_SORT_DIRECTION);
  }, []);

  const renderListItem = useCallback(({ item }: { item: FeedListItem }) => {
    if (item.type === 'post') {
      if (activeTab === 'news') {
        return (
          <View className="px-5">
            <AdminPostCard post={item.post} onPress={(post) => setSelectedAnnouncementId(post.id)} />
          </View>
        );
      }
      return (
        <View className="px-5">
          <PetFeedPostCard
            post={item.post}
            variant="compact"
            autoPlayVideo={false}
            showFavorite={Boolean(currentUserId && onToggleFavorite)}
            showContact={Boolean(currentUserId && onMessageBreeder)}
            onToggleFavorite={onToggleFavorite}
            onMessageBreeder={onMessageBreeder}
            onEditPost={onEditPost}
            currentUserId={currentUserId}
            showReport={false}
            onPress={(post) => onOpenPostDetail(post.id)}
          />
        </View>
      );
    }

    const profile = item.item.profile;
    const postsForFarm = item.item.posts;
    const metrics = getBreederDirectoryCardMetrics(
      profile,
      postsForFarm,
      countFarmPetsRehomed(postsForFarm),
    );
    const activity = resolveBreederCardActivity(profile, metrics);
    const lang = i18n.language?.toLowerCase().startsWith('en') ? 'en' : 'vi';
    const name = profile.display_name || t('petFeed.breederFallback');
    const showMessage = canShowBreederMessageAction(currentUserId, profile.user_id);
    const showEditProfile = canShowBreederEditProfileAction(currentUserId, profile.user_id);

    return (
      <View className="px-5">
        <TopBreederCard
          data={{
            name,
            location: profile.location || t('farm.locationFallback'),
            specialtyLabel: breederCardSpecialtyLabel(profile, lang),
            coverUrl: resolveFarmCoverUrl(profile),
            avatarUrl: resolveFarmAvatarUrl(profile),
            trustScore: metrics.trustScore,
            rating: metrics.rating,
            reviewCount: metrics.reviewCount,
            petsRehomed: metrics.petsRehomed,
            showSold: metrics.showSold,
            activityKind: activity.kind,
            petThumbs: buildBreederPetThumbs(postsForFarm),
          }}
          showMessageButton={showMessage}
          showEditProfileButton={showEditProfile && Boolean(onOpenBreederProfile)}
          accessibilityLabel={t('petFeed.accessibility.openBreederProfile', { name })}
          onPressVisit={() => onOpenBreederDetail(profile.id || profile.user_id)}
          onPressMessage={() => onMessageFarm?.(profile)}
          onPressEditProfile={onOpenBreederProfile}
          onPressPet={(listingId) => onOpenPostDetail(listingId)}
        />
      </View>
    );
  }, [
    activeTab,
    currentUserId,
    i18n.language,
    onMessageBreeder,
    onMessageFarm,
    onOpenBreederProfile,
    onEditPost,
    onOpenBreederDetail,
    onOpenPostDetail,
    onToggleFavorite,
    t,
  ]);

  const renderEmptyState = useCallback(() => {
    if (showListSkeleton) return <PetFeedSkeleton />;
    if (activeTab === 'news') {
      if (announcementInitialError) {
        return (
          <View className="px-5">
            <View className="items-center rounded-2xl border border-red-100 bg-white px-5 py-10">
              <Ionicons name="cloud-offline-outline" size={38} color="#dc2626" />
              <Text className="mt-4 text-center text-base font-bold text-slate-900">{t('petFeed.loadFailedTitle')}</Text>
              <Text className="mt-2 text-center text-sm leading-5 text-slate-500">{announcementInitialError}</Text>
              <Pressable className="mt-5 rounded-xl bg-blue-600 px-5 py-3" onPress={onRefresh}>
                <Text className="text-sm font-bold text-white">{t('petFeed.retry')}</Text>
              </Pressable>
            </View>
          </View>
        );
      }
      if (announcementPosts.length === 0) {
        return (
          <View className="px-5">
            <View className="items-center rounded-2xl border border-gray-200 bg-white px-5 py-12">
              <Ionicons name="megaphone-outline" size={42} color={BRAND.btnPrimary} />
              <Text className="mt-4 text-center text-base font-bold text-slate-900">{t('petFeed.newsEmpty')}</Text>
            </View>
          </View>
        );
      }
      return (
        <View className="px-5">
          <View className="items-center rounded-2xl border border-gray-200 bg-white px-5 py-10">
            <Ionicons name="search-outline" size={38} color={BRAND.btnPrimary} />
            <Text className="mt-4 text-center text-base font-bold text-slate-900">{t('petFeed.emptyFilteredTitle')}</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-slate-500">{t('petFeed.emptyFilteredBody')}</Text>
          </View>
        </View>
      );
    }
    if (initialError) {
      return (
        <View className="px-5">
          <View className="items-center rounded-2xl border border-red-100 bg-white px-5 py-10">
            <Ionicons name="cloud-offline-outline" size={38} color="#dc2626" />
            <Text className="mt-4 text-center text-base font-bold text-slate-900">{t('petFeed.loadFailedTitle')}</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-slate-500">{initialError}</Text>
            <Pressable accessibilityRole="button" className="mt-5 rounded-xl bg-blue-600 px-5 py-3" onPress={onRefresh}>
              <Text className="text-sm font-bold text-white">{t('petFeed.retry')}</Text>
            </Pressable>
          </View>
        </View>
      );
    }
    if (activeTab === 'feed' && posts.length === 0) {
      return (
        <View className="px-5">
          <View className="items-center rounded-2xl border border-gray-200 bg-white px-5 py-12">
            <Ionicons name="newspaper-outline" size={42} color={BRAND.btnPrimary} />
            <Text className="mt-4 text-center text-base font-bold text-slate-900">{t('petFeed.emptyTitle')}</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-slate-500">{t('petFeed.emptyBody')}</Text>
          </View>
        </View>
      );
    }
    if (activeTab === 'feed') {
      return (
        <View className="px-5">
          <View className="items-center rounded-2xl border border-gray-200 bg-white px-5 py-10">
            <Ionicons name="filter-outline" size={38} color={BRAND.btnPrimary} />
            <Text className="mt-4 text-center text-base font-bold text-slate-900">{t('petFeed.emptyFilteredTitle')}</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-slate-500">{t('petFeed.emptyFilteredBody')}</Text>
          </View>
        </View>
      );
    }
    if (topBreeders.length === 0) {
      return (
        <View className="px-5">
          <View className="items-center rounded-2xl border border-gray-200 bg-white px-5 py-12">
            <Ionicons name="ribbon-outline" size={42} color={BRAND.btnPrimary} />
            <Text className="mt-4 text-center text-base font-bold text-slate-900">{t('petFeed.topBreeders.emptyTitle')}</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-slate-500">{t('petFeed.topBreeders.emptyBody')}</Text>
          </View>
        </View>
      );
    }
    return (
      <View className="px-5">
        <View className="items-center rounded-2xl border border-gray-200 bg-white px-5 py-10">
          <Ionicons name="search-outline" size={38} color={BRAND.btnPrimary} />
          <Text className="mt-4 text-center text-base font-bold text-slate-900">{t('petFeed.emptyFilteredTitle')}</Text>
          <Text className="mt-2 text-center text-sm leading-5 text-slate-500">{t('petFeed.emptyFilteredBody')}</Text>
        </View>
      </View>
    );
  }, [activeTab, announcementInitialError, announcementPosts.length, initialError, onRefresh, posts.length, showListSkeleton, t, topBreeders.length]);

  const renderFooter = useCallback(() => {
    const isFeedTab = activeTab === 'feed';
    const isNewsTab = activeTab === 'news';
    if (!isFeedTab && !isNewsTab) return <View className="h-6" />;
    if (isFeedTab && (initialLoading || initialError || filteredPosts.length === 0)) return <View className="h-6" />;
    if (isNewsTab && (announcementInitialLoading || announcementInitialError || filteredAnnouncements.length === 0)) return <View className="h-6" />;
    const loading = isFeedTab ? loadingMore : announcementLoadingMore;
    const moreError = isFeedTab ? loadMoreError : announcementLoadMoreError;
    const moreAvailable = isFeedTab ? hasMore : announcementHasMore;
    const loadMore = isFeedTab ? onLoadMore : onLoadMoreAnnouncements;
    if (loading) {
      return (
        <View className="items-center gap-2 px-5 py-6">
          <ActivityIndicator color={BRAND.btnPrimary} />
          <Text className="text-sm font-semibold text-slate-500">{t('petFeed.loadingMore')}</Text>
        </View>
      );
    }
    if (moreError) {
      return (
        <View className="px-5 py-5">
          <View className="items-center rounded-2xl border border-red-100 bg-white px-4 py-4">
            <Text className="text-center text-sm font-semibold text-slate-600">{moreError}</Text>
            <Pressable accessibilityRole="button" className="mt-3 rounded-xl bg-blue-600 px-5 py-2.5" onPress={loadMore}>
              <Text className="text-sm font-bold text-white">{t('petFeed.retry')}</Text>
            </Pressable>
          </View>
        </View>
      );
    }
    if (!moreAvailable) {
      return (
        <View className="items-center px-5 py-6">
          <Text className="text-sm font-semibold text-slate-400">{t('petFeed.endOfFeed')}</Text>
        </View>
      );
    }
    return <View className="h-8" />;
  }, [activeTab, announcementInitialError, announcementInitialLoading, announcementLoadMoreError, announcementLoadingMore, announcementHasMore, filteredAnnouncements.length, filteredPosts.length, hasMore, initialError, initialLoading, loadMoreError, loadingMore, onLoadMore, onLoadMoreAnnouncements, t]);

  return (
    <>
    <View testID="pet-feed-screen" className="flex-1 bg-[#F2F4F8]" style={{ minHeight: 0 }}>
      <View className="bg-white" style={{ zIndex: 2, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
        <View className="flex-row items-center gap-2 bg-white px-5 pb-3 pt-4">
          <View className="min-w-0 flex-1 flex-row items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2">
            <Ionicons name="search-outline" size={20} color="#64748b" />
            <TextInput
              testID="pet-feed-search-input"
              accessibilityLabel={t('petFeed.accessibility.search')}
              className="min-w-0 flex-1 text-base text-slate-900"
              style={WEB_SEARCH_INPUT_STYLE}
              placeholder={t('petFeed.searchPlaceholder')}
              placeholderTextColor="#94a3b8"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            {query.trim() ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('petFeed.accessibility.clearSearch')}
                onPress={() => setQuery('')}
              >
                <Ionicons name="close-circle" size={20} color="#94a3b8" />
              </Pressable>
            ) : null}
          </View>
          {enabledTabs.feed ? (
            <Pressable
              testID="pet-feed-filter-sidebar-button"
              accessibilityRole="button"
              accessibilityLabel={t('petFeed.accessibility.openFilters')}
              accessibilityState={{ selected: hasActiveFilters }}
              className="h-9 w-9 items-center justify-center rounded-xl"
              style={{
                borderWidth: 1,
                borderColor: hasActiveFilters ? BRAND.btnPrimary : '#E5E7EB',
                backgroundColor: hasActiveFilters ? BRAND.surfaceLight : '#F8FAFC',
              }}
              onPress={() => setFilterVisible(true)}
            >
              <Ionicons name="menu-outline" size={22} color={hasActiveFilters ? BRAND.btnPrimary : BRAND.textMuted} />
            </Pressable>
          ) : (
            <View className="h-9 w-9" />
          )}
        </View>

        <PetTypeFilterRow value={petTypeFilter} onChange={setPetTypeFilter} />

        {visibleTabs.length > 1 ? (
          <View className="px-2 pb-2">
            <View
              className="flex-row rounded-xl p-0.5"
              style={{
                borderWidth: 1,
                borderColor: BRAND.borderBrand,
                backgroundColor: BRAND.btnSecondary,
              }}
            >
              {([
                { key: 'news' as const, label: t('petFeed.tabs.news'), count: showListSkeleton ? undefined : tabCounts.news, icon: 'megaphone-outline' as const },
                { key: 'feed' as const, label: t('petFeed.tabs.feed'), count: showListSkeleton ? undefined : tabCounts.feed, icon: 'newspaper-outline' as const },
                { key: 'breeders' as const, label: t('petFeed.tabs.breeders'), count: showListSkeleton ? undefined : tabCounts.breeders, icon: 'ribbon-outline' as const },
              ]).filter((item) => enabledTabs[item.key]).map((item) => {
                const active = activeTab === item.key;
                const compactTabs = windowWidth < 390;
                return (
                  <Pressable
                    key={item.key}
                    accessibilityRole="tab"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected: active }}
                    className={`min-w-0 flex-1 items-center justify-center rounded-lg ${
                      compactTabs ? 'px-1 py-2' : 'px-2 py-2.5'
                    }`}
                    style={active ? { backgroundColor: BRAND.btnPrimary } : undefined}
                    onPress={() => setActiveTab(item.key)}
                  >
                    <View className={`max-w-full flex-row items-center justify-center ${compactTabs ? 'gap-0.5' : 'gap-1.5'}`}>
                      <Ionicons name={item.icon} size={compactTabs ? 14 : 15} color={active ? BRAND.textInverse : BRAND.btnPrimary} />
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        className={`shrink font-bold ${compactTabs ? 'text-[10px]' : 'text-xs'}`}
                        style={{ color: active ? BRAND.textInverse : BRAND.textBrandLink }}
                      >
                        {item.label}
                      </Text>
                      {typeof item.count === 'number' ? (
                        <Text
                          className={`font-bold ${compactTabs ? 'text-[9px]' : 'text-[10px]'}`}
                          style={{ color: active ? BRAND.btnSecondaryPressed : BRAND.textMuted }}
                        >
                          {item.count}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>

    <FlatList
      ref={listRef}
      className="flex-1 bg-[#F2F4F8]"
      style={{ flex: 1, minHeight: 0 }}
      data={listItems}
      keyExtractor={(item) => item.id}
      renderItem={renderListItem}
      ItemSeparatorComponent={ListSeparator}
      ListEmptyComponent={renderEmptyState}
      ListFooterComponent={renderFooter}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.btnPrimary} />}
      showsVerticalScrollIndicator={false}
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={7}
      removeClippedSubviews={Platform.OS !== 'web'}
      onScrollToIndexFailed={(info) => {
        listRef.current?.scrollToOffset({
          offset: Math.max(0, info.averageItemLength * info.index),
          animated: true,
        });
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.08 });
        }, 120);
      }}
      onEndReached={() => {
        if (!shouldLoadMore) return;
        if (activeTab === 'news') onLoadMoreAnnouncements();
        else if (activeTab === 'feed') onLoadMore();
      }}
      onEndReachedThreshold={0.45}
      contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
    />
    </View>
    <Modal visible={filterVisible} transparent animationType="fade" onRequestClose={() => { setProvincePickerOpen(false); setFilterVisible(false); }}>
      <View className="flex-1">
        <Pressable className="absolute inset-0" accessibilityRole="button" accessibilityLabel={t('petFeed.accessibility.closeFilters')} onPress={() => { setProvincePickerOpen(false); setFilterVisible(false); }} />
        <View
          className="self-end rounded-3xl border border-gray-200 bg-white p-4 shadow-2xl"
          style={{ marginRight: 20, marginTop: filterPanelTopOffset, maxHeight: filterPanelMaxHeight, width: filterPanelWidth }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="min-w-0 flex-1">
              <Text className="text-base font-bold text-slate-900">{t('petFeed.filtersTitle')}</Text>
              <Text className="mt-0.5 text-xs font-semibold text-slate-400">
                {filteredPosts.length}/{posts.length}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              {hasActiveFilters ? (
                <Pressable
                  accessibilityRole="button"
                  className="rounded-full px-3 py-2"
                  style={{ backgroundColor: BRAND.surfaceLight }}
                  onPress={resetFilters}
                >
                  <Text className="text-xs font-semibold" style={{ color: BRAND.textBrandLink }}>
                    {t('petFeed.resetFilters')}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" accessibilityLabel={t('petFeed.accessibility.closeFilters')} className="rounded-full bg-slate-100 p-2" onPress={() => { setProvincePickerOpen(false); setFilterVisible(false); }}>
              <Ionicons name="close" size={18} color="#64748b" />
              </Pressable>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="rounded-2xl bg-slate-50 p-3">
              <Text className="mb-2 text-xs font-bold uppercase text-slate-500">{t('petFeed.filterProvinceTitle')}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('petFeed.filterProvinceTitle')}
                className="flex-row items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5"
                onPress={() => setProvincePickerOpen(true)}
              >
                <Text className="min-w-0 flex-1 pr-2 text-sm font-semibold text-slate-900" numberOfLines={1}>
                  {provinceFilter === ALL_PROVINCES_FILTER ? t('petFeed.filters.allProvinces') : provinceFilter}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#64748b" />
              </Pressable>
            </View>

            <View className="mt-3 rounded-2xl bg-slate-50 p-3">
              <Text className="mb-2 text-xs font-bold uppercase text-slate-500">{t('profile.gender')}</Text>
              <View className="flex-row flex-wrap gap-2">
                {genderFilterItems.map((item) => {
                  const active = genderFilter === item.key;
                  return (
                    <Pressable
                      key={item.key}
                      accessibilityRole="button"
                      accessibilityLabel={item.label}
                      accessibilityState={{ selected: active }}
                      className="flex-row items-center gap-1.5 rounded-full px-3 py-2"
                      style={{
                        borderWidth: 1,
                        borderColor: active ? BRAND.btnPrimary : '#E5E7EB',
                        backgroundColor: active ? BRAND.btnPrimary : BRAND.card,
                      }}
                      onPress={() => setGenderFilter((current) => (current === item.key ? 'all' : item.key))}
                    >
                      <Ionicons name={item.icon} size={14} color={active ? BRAND.textInverse : BRAND.textMuted} />
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: active ? BRAND.textInverse : BRAND.textSecondary }}
                      >
                        {item.label}
                      </Text>
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: active ? BRAND.btnSecondaryPressed : BRAND.textMuted }}
                      >
                        {item.count}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="mt-3 rounded-2xl bg-slate-50 p-3">
              <Text className="mb-2 text-xs font-bold uppercase text-slate-500">{t('petFeed.sortTitle')}</Text>
              <View className="flex-row gap-1.5">
                {sortItems.map((item) => {
                  const active = sortField === item.key;
                  const directionIcon = sortDirection === 'asc' ? 'arrow-up-outline' : 'arrow-down-outline';
                  return (
                    <Pressable
                      key={item.key}
                      accessibilityRole="button"
                      accessibilityLabel={item.label}
                      accessibilityState={{ selected: active }}
                      className="flex-1 flex-row items-center justify-center gap-1 rounded-full px-2 py-2"
                      style={{
                        borderWidth: 1,
                        borderColor: active ? BRAND.btnPrimary : '#E5E7EB',
                        backgroundColor: active ? BRAND.btnPrimary : BRAND.card,
                      }}
                      onPress={() => toggleSort(item.key)}
                    >
                      <Ionicons name={item.icon} size={13} color={active ? BRAND.textInverse : BRAND.textMuted} />
                      <Text
                        className="min-w-0 text-[11px] font-semibold"
                        style={{ color: active ? BRAND.textInverse : BRAND.textSecondary }}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                      {active ? <Ionicons name={directionIcon} size={13} color={BRAND.textInverse} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
    <Modal visible={provincePickerOpen} transparent animationType="fade" onRequestClose={() => setProvincePickerOpen(false)}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => setProvincePickerOpen(false)} />
        <View className="max-h-[70%] rounded-t-2xl bg-white px-4 pt-2">
          <View className="mb-2 self-center rounded-full bg-gray-200 px-10 py-1" />
          <Text className="mb-3 text-center text-sm font-semibold text-slate-500">{t('petFeed.filterProvinceTitle')}</Text>
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }}>
            <Pressable
              accessibilityRole="button"
              className="border-b border-gray-100 py-3.5 active:bg-gray-50"
              onPress={() => {
                setProvinceFilter(ALL_PROVINCES_FILTER);
                setProvincePickerOpen(false);
              }}
            >
              <Text
                className={`text-center text-base ${provinceFilter === ALL_PROVINCES_FILTER ? 'font-bold' : 'font-normal'}`}
                style={{
                  color: provinceFilter === ALL_PROVINCES_FILTER ? BRAND.textBrandLink : BRAND.textPrimary,
                }}
              >
                {t('petFeed.filters.allProvinces')}
              </Text>
            </Pressable>
            {VIETNAM_PROVINCES.map((province) => {
              const active = provinceFilter === province;
              return (
                <Pressable
                  key={province}
                  accessibilityRole="button"
                  className="border-b border-gray-100 py-3.5 active:bg-gray-50"
                  onPress={() => {
                    setProvinceFilter(province);
                    setProvincePickerOpen(false);
                  }}
                >
                  <Text
                    className={`text-center text-base ${active ? 'font-bold' : 'font-normal'}`}
                    style={{
                      color: active ? BRAND.textBrandLink : BRAND.textPrimary,
                    }}
                  >
                    {province}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable className="py-3" onPress={() => setProvincePickerOpen(false)}>
            <Text className="text-center text-base" style={{ color: BRAND.textBrandLink }}>
              {t('common.cancel')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
    <ModalScreenShell
      visible={selectedAnnouncementId != null}
      title={t('petFeed.newsDetailTitle')}
      closeLabel={t('petFeed.accessibility.closeNewsDetail')}
      closeTestID="announcement-detail-back-button"
      onClose={() => setSelectedAnnouncementId(null)}
    >
      {selectedAnnouncement ? <AdminPostCard post={selectedAnnouncement} /> : null}
    </ModalScreenShell>
    </>
  );
}
