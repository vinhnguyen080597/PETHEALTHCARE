import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PetFeedPostCard } from '../components/PetFeedPostCard';
import type { BreederProfile, PetFeedPost } from '../types';
import { computeBreederTrust, metadataString } from '../utils/breederTrust';

const PRIMARY = '#1E6FE8';

type SpeciesFilter = 'all' | 'dog' | 'cat';
type GenderFilter = 'all' | 'male' | 'female';
type SortField = 'date' | 'age' | 'price';
type SortDirection = 'asc' | 'desc';
type FeedTab = 'feed' | 'breeders';
type ChipItem<T extends string> = {
  key: T;
  label: string;
  count?: number;
  icon: keyof typeof Ionicons.glyphMap;
};

type PetFeedScreenProps = {
  posts: PetFeedPost[];
  breederProfiles: BreederProfile[];
  refreshing: boolean;
  onRefresh: () => void;
  onToggleFavorite: (post: PetFeedPost) => void;
  onReportPost: (post: PetFeedPost, reason: string, note?: string) => void;
  onHideBreeder: (profile: BreederProfile) => void;
  onOpenBreederDetail: (profileId: string) => void;
};

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

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

function createdTime(post: PetFeedPost) {
  const time = new Date(post.created_at).getTime();
  return Number.isFinite(time) ? time : 0;
}

