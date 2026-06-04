import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PetFeedPostCard } from '../components/PetFeedPostCard';
import type { PetFeedPost } from '../types';

const PRIMARY = '#1E6FE8';

type SpeciesFilter = 'all' | 'dog' | 'cat';
type SortField = 'date' | 'age' | 'price';
type SortDirection = 'asc' | 'desc';
type ChipItem<T extends string> = {
  key: T;
  label: string;
  count?: number;
  icon: keyof typeof Ionicons.glyphMap;
};

type PetFeedScreenProps = {
  posts: PetFeedPost[];
  refreshing: boolean;
  onRefresh: () => void;
  onToggleFavorite: (post: PetFeedPost) => void;
  onReportPost: (post: PetFeedPost, reason: string, note?: string) => void;
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

export function PetFeedScreen({ posts, refreshing, onRefresh, onToggleFavorite, onReportPost }: PetFeedScreenProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<SpeciesFilter>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const searchMatchedPosts = useMemo(() => {
    const q = normalizeSearchText(query);
    if (!q) return posts;
    return posts.filter((post) => searchableText(post).includes(q));
  }, [posts, query]);

  const speciesFilterItems = useMemo<ChipItem<SpeciesFilter>[]>(() => {
    const dogCount = searchMatchedPosts.filter((post) => post.species.toLowerCase() === 'dog').length;
    const catCount = searchMatchedPosts.filter((post) => post.species.toLowerCase() === 'cat').length;
    return [
      { key: 'all', label: t('petFeed.filters.all'), count: searchMatchedPosts.length, icon: 'apps-outline' },
      { key: 'dog', label: t('petFeed.filters.dog'), count: dogCount, icon: 'paw-outline' },
      { key: 'cat', label: t('petFeed.filters.cat'), count: catCount, icon: 'paw-outline' },
    ];
  }, [searchMatchedPosts, t]);

  const sortItems = useMemo<ChipItem<SortField>[]>(() => [
    { key: 'date', label: t('petFeed.sort.date'), icon: 'time-outline' },
    { key: 'age', label: t('petFeed.sort.age'), icon: 'calendar-outline' },
    { key: 'price', label: t('petFeed.sort.price'), icon: 'cash-outline' },
  ], [t]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortField(field);
    setSortDirection(field === 'date' ? 'desc' : 'asc');
  }

  const filteredPosts = useMemo(() => {
    const bySpecies = speciesFilter === 'all'
      ? searchMatchedPosts
      : searchMatchedPosts.filter((post) => post.species.toLowerCase() === speciesFilter);
    return [...bySpecies].sort((a, b) => {
      if (sortField === 'age') return compareMaybeNumber(a.age_months, b.age_months, sortDirection);
      if (sortField === 'price') return compareMaybeNumber(priceValue(a), priceValue(b), sortDirection);
      return sortDirection === 'asc' ? createdTime(a) - createdTime(b) : createdTime(b) - createdTime(a);
    });
  }, [searchMatchedPosts, sortDirection, sortField, speciesFilter]);

  return (
    <ScrollView
      testID="pet-feed-screen"
      className="flex-1 bg-[#F2F4F8] px-5 pb-6 pt-5"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-3 flex-row items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3">
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

      <View className="mb-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {speciesFilterItems.map((item) => {
              const active = speciesFilter === item.key;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 ${
                    active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-slate-50'
                  }`}
                  onPress={() => setSpeciesFilter(item.key)}
                >
                  <Ionicons name={item.icon} size={15} color={active ? PRIMARY : '#64748b'} />
                  <Text className={`text-sm font-bold ${active ? 'text-blue-700' : 'text-slate-700'}`}>{item.label}</Text>
                  <Text className={`text-xs font-bold ${active ? 'text-blue-600' : 'text-slate-400'}`}>{item.count}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-3">
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Ionicons name="swap-vertical-outline" size={16} color="#64748b" />
            <Text className="text-sm font-bold text-slate-900">{t('petFeed.sortTitle')}</Text>
          </View>
          <Text className="text-xs font-semibold text-slate-400">
            {filteredPosts.length}/{posts.length}
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {sortItems.map((item) => {
              const active = sortField === item.key;
              const directionIcon = sortDirection === 'asc' ? 'arrow-up-outline' : 'arrow-down-outline';
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 ${
                    active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-slate-50'
                  }`}
                  onPress={() => toggleSort(item.key)}
                >
                  <Ionicons name={item.icon} size={15} color={active ? PRIMARY : '#64748b'} />
                  <Text className={`text-sm font-bold ${active ? 'text-blue-700' : 'text-slate-700'}`}>{item.label}</Text>
                  {active ? <Ionicons name={directionIcon} size={14} color={PRIMARY} /> : null}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

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
              onToggleFavorite={onToggleFavorite}
              onReportPost={onReportPost}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
