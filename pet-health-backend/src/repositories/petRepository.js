import { randomUUID } from 'node:crypto';
import { createSupabaseWithUserAccessToken, getSupabaseServiceClient } from '../config/supabase.js';
import { resolvePrivateMediaUrl } from '../services/imageStorageService.js';

const memoryPets = [];

function getPetsSupabase(accessToken) {
  const withJwt = createSupabaseWithUserAccessToken(accessToken);
  if (withJwt) return withJwt;
  return getSupabaseServiceClient();
}

async function withSignedPetMedia(pet) {
  if (!pet) return pet;
  return {
    ...pet,
    avatar_url: pet.avatar_url ? await resolvePrivateMediaUrl(pet.avatar_url) : pet.avatar_url,
  };
}

export async function listPetsByUser(userId, accessToken) {
  const supabase = getPetsSupabase(accessToken);
  if (!supabase) {
    return Promise.all(memoryPets.filter((pet) => pet.user_id === userId).map(withSignedPetMedia));
  }

  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return Promise.all((data ?? []).map(withSignedPetMedia));
}

export async function getPetByIdForUser(userId, petId, accessToken) {
  const supabase = getPetsSupabase(accessToken);
  if (!supabase) {
    return withSignedPetMedia(memoryPets.find((pet) => pet.user_id === userId && pet.id === petId) ?? null);
  }

  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('user_id', userId)
    .eq('id', petId)
    .maybeSingle();

  if (error) throw error;
  return withSignedPetMedia(data);
}

function normalizeGender(value) {
  if (value === undefined || value === null || value === '') return null;
  const g = String(value).trim().toLowerCase();
  return g === 'male' || g === 'female' ? g : null;
}

function sanitizeAvatarUrl(url) {
  if (url === undefined || url === null) return null;
  const t = String(url).trim();
  if (!t) return null;
  if (t.startsWith('storage://') || t.startsWith('memory://')) return t;
  return null;
}

function normalizeAgeMonths(value) {
  if (value === undefined || value === null || value === '') return null;
  const months = Number(value);
  return Number.isFinite(months) ? Math.max(0, Math.round(months)) : null;
}

function normalizeBirthDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return text;
}

function ageMonthsFromBirthDate(birthDate, today = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(birthDate).trim());
  if (!match) return null;
  const birth = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

function resolvePetAgeFields(payload) {
  const birthDate = normalizeBirthDate(payload.birthDate ?? payload.birth_date);
  if (birthDate) {
    return {
      birth_date: birthDate,
      age: ageMonthsFromBirthDate(birthDate),
    };
  }
  if (payload.age !== undefined) {
    return {
      birth_date: null,
      age: normalizeAgeMonths(payload.age),
    };
  }
  return {};
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

function isMissingBirthDateColumnError(error) {
  if (!error) return false;
  const msg = [error.message, error.details, error.hint, String(error.code ?? '')].filter(Boolean).join(' ');
  return (
    /Could not find the 'birth_date' column/i.test(msg) ||
    /column ["']?birth_date["']? of relation/i.test(msg) ||
    /column ["']?birth_date["']? does not exist/i.test(msg) ||
    (msg.includes('42703') && /birth_date/i.test(msg))
  );
}

function stripUnsupportedPetColumns(record, { omitGender = false, omitBirthDate = false } = {}) {
  const next = { ...record };
  if (omitGender) delete next.gender;
  if (omitBirthDate) delete next.birth_date;
  return next;
}

export async function createPetForUser(userId, payload, accessToken) {
  const ageFields = resolvePetAgeFields(payload);
  const normalized = {
    id: randomUUID(),
    user_id: userId,
    name: String(payload.name).trim(),
    species: String(payload.species).trim().toLowerCase(),
    breed: payload.breed ? String(payload.breed).trim() : null,
    age: ageFields.age ?? normalizeAgeMonths(payload.age),
    birth_date: ageFields.birth_date ?? null,
    gender: normalizeGender(payload.gender),
    avatar_url: sanitizeAvatarUrl(payload.avatarUrl),
    created_at: new Date().toISOString(),
  };

  const supabase = getPetsSupabase(accessToken);
  if (!supabase) {
    memoryPets.push(normalized);
    return withSignedPetMedia(normalized);
  }

  let insertPayload = normalized;
  let { data, error } = await supabase.from('pets').insert(insertPayload).select('*').single();

  if (error && (isMissingGenderColumnError(error) || isMissingBirthDateColumnError(error))) {
    insertPayload = stripUnsupportedPetColumns(insertPayload, {
      omitGender: isMissingGenderColumnError(error),
      omitBirthDate: isMissingBirthDateColumnError(error),
    });
    ({ data, error } = await supabase.from('pets').insert(insertPayload).select('*').single());
    if (error && (isMissingGenderColumnError(error) || isMissingBirthDateColumnError(error))) {
      insertPayload = stripUnsupportedPetColumns(insertPayload, {
        omitGender: isMissingGenderColumnError(error) || isMissingBirthDateColumnError(error),
        omitBirthDate: isMissingBirthDateColumnError(error) || isMissingGenderColumnError(error),
      });
      ({ data, error } = await supabase.from('pets').insert(insertPayload).select('*').single());
    }
  }

  if (error) throw error;
  return withSignedPetMedia(data);
}

export async function updatePetForUser(userId, petId, payload, accessToken) {
  const updates = {};
  if (payload.name !== undefined) updates.name = String(payload.name).trim();
  if (payload.species !== undefined) updates.species = String(payload.species).trim().toLowerCase();
  if (payload.breed !== undefined) updates.breed = payload.breed ? String(payload.breed).trim() : null;
  if (payload.birthDate !== undefined || payload.birth_date !== undefined || payload.age !== undefined) {
    const ageFields = resolvePetAgeFields(payload);
    if (payload.birthDate !== undefined || payload.birth_date !== undefined) {
      updates.birth_date = ageFields.birth_date ?? null;
      updates.age = ageFields.age ?? null;
    } else if (payload.age !== undefined) {
      updates.age = normalizeAgeMonths(payload.age);
    }
  }
  if (payload.gender !== undefined) updates.gender = normalizeGender(payload.gender);
  if (payload.avatarUrl !== undefined) {
    updates.avatar_url = sanitizeAvatarUrl(payload.avatarUrl);
  }

  const supabase = getPetsSupabase(accessToken);
  if (!supabase) {
    const index = memoryPets.findIndex((pet) => pet.user_id === userId && pet.id === petId);
    if (index < 0) return null;
    memoryPets[index] = { ...memoryPets[index], ...updates };
    return withSignedPetMedia(memoryPets[index]);
  }

  let { data, error } = await supabase
    .from('pets')
    .update(updates)
    .eq('user_id', userId)
    .eq('id', petId)
    .select('*')
    .maybeSingle();

  if (error && (isMissingGenderColumnError(error) || isMissingBirthDateColumnError(error))) {
    const retryUpdates = stripUnsupportedPetColumns(updates, {
      omitGender: isMissingGenderColumnError(error) && 'gender' in updates,
      omitBirthDate: isMissingBirthDateColumnError(error) && 'birth_date' in updates,
    });
    ({ data, error } = await supabase
      .from('pets')
      .update(retryUpdates)
      .eq('user_id', userId)
      .eq('id', petId)
      .select('*')
      .maybeSingle());
  }

  if (error) throw error;
  return withSignedPetMedia(data);
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