function priceValue(post: PetFeedPost) {
  const raw = normalizeSearchText(post.price_note);
  if (!raw) return null;
  const match = raw.replace(/,/g, '.').match(/\d+(\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  if (!Number.isFinite(value)) return null;
  if (/\b(trieu|million|m)\b/.test(raw)) return value * 1_000_000;
  if (/\b(k|nghin|ngan|thousand)\b/.test(raw)) return value * 1_000;
  return value;
}

function compareMaybeNumber(a: number | null, b: number | null, direction: 'asc' | 'desc') {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return direction === 'asc' ? a - b : b - a;
}

function genderGroup(post: PetFeedPost): Exclude<GenderFilter, 'all'> | 'unknown' {
  const value = normalizeSearchText(post.gender);
  if (value.includes('female') || value.includes('cai')) return 'female';
  if (value.includes('male') || value.includes('duc')) return 'male';
  return 'unknown';
}

type TopBreeder = {
  profile: BreederProfile;
  postCount: number;
  latestPostAt: number;
  species: string[];
  posts: PetFeedPost[];
};

export function PetFeedScreen({ posts, breederProfiles, refreshing, onRefresh, onToggleFavorite, onReportPost, onHideBreeder, onOpenBreederDetail }: PetFeedScreenProps) {
  const { t } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<FeedTab>('feed');
  const [query, setQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<SpeciesFilter>('all');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const normalizedQuery = useMemo(() => normalizeSearchText(query), [query]);
  const searchMatchedPosts = useMemo(() => {
    if (!normalizedQuery) return posts;
    return posts.filter((post) => searchableText(post).includes(normalizedQuery));
  }, [normalizedQuery, posts]);

  const speciesFilterItems = useMemo<ChipItem<SpeciesFilter>[]>(() => {
    const dogCount = searchMatchedPosts.filter((post) => post.species.toLowerCase() === 'dog').length;
    const catCount = searchMatchedPosts.filter((post) => post.species.toLowerCase() === 'cat').length;
    return [
      { key: 'dog', label: t('petFeed.filters.dog'), count: dogCount, icon: 'paw-outline' },
      { key: 'cat', label: t('petFeed.filters.cat'), count: catCount, icon: 'paw-outline' },
    ];
  }, [searchMatchedPosts, t]);

  const sortItems = useMemo<ChipItem<SortField>[]>(() => [
    { key: 'age', label: t('petFeed.sort.age'), icon: 'calendar-outline' },
    { key: 'price', label: t('petFeed.sort.price'), icon: 'cash-outline' },
  ], [t]);

  const speciesMatchedPosts = useMemo(() => {
    return speciesFilter === 'all'
      ? searchMatchedPosts
      : searchMatchedPosts.filter((post) => post.species.toLowerCase() === speciesFilter);
  }, [searchMatchedPosts, speciesFilter]);

  const genderFilterItems = useMemo<ChipItem<GenderFilter>[]>(() => {
    const maleCount = speciesMatchedPosts.filter((post) => genderGroup(post) === 'male').length;
    const femaleCount = speciesMatchedPosts.filter((post) => genderGroup(post) === 'female').length;
    return [
      { key: 'male', label: t('gender.male'), count: maleCount, icon: 'male-outline' },
      { key: 'female', label: t('gender.female'), count: femaleCount, icon: 'female-outline' },
    ];
  }, [speciesMatchedPosts, t]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortField(field);
    setSortDirection(field === 'date' ? 'desc' : 'asc');
  }

  function translatedOption(namespace: string, value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return '';
    const key = `${namespace}.${normalized}`;
    const translated = t(key);
    return translated === key ? value : translated;
  }

  const filteredPosts = useMemo(() => {
    const byGender = genderFilter === 'all'
      ? speciesMatchedPosts
      : speciesMatchedPosts.filter((post) => genderGroup(post) === genderFilter);
    return [...byGender].sort((a, b) => {
      if (sortField === 'age') return compareMaybeNumber(a.age_months, b.age_months, sortDirection);
      if (sortField === 'price') return compareMaybeNumber(priceValue(a), priceValue(b), sortDirection);
      return sortDirection === 'asc' ? createdTime(a) - createdTime(b) : createdTime(b) - createdTime(a);
    });
  }, [genderFilter, sortDirection, sortField, speciesMatchedPosts]);
  const selectedPost = selectedPostId ? posts.find((post) => post.id === selectedPostId) ?? null : null;
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
    return Array.from(byBreeder.values()).sort((a, b) => {
      if (b.postCount !== a.postCount) return b.postCount - a.postCount;
      return b.latestPostAt - a.latestPostAt;
    });
  }, [breederProfiles, posts]);

  const filteredTopBreeders = useMemo(() => {
    if (!normalizedQuery) return topBreeders;
    return topBreeders.filter((item) => {
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
  }, [normalizedQuery, topBreeders]);
  const filterPanelWidth = Math.min(Math.round(windowWidth * 0.76), 330);
  const filterPanelMaxHeight = Math.min(Math.round(windowHeight * 0.58), 480);
  const filterPanelTopOffset = Math.min(Math.round(windowHeight * 0.2), 112);
  const hasActiveFilters = speciesFilter !== 'all' || genderFilter !== 'all' || sortField !== 'date' || sortDirection !== 'desc';

  return (
    <>
    <ScrollView
      testID="pet-feed-screen"
      className="flex-1 bg-[#F2F4F8] pb-6"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-center gap-2 bg-white px-5 pb-3 pt-4">
        <View className="min-w-0 flex-1 flex-row items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2">
            <Ionicons name="search-outline" size={20} color="#64748b" />
            <TextInput
              testID="pet-feed-search-input"
              className="min-w-0 flex-1 text-base text-slate-900"
              placeholder={t('petFeed.searchPlaceholder')}
              placeholderTextColor="#94a3b8"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            {query.trim() ? (
              <Pressable accessibilityRole="button" onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={20} color="#94a3b8" />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            testID="pet-feed-filter-sidebar-button"
            accessibilityRole="button"
            accessibilityLabel="Open pet feed filters"
            className={`h-9 w-9 items-center justify-center rounded-xl border ${
              hasActiveFilters ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-slate-50'
            }`}
            onPress={() => setFilterVisible(true)}
          >
            <Ionicons name="menu-outline" size={22} color={hasActiveFilters ? PRIMARY : '#64748b'} />
          </Pressable>
      </View>

      <View className="mb-4 border-b border-gray-200 bg-white px-3 pb-3">
        <View className="flex-row rounded-2xl border border-blue-100 bg-blue-50/40 p-1">
          {([
            { key: 'feed' as const, label: t('petFeed.tabs.feed'), count: posts.length, icon: 'newspaper-outline' as const },
            { key: 'breeders' as const, label: t('petFeed.tabs.breeders'), count: topBreeders.length, icon: 'ribbon-outline' as const },
          ]).map((item) => {
            const active = activeTab === item.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl px-3 py-3 ${
                  active ? 'bg-blue-600' : 'bg-transparent'
                }`}
                onPress={() => setActiveTab(item.key)}
              >
                <Ionicons name={item.icon} size={17} color={active ? '#fff' : PRIMARY} />
                <Text className={`text-sm font-bold ${active ? 'text-white' : 'text-blue-700'}`}>{item.label}</Text>
                <Text className={`text-xs font-bold ${active ? 'text-blue-100' : 'text-slate-400'}`}>{item.count}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {activeTab === 'feed' ? (
        <View className="px-5">
      {posts.length === 0 ? (
        <View className="items-center rounded-2xl border border-gray-200 bg-white px-5 py-12">
          <Ionicons name="newspaper-outline" size={42} color={PRIMARY} />
          <Text className="mt-4 text-center text-base font-bold text-slate-900">{t('petFeed.emptyTitle')}</Text>
          <Text className="mt-2 text-center text-sm leading-5 text-slate-500">{t('petFeed.emptyBody')}</Text>
        </View>
      ) : filteredPosts.length === 0 ? (
        <View className="items-center rounded-2xl border border-gray-200 bg-white px-5 py-10">
          <Ionicons name="filter-outline" size={38} color={PRIMARY} />
          <Text className="mt-4 text-center text-base font-bold text-slate-900">{t('petFeed.emptyFilteredTitle')}</Text>
          <Text className="mt-2 text-center text-sm leading-5 text-slate-500">{t('petFeed.emptyFilteredBody')}</Text>
        </View>
      ) : (
        <View className="gap-4">
          {filteredPosts.map((post) => (
            <PetFeedPostCard
              key={post.id}
              post={post}
              variant="compact"
              autoPlayVideo={false}
              showFavorite={false}
              showContact={false}
              showReport={false}
              onPress={(item) => setSelectedPostId(item.id)}
            />
          ))}
        </View>
      )}
        </View>
      ) : (
        <View className="gap-3 px-5">
          {topBreeders.length === 0 ? (
            <View className="items-center rounded-2xl border border-gray-200 bg-white px-5 py-12">
              <Ionicons name="ribbon-outline" size={42} color={PRIMARY} />
              <Text className="mt-4 text-center text-base font-bold text-slate-900">{t('petFeed.topBreeders.emptyTitle')}</Text>
              <Text className="mt-2 text-center text-sm leading-5 text-slate-500">{t('petFeed.topBreeders.emptyBody')}</Text>
            </View>
          ) : null}
          {topBreeders.length > 0 && filteredTopBreeders.length === 0 ? (
            <View className="items-center rounded-2xl border border-gray-200 bg-white px-5 py-10">
              <Ionicons name="search-outline" size={38} color={PRIMARY} />
              <Text className="mt-4 text-center text-base font-bold text-slate-900">{t('petFeed.emptyFilteredTitle')}</Text>
              <Text className="mt-2 text-center text-sm leading-5 text-slate-500">{t('petFeed.emptyFilteredBody')}</Text>
            </View>
          ) : null}
          {filteredTopBreeders.map((item, index) => {
            const profile = item.profile;
            const species = profile.primary_species.length ? profile.primary_species : item.species;
            const breeds = profile.main_breeds.join(', ');
            const scaleRange = metadataString(profile.metadata, 'scaleRange');
            const breederType = metadataString(profile.metadata, 'breederType');
            const trust = computeBreederTrust(profile, item.posts);
            const speciesLabel = species.map((value) => translatedOption('breederProfile.speciesOptions', value)).filter(Boolean).join(', ');
            const scaleLabel = scaleRange ? t(`breederProfile.scaleOptions.${scaleRange}`) : t('petFeed.topBreeders.notUpdated');
            const breederTypeLabel = breederType ? t(`breederProfile.breederTypes.${breederType}`) : '';
            return (
              <View key={profile.id || profile.user_id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <View className="flex-row items-start gap-3">
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                    <Text className="text-base font-black text-blue-700">#{index + 1}</Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className="text-base font-bold text-slate-900" numberOfLines={2}>
                        {profile.display_name || t('petFeed.breederFallback')}
                      </Text>
                      <Text className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        {t('petFeed.topBreeders.verified')}
                      </Text>
                    </View>
                    <Text className="mt-1 text-sm text-slate-500" numberOfLines={2}>
                      {[profile.location, speciesLabel].filter(Boolean).join(' - ') || t('petFeed.locationUnknown')}
                    </Text>
                  </View>
                </View>
                {profile.bio || profile.care_environment || breeds ? (
                  <Text className="mt-3 text-sm leading-5 text-slate-700" numberOfLines={3}>
                    {profile.bio || profile.care_environment || breeds}
                  </Text>
                ) : null}
                <View className="mt-4 flex-row gap-2">
                  <View className="flex-1 rounded-xl bg-slate-50 px-3 py-2.5">
                    <Text className="text-xs font-bold uppercase text-slate-500">{t('petFeed.topBreeders.trustScore')}</Text>
                    <Text className="mt-1 text-base font-bold text-slate-900">{trust.score}/100</Text>
                  </View>
                  <View className="flex-1 rounded-xl bg-slate-50 px-3 py-2.5">
                    <Text className="text-xs font-bold uppercase text-slate-500">{t('petFeed.topBreeders.scale')}</Text>
                    <Text className="mt-1 text-sm font-bold text-slate-900" numberOfLines={1}>{scaleLabel}</Text>
                  </View>
                </View>
                <View className="mt-2 flex-row gap-2">
                  <View className="flex-1 rounded-xl bg-slate-50 px-3 py-2.5">
                    <Text className="text-xs font-bold uppercase text-slate-500">{t('petFeed.topBreeders.posts')}</Text>
                    <Text className="mt-1 text-base font-bold text-slate-900">{item.postCount}</Text>
                  </View>
                  <View className="flex-1 rounded-xl bg-slate-50 px-3 py-2.5">
                    <Text className="text-xs font-bold uppercase text-slate-500">{t('petFeed.topBreeders.type')}</Text>
                    <Text className="mt-1 text-sm font-bold text-slate-900" numberOfLines={1}>
                      {breederTypeLabel || t('petFeed.topBreeders.notUpdated')}
                    </Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  className="mt-4 flex-row items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 py-3 active:bg-blue-100"
                  onPress={() => onOpenBreederDetail(profile.id || profile.user_id)}
                >
                  <Ionicons name="storefront-outline" size={17} color={PRIMARY} />
                  <Text className="text-sm font-bold text-blue-700">{t('petFeed.topBreeders.viewProfile')}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
    <Modal visible={filterVisible} transparent animationType="fade" onRequestClose={() => setFilterVisible(false)}>
      <View className="flex-1">
        <Pressable className="absolute inset-0" accessibilityRole="button" accessibilityLabel="Close filters" onPress={() => setFilterVisible(false)} />
        <View
          className="self-end rounded-3xl border border-gray-200 bg-white p-4 shadow-2xl"
          style={{ marginRight: 20, marginTop: filterPanelTopOffset, maxHeight: filterPanelMaxHeight, width: filterPanelWidth }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="min-w-0 flex-1">
              <Text className="text-base font-black text-slate-900">{t('petFeed.filtersTitle')}</Text>
              <Text className="mt-0.5 text-xs font-semibold text-slate-400">
                {filteredPosts.length}/{posts.length}
              </Text>
            </View>
            <Pressable accessibilityRole="button" className="rounded-full bg-slate-100 p-2" onPress={() => setFilterVisible(false)}>
              <Ionicons name="close" size={18} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="rounded-2xl bg-slate-50 p-3">
              <Text className="mb-2 text-xs font-bold uppercase text-slate-500">{t('petFeed.filtersTitle')}</Text>
              <View className="flex-row flex-wrap gap-2">
                {speciesFilterItems.map((item) => {
                  const active = speciesFilter === item.key;
                  return (
                    <Pressable
                      key={item.key}
                      accessibilityRole="button"
                      className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 ${
                        active ? 'border-blue-600 bg-blue-600' : 'border-gray-200 bg-white'
                      }`}
                      onPress={() => setSpeciesFilter((current) => (current === item.key ? 'all' : item.key))}
                    >
                      <Ionicons name={item.icon} size={14} color={active ? '#fff' : '#64748b'} />
                      <Text className={`text-xs font-black ${active ? 'text-white' : 'text-slate-700'}`}>{item.label}</Text>
                      <Text className={`text-xs font-black ${active ? 'text-blue-100' : 'text-slate-400'}`}>{item.count}</Text>
                    </Pressable>
                  );
                })}
              </View>
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
                      className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 ${
                        active ? 'border-blue-600 bg-blue-600' : 'border-gray-200 bg-white'
                      }`}
                      onPress={() => setGenderFilter((current) => (current === item.key ? 'all' : item.key))}
                    >
                      <Ionicons name={item.icon} size={14} color={active ? '#fff' : '#64748b'} />
                      <Text className={`text-xs font-black ${active ? 'text-white' : 'text-slate-700'}`}>{item.label}</Text>
                      <Text className={`text-xs font-black ${active ? 'text-blue-100' : 'text-slate-400'}`}>{item.count}</Text>
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
                      className={`flex-1 flex-row items-center justify-center gap-1 rounded-full border px-2 py-2 ${
                        active ? 'border-blue-600 bg-blue-600' : 'border-gray-200 bg-white'
                      }`}
                      onPress={() => toggleSort(item.key)}
                    >
                      <Ionicons name={item.icon} size={13} color={active ? '#fff' : '#64748b'} />
                      <Text className={`min-w-0 text-[11px] font-black ${active ? 'text-white' : 'text-slate-700'}`} numberOfLines={1}>
                        {item.label}
                      </Text>
                      {active ? <Ionicons name={directionIcon} size={13} color="#fff" /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
    <Modal visible={Boolean(selectedPost)} animationType="slide" onRequestClose={() => setSelectedPostId(null)}>
      <View className="flex-1 bg-[#F2F4F8]">
        <View className="flex-row items-center border-b border-gray-200 bg-white px-2 py-2">
          <Pressable className="w-14 rounded-lg p-2" onPress={() => setSelectedPostId(null)}>
            <Ionicons name="close" size={24} color="#1e293b" />
          </Pressable>
          <Text className="flex-1 text-center text-lg font-semibold text-slate-900">{t('petFeed.detailTitle')}</Text>
          <View className="w-14" />
        </View>
        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}>
          {selectedPost ? (
            <PetFeedPostCard
              post={selectedPost}
              onToggleFavorite={onToggleFavorite}
              onReportPost={onReportPost}
              onHideBreeder={onHideBreeder}
              showHideBreeder
              autoPlayVideo={false}
              testID={`pet-feed-detail-post-${selectedPost.id}`}
            />
          ) : null}
        </ScrollView>
      </View>
    </Modal>
    </>
  );
}
