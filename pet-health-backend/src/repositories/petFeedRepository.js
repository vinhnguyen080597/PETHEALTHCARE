import { randomUUID } from 'node:crypto';
import { createSupabaseWithUserAccessToken, getSupabaseServiceClient } from '../config/supabase.js';

const POST_STATUSES = new Set(['draft', 'pending_review', 'published', 'archived']);
const VERIFICATION_STATUSES = new Set(['unverified', 'pending_review', 'verified', 'rejected', 'suspended']);
const memoryProfiles = [];
const memoryPosts = [];
const memoryFavorites = [];
const memoryReports = [];
const memoryBlockedBreeders = [];

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

function normalizeUserEditablePostStatus(value, existingStatus = 'draft') {
  const status = normalizeStatus(value, existingStatus);
  return status === 'pending_review' || status === 'draft' ? status : existingStatus;
}

function normalizeJsonObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeStringArray(value, limit = 8) {
  return Array.isArray(value) ? value.map((item) => trimText(item, 500)).filter(Boolean).slice(0, limit) : [];
}

function normalizeProfilePayload(userId, payload, existingId) {
  const existingStatus = normalizeVerificationStatus(payload.existingVerificationStatus);
  const nextStatus = existingStatus === 'verified' || existingStatus === 'suspended' ? existingStatus : 'pending_review';
  return {
    id: existingId ?? payload.id ?? randomUUID(),
    user_id: userId,
    display_name: trimText(payload.displayName ?? payload.display_name, 120) || 'Pet breeder',
    bio: trimText(payload.bio, 1200),
    location: trimText(payload.location, 160),
    avatar_url: trimText(payload.avatarUrl ?? payload.avatar_url, 1000) || null,
    contact: normalizeJsonObject(payload.contact),
    primary_species: normalizeStringArray(payload.primarySpecies ?? payload.primary_species, 2),
    main_breeds: normalizeStringArray(payload.mainBreeds ?? payload.main_breeds, 12),
    care_environment: trimText(payload.careEnvironment ?? payload.care_environment, 1500),
    verification_status: nextStatus,
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
    video_url: trimText(payload.videoUrl ?? payload.video_url, 1000) || null,
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
    primary_species: row.primary_species ?? [],
    main_breeds: row.main_breeds ?? [],
    care_environment: row.care_environment ?? '',
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
    video_url: row.video_url ?? null,
    contact: row.contact ?? {},
    status: row.status,
    metadata: row.metadata ?? {},
    breeder_profile: profilesById.get(row.breeder_profile_id) ?? row.breeder_profile ?? null,
    is_favorited: favoriteIds.has(row.id),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toReport(row) {
  if (!row) return row;
  return {
    id: row.id,
    user_id: row.user_id,
    target_type: row.target_type ?? (row.breeder_profile_id ? 'breeder_profile' : 'post'),
    post_id: row.post_id ?? null,
    breeder_profile_id: row.breeder_profile_id ?? null,
    breeder_profile: row.breeder_profile ?? null,
    reason: row.reason,
    note: row.note ?? '',
    status: row.status ?? 'open',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function assertVerifiedBreederProfile(profile) {
  if (profile?.verification_status === 'verified') return;
  const err = new Error('Breeder verification is required before creating or managing Pet Feed posts.');
  err.status = 403;
  err.code = 'BREEDER_VERIFICATION_REQUIRED';
  throw err;
}

async function favoriteIdsForUser(supabase, userId) {
  const { data, error } = await supabase.from('pet_feed_favorites').select('post_id').eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.post_id));
}

async function blockedBreederIdsForUser(supabase, userId) {
  const { data, error } = await supabase.from('pet_feed_blocked_breeders').select('breeder_profile_id').eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.breeder_profile_id));
}

export async function listPublishedPetFeedPosts(userId, accessToken) {
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    const favoriteIds = new Set(memoryFavorites.filter((row) => row.user_id === userId).map((row) => row.post_id));
    const blockedBreederIds = new Set(memoryBlockedBreeders.filter((row) => row.user_id === userId).map((row) => row.breeder_profile_id));
    const profilesById = new Map(memoryProfiles.map((profile) => [profile.id, toProfile(profile)]));
    return memoryPosts
      .filter((post) => post.status === 'published' && !blockedBreederIds.has(post.breeder_profile_id))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((post) => toPost(post, favoriteIds, profilesById));
  }

  const favoriteIds = await favoriteIdsForUser(supabase, userId);
  const blockedBreederIds = await blockedBreederIdsForUser(supabase, userId);
  const { data, error } = await supabase
    .from('pet_feed_posts')
    .select('*, breeder_profile:breeder_profiles(*)')
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).filter((row) => !blockedBreederIds.has(row.breeder_profile_id)).map((row) => toPost(row, favoriteIds));
}

