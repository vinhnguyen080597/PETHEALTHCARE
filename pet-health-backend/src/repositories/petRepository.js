import { randomUUID } from 'node:crypto';
import { createSupabaseWithUserAccessToken, getSupabaseServiceClient } from '../config/supabase.js';

const memoryPets = [];

function getPetsSupabase(accessToken) {
  const withJwt = createSupabaseWithUserAccessToken(accessToken);
  if (withJwt) return withJwt;
  return getSupabaseServiceClient();
}

export async function listPetsByUser(userId, accessToken) {
  const supabase = getPetsSupabase(accessToken);
  if (!supabase) {
    return memoryPets.filter((pet) => pet.user_id === userId);
  }

  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getPetByIdForUser(userId, petId, accessToken) {
  const supabase = getPetsSupabase(accessToken);
  if (!supabase) {
    return memoryPets.find((pet) => pet.user_id === userId && pet.id === petId) ?? null;
  }

  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('user_id', userId)
    .eq('id', petId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function normalizeGender(value) {
  if (value === undefined || value === null || value === '') return null;
  const g = String(value).trim().toLowerCase();
  return g === 'male' || g === 'female' ? g : null;
}

/** Browser blob: URLs are tab-local and must not be stored as avatar_url. */
function sanitizeAvatarUrl(url) {
  if (url === undefined || url === null) return null;
  const t = String(url).trim();
  if (!t) return null;
  if (t.toLowerCase().startsWith('blob:')) return null;
  return t;
}

function normalizeAgeMonths(value) {
  if (value === undefined || value === null || value === '') return null;
  const months = Number(value);
  return Number.isFinite(months) ? Math.max(0, Math.round(months)) : null;
}

/** Remote DB may not have run `alter table pets add column gender` yet. */
function isMissingGenderColumnError(error) {
  if (!error) return false;
  const msg = [error.message, error.details, error.hint, String(error.code ?? '')].filter(Boolean).join(' ');
  return (
    /Could not find the 'gender' column/i.test(msg) ||
    /column ["']?gender["']? of relation/i.test(msg) ||
    /column ["']?gender["']? does not exist/i.test(msg) ||
    (msg.includes('42703') && /gender/i.test(msg))
  );
}

export async function createPetForUser(userId, payload, accessToken) {
  const normalized = {
    id: randomUUID(),
    user_id: userId,
    name: String(payload.name).trim(),
    species: String(payload.species).trim().toLowerCase(),
    breed: payload.breed ? String(payload.breed).trim() : null,
    age: normalizeAgeMonths(payload.age),
    gender: normalizeGender(payload.gender),
    avatar_url: sanitizeAvatarUrl(payload.avatarUrl),
    created_at: new Date().toISOString(),
  };

  const supabase = getPetsSupabase(accessToken);
  if (!supabase) {
    memoryPets.push(normalized);
    return normalized;
  }

  let { data, error } = await supabase.from('pets').insert(normalized).select('*').single();

  if (error && isMissingGenderColumnError(error)) {
    const { gender: _omit, ...withoutGender } = normalized;
    ({ data, error } = await supabase.from('pets').insert(withoutGender).select('*').single());
  }

  if (error) throw error;
  return data;
}

export async function updatePetForUser(userId, petId, payload, accessToken) {
  const updates = {};
  if (payload.name !== undefined) updates.name = String(payload.name).trim();
  if (payload.species !== undefined) updates.species = String(payload.species).trim().toLowerCase();
  if (payload.breed !== undefined) updates.breed = payload.breed ? String(payload.breed).trim() : null;
  if (payload.age !== undefined) updates.age = normalizeAgeMonths(payload.age);
  if (payload.gender !== undefined) updates.gender = normalizeGender(payload.gender);
  if (payload.avatarUrl !== undefined) {
    updates.avatar_url = sanitizeAvatarUrl(payload.avatarUrl);
  }

  const supabase = getPetsSupabase(accessToken);
  if (!supabase) {
    const index = memoryPets.findIndex((pet) => pet.user_id === userId && pet.id === petId);
    if (index < 0) return null;
    memoryPets[index] = { ...memoryPets[index], ...updates };
    return memoryPets[index];
  }

  let { data, error } = await supabase
    .from('pets')
    .update(updates)
    .eq('user_id', userId)
    .eq('id', petId)
    .select('*')
    .maybeSingle();

  if (error && isMissingGenderColumnError(error) && 'gender' in updates) {
    const { gender: _g, ...withoutGender } = updates;
    ({ data, error } = await supabase
      .from('pets')
      .update(withoutGender)
      .eq('user_id', userId)
      .eq('id', petId)
      .select('*')
      .maybeSingle());
  }

  if (error) throw error;
  return data;
}

export async function deletePetForUser(userId, petId, accessToken) {
  const supabase = getPetsSupabase(accessToken);
  if (!supabase) {
    const index = memoryPets.findIndex((pet) => pet.user_id === userId && pet.id === petId);
    if (index < 0) return false;
    memoryPets.splice(index, 1);
    return true;
  }

  const { data, error } = await supabase
    .from('pets')
    .delete()
    .eq('user_id', userId)
    .eq('id', petId)
    .select('id');

  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}
