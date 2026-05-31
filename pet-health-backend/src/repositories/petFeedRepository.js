import { randomUUID } from 'node:crypto';
import { createSupabaseWithUserAccessToken, getSupabaseServiceClient } from '../config/supabase.js';

const POST_STATUSES = new Set(['draft', 'pending_review', 'published', 'archived']);
const VERIFICATION_STATUSES = new Set(['unverified', 'pending_review', 'verified', 'suspended']);
const memoryProfiles = [];
const memoryPosts = [];
const memoryFavorites = [];

function getFeedSupabase(accessToken) {
  const withJwt = createSupabaseWithUserAccessToken(accessToken);
  if (withJwt) return withJwt;
  return getSupabaseServiceClient();
}

function trimText(value, max = 2000) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeStatus(value, fallback = 'draft') {
  const status = trimText(value, 32).toLowerCase();
  return POST_STATUSES.has(status) ? status : fallback;
}

function normalizeVerificationStatus(value) {
  const status = trimText(value, 32).toLowerCase();
  return VERIFICATION_STATUSES.has(status) ? status : 'unverified';
}

function normalizeJsonObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeStringArray(value, limit = 8) {
  return Array.isArray(value) ? value.map((item) => trimText(item, 500)).filter(Boolean).slice(0, limit) : [];
}

function normalizeProfilePayload(userId, payload, existingId) {
  return {
    id: existingId ?? payload.id ?? randomUUID(),
    user_id: userId,
    display_name: trimText(payload.displayName ?? payload.display_name, 120) || 'Pet breeder',
    bio: trimText(payload.bio, 1200),
    location: trimText(payload.location, 160),
    avatar_url: trimText(payload.avatarUrl ?? payload.avatar_url, 1000) || null,
    contact: normalizeJsonObject(payload.contact),
    verification_status: normalizeVerificationStatus(payload.verificationStatus ?? payload.verification_status),
    metadata: normalizeJsonObject(payload.metadata),
    updated_at: new Date().toISOString(),
  };
}

function normalizePostPayload(userId, payload, existing = {}) {
  const metadata = normalizeJsonObject(payload.metadata);
  return {
    id: existing.id ?? payload.id ?? randomUUID(),
    user_id: userId,
    breeder_profile_id: payload.breederProfileId ?? payload.breeder_profile_id ?? existing.breeder_profile_id ?? null,
    title: trimText(payload.title, 180) || 'Pet looking for a home',
    species: trimText(payload.species, 32).toLowerCase(),
    breed: trimText(payload.breed, 120),
    gender: trimText(payload.gender, 32).toLowerCase(),
    age_months: Number.isFinite(Number(payload.ageMonths ?? payload.age_months))
      ? Math.max(0, Math.round(Number(payload.ageMonths ?? payload.age_months)))
      : null,
    location: trimText(payload.location, 160),
    price_note: trimText(payload.priceNote ?? payload.price_note, 160),
    description: trimText(payload.description, 4000),
    personality: normalizeStringArray(payload.personality, 8),
    vaccine_status: trimText(payload.vaccineStatus ?? payload.vaccine_status, 300),
    deworming_status: trimText(payload.dewormingStatus ?? payload.deworming_status, 300),
    paperwork: normalizeStringArray(payload.paperwork, 10),
    media_urls: normalizeStringArray(payload.mediaUrls ?? payload.media_urls, 10),
    contact: normalizeJsonObject(payload.contact),
    status: normalizeStatus(payload.status, existing.status ?? 'draft'),
    metadata,
    updated_at: new Date().toISOString(),
  };
}

function toProfile(row) {
  if (!row) return row;
  return {
    id: row.id,
    user_id: row.user_id,
    display_name: row.display_name,
    bio: row.bio ?? '',
    location: row.location ?? '',
    avatar_url: row.avatar_url ?? null,
    contact: row.contact ?? {},
    verification_status: row.verification_status ?? 'unverified',
    metadata: row.metadata ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toPost(row, favoriteIds = new Set(), profilesById = new Map()) {
  if (!row) return row;
  return {
    id: row.id,
    user_id: row.user_id,
    breeder_profile_id: row.breeder_profile_id,
    title: row.title,
    species: row.species,
    breed: row.breed,
    gender: row.gender,
    age_months: row.age_months,
    location: row.location,
    price_note: row.price_note,
    description: row.description,
    personality: row.personality ?? [],
    vaccine_status: row.vaccine_status,
    deworming_status: row.deworming_status,
    paperwork: row.paperwork ?? [],
    media_urls: row.media_urls ?? [],
    contact: row.contact ?? {},
    status: row.status,
    metadata: row.metadata ?? {},
    breeder_profile: profilesById.get(row.breeder_profile_id) ?? row.breeder_profile ?? null,
    is_favorited: favoriteIds.has(row.id),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function favoriteIdsForUser(supabase, userId) {
  const { data, error } = await supabase.from('pet_feed_favorites').select('post_id').eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.post_id));
}

export async function listPublishedPetFeedPosts(userId, accessToken) {
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    const favoriteIds = new Set(memoryFavorites.filter((row) => row.user_id === userId).map((row) => row.post_id));
    const profilesById = new Map(memoryProfiles.map((profile) => [profile.id, toProfile(profile)]));
    return memoryPosts
      .filter((post) => post.status === 'published')
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((post) => toPost(post, favoriteIds, profilesById));
  }

  const favoriteIds = await favoriteIdsForUser(supabase, userId);
  const { data, error } = await supabase
    .from('pet_feed_posts')
    .select('*, breeder_profile:breeder_profiles(*)')
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => toPost(row, favoriteIds));
}