export async function listVerifiedBreederProfiles(userId, accessToken) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const blockedBreederIds = new Set(memoryBlockedBreeders.filter((row) => row.user_id === userId).map((row) => row.breeder_profile_id));
    return memoryProfiles
      .filter((profile) => profile.verification_status === 'verified' && !blockedBreederIds.has(profile.id))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map(toProfile);
  }
  const blockedBreederIds = userId ? await blockedBreederIdsForUser(supabase, userId) : new Set();
  const { data, error } = await supabase
    .from('breeder_profiles')
    .select('*')
    .eq('verification_status', 'verified')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).filter((profile) => !blockedBreederIds.has(profile.id)).map(toProfile);
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
  const row = normalizeProfilePayload(userId, { ...payload, existingVerificationStatus: existing?.verification_status }, existing?.id);
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

export async function createPetFeedPost(userId, payload, accessToken, options = {}) {
  const profile = await getMyBreederProfile(userId, accessToken);
  if (!options.isAdmin) {
    assertVerifiedBreederProfile(profile);
  }
  const row = {
    ...normalizePostPayload(userId, { ...payload, breederProfileId: profile?.id }),
    status: options.isAdmin ? normalizeStatus(payload.status, 'published') : normalizeUserEditablePostStatus(payload.status, 'draft'),
    created_at: new Date().toISOString(),
  };
  const supabase = options.isAdmin ? (getSupabaseServiceClient() ?? getFeedSupabase(accessToken)) : getFeedSupabase(accessToken);
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
    const profile = await getMyBreederProfile(userId, accessToken);
    assertVerifiedBreederProfile(profile);
    memoryPosts[idx] = { ...memoryPosts[idx], ...normalizePostPayload(userId, payload, memoryPosts[idx]) };
    return toPost(memoryPosts[idx]);
  }
  const existing = await getPetFeedPost(userId, postId, accessToken);
  if (!existing || existing.user_id !== userId) return null;
  const profile = await getMyBreederProfile(userId, accessToken);
  assertVerifiedBreederProfile(profile);
  const updates = {
    ...normalizePostPayload(userId, payload, existing),
    status: normalizeUserEditablePostStatus(payload.status, existing.status),
  };
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

export async function listMyPetFeedPosts(userId, accessToken) {
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    const profilesById = new Map(memoryProfiles.map((profile) => [profile.id, toProfile(profile)]));
    return memoryPosts
      .filter((post) => post.user_id === userId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((post) => toPost(post, new Set(), profilesById));
  }
  const { data, error } = await supabase
    .from('pet_feed_posts')
    .select('*, breeder_profile:breeder_profiles(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => toPost(row));
}

export async function reportPetFeedPost(userId, postId, payload, accessToken) {
  const row = {
    id: randomUUID(),
    user_id: userId,
    target_type: 'post',
    post_id: postId,
    breeder_profile_id: null,
    reason: trimText(payload.reason, 120) || 'other',
    note: trimText(payload.note, 1200),
    status: 'open',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    memoryReports.push(row);
    return toReport(row);
  }
  const { data, error } = await supabase.from('pet_feed_reports').insert(row).select('*').single();
  if (error) throw error;
  return toReport(data);
}

export async function reportBreederProfile(userId, profileId, payload, accessToken) {
  const row = {
    id: randomUUID(),
    user_id: userId,
    target_type: 'breeder_profile',
    post_id: null,
    breeder_profile_id: profileId,
    reason: trimText(payload.reason, 120) || 'other',
    note: trimText(payload.note, 1200),
    status: 'open',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    const profile = memoryProfiles.find((item) => item.id === profileId) ?? null;
    memoryReports.push(row);
    return toReport({ ...row, breeder_profile: toProfile(profile) });
  }
  const { data, error } = await supabase
    .from('pet_feed_reports')
    .insert(row)
    .select('*, breeder_profile:breeder_profiles(*)')
    .single();
  if (error) throw error;
  return toReport(data);
}

export async function blockBreederProfile(userId, profileId, accessToken) {
  const row = {
    user_id: userId,
    breeder_profile_id: profileId,
    created_at: new Date().toISOString(),
  };
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    const exists = memoryBlockedBreeders.some((item) => item.user_id === userId && item.breeder_profile_id === profileId);
    if (!exists) memoryBlockedBreeders.push(row);
    return row;
  }
  const { data, error } = await supabase
    .from('pet_feed_blocked_breeders')
    .upsert(row, { onConflict: 'user_id,breeder_profile_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function unblockBreederProfile(userId, profileId, accessToken) {
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    const idx = memoryBlockedBreeders.findIndex((item) => item.user_id === userId && item.breeder_profile_id === profileId);
    if (idx >= 0) memoryBlockedBreeders.splice(idx, 1);
    return;
  }
  const { error } = await supabase
    .from('pet_feed_blocked_breeders')
    .delete()
    .eq('user_id', userId)
    .eq('breeder_profile_id', profileId);
  if (error) throw error;
}

export async function listAdminPetFeedPosts(status = 'pending_review') {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const profilesById = new Map(memoryProfiles.map((profile) => [profile.id, toProfile(profile)]));
    return memoryPosts
      .filter((post) => !status || post.status === status)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((post) => toPost(post, new Set(), profilesById));
  }
  let query = supabase.from('pet_feed_posts').select('*, breeder_profile:breeder_profiles(*)').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => toPost(row));
}

export async function adminUpdatePetFeedPostStatus(postId, status) {
  const safeStatus = normalizeStatus(status, '');
  if (!safeStatus) {
    const err = new Error('Invalid post status');
    err.status = 400;
    err.code = 'INVALID_POST_STATUS';
    throw err;
  }
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const idx = memoryPosts.findIndex((post) => post.id === postId);
    if (idx < 0) return null;
    memoryPosts[idx] = { ...memoryPosts[idx], status: safeStatus, updated_at: new Date().toISOString() };
    return toPost(memoryPosts[idx]);
  }
  const { data, error } = await supabase
    .from('pet_feed_posts')
    .update({ status: safeStatus, updated_at: new Date().toISOString() })
    .eq('id', postId)
    .select('*, breeder_profile:breeder_profiles(*)')
    .maybeSingle();
  if (error) throw error;
  return toPost(data);
}

export async function listAdminPetFeedReports(status = 'open') {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const profilesById = new Map(memoryProfiles.map((profile) => [profile.id, toProfile(profile)]));
    return memoryReports
      .filter((report) => !status || report.status === status)
      .map((report) => toReport({ ...report, breeder_profile: profilesById.get(report.breeder_profile_id) ?? null }));
  }
  let query = supabase.from('pet_feed_reports').select('*, breeder_profile:breeder_profiles(*)').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toReport);
}

export async function listAdminBreederProfiles(status = '') {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return memoryProfiles
      .filter((profile) => !status || profile.verification_status === status)
      .map(toProfile);
  }
  let query = supabase.from('breeder_profiles').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('verification_status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toProfile);
}

export async function adminUpdateBreederProfileStatus(userId, verificationStatus) {
  const safeStatus = normalizeVerificationStatus(verificationStatus);
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const idx = memoryProfiles.findIndex((profile) => profile.user_id === userId);
    if (idx < 0) return null;
    memoryProfiles[idx] = { ...memoryProfiles[idx], verification_status: safeStatus, updated_at: new Date().toISOString() };
    return toProfile(memoryProfiles[idx]);
  }
  const { data, error } = await supabase
    .from('breeder_profiles')
    .update({ verification_status: safeStatus, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return toProfile(data);
}

export async function adminUpdatePetFeedReportStatus(reportId, status) {
  const safeStatus = ['open', 'reviewed', 'dismissed'].includes(trimText(status, 32).toLowerCase())
    ? trimText(status, 32).toLowerCase()
    : 'reviewed';
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const idx = memoryReports.findIndex((report) => report.id === reportId);
    if (idx < 0) return null;
    memoryReports[idx] = { ...memoryReports[idx], status: safeStatus, updated_at: new Date().toISOString() };
    return toReport(memoryReports[idx]);
  }
  const { data, error } = await supabase
    .from('pet_feed_reports')
    .update({ status: safeStatus, updated_at: new Date().toISOString() })
    .eq('id', reportId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return toReport(data);
}