export async function getPetFeedPost(userId, postId, accessToken) {
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    const favoriteIds = new Set(memoryFavorites.filter((row) => row.user_id === userId).map((row) => row.post_id));
    const profilesById = new Map(memoryProfiles.map((profile) => [profile.id, toProfile(profile)]));
    return toPost(memoryPosts.find((post) => post.id === postId && (post.status === 'published' || post.user_id === userId)), favoriteIds, profilesById);
  }
  const favoriteIds = await favoriteIdsForUser(supabase, userId);
  const { data, error } = await supabase
    .from('pet_feed_posts')
    .select('*, breeder_profile:breeder_profiles(*)')
    .eq('id', postId)
    .or(`status.eq.published,user_id.eq.${userId}`)
    .maybeSingle();
  if (error) throw error;
  return toPost(data, favoriteIds);
}

export async function getMyBreederProfile(userId, accessToken) {
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) return toProfile(memoryProfiles.find((profile) => profile.user_id === userId) ?? null);
  const { data, error } = await supabase.from('breeder_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return toProfile(data);
}

export async function upsertMyBreederProfile(userId, payload, accessToken) {
  const existing = await getMyBreederProfile(userId, accessToken);
  const row = normalizeProfilePayload(userId, payload, existing?.id);
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    const idx = memoryProfiles.findIndex((profile) => profile.user_id === userId);
    const next = { ...(idx >= 0 ? memoryProfiles[idx] : { created_at: new Date().toISOString() }), ...row };
    if (idx >= 0) memoryProfiles[idx] = next;
    else memoryProfiles.push(next);
    return toProfile(next);
  }
  const { data, error } = await supabase.from('breeder_profiles').upsert(row, { onConflict: 'user_id' }).select('*').single();
  if (error) throw error;
  return toProfile(data);
}

export async function createPetFeedPost(userId, payload, accessToken) {
  const profile = await getMyBreederProfile(userId, accessToken);
  const row = {
    ...normalizePostPayload(userId, { ...payload, breederProfileId: profile?.id }),
    status: normalizeStatus(payload.status, 'draft'),
    created_at: new Date().toISOString(),
  };
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    memoryPosts.push(row);
    return toPost(row, new Set(), new Map(profile ? [[profile.id, profile]] : []));
  }
  const { data, error } = await supabase.from('pet_feed_posts').insert(row).select('*, breeder_profile:breeder_profiles(*)').single();
  if (error) throw error;
  return toPost(data);
}

export async function updatePetFeedPost(userId, postId, payload, accessToken) {
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    const idx = memoryPosts.findIndex((post) => post.id === postId && post.user_id === userId);
    if (idx < 0) return null;
    memoryPosts[idx] = { ...memoryPosts[idx], ...normalizePostPayload(userId, payload, memoryPosts[idx]) };
    return toPost(memoryPosts[idx]);
  }
  const existing = await getPetFeedPost(userId, postId, accessToken);
  if (!existing || existing.user_id !== userId) return null;
  const updates = normalizePostPayload(userId, payload, existing);
  const { id: _id, user_id: _userId, ...patch } = updates;
  const { data, error } = await supabase
    .from('pet_feed_posts')
    .update(patch)
    .eq('id', postId)
    .eq('user_id', userId)
    .select('*, breeder_profile:breeder_profiles(*)')
    .maybeSingle();
  if (error) throw error;
  return toPost(data);
}

export async function favoritePetFeedPost(userId, postId, accessToken) {
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    if (!memoryFavorites.some((row) => row.user_id === userId && row.post_id === postId)) {
      memoryFavorites.push({ user_id: userId, post_id: postId, created_at: new Date().toISOString() });
    }
    return true;
  }
  const { error } = await supabase.from('pet_feed_favorites').upsert({ user_id: userId, post_id: postId }, { onConflict: 'user_id,post_id' });
  if (error) throw error;
  return true;
}

export async function unfavoritePetFeedPost(userId, postId, accessToken) {
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    const idx = memoryFavorites.findIndex((row) => row.user_id === userId && row.post_id === postId);
    if (idx >= 0) memoryFavorites.splice(idx, 1);
    return true;
  }
  const { error } = await supabase.from('pet_feed_favorites').delete().eq('user_id', userId).eq('post_id', postId);
  if (error) throw error;
  return true;
}

export async function listFavoritePetFeedPosts(userId, accessToken) {
  const posts = await listPublishedPetFeedPosts(userId, accessToken);
  return posts.filter((post) => post.is_favorited);
}
