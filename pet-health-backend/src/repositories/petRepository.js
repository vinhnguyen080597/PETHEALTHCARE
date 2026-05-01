import { randomUUID } from 'node:crypto';
import { getSupabaseServiceClient } from '../config/supabase.js';

const memoryPets = [];

export async function listPetsByUser(userId) {
  const supabase = getSupabaseServiceClient();
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

export async function getPetByIdForUser(userId, petId) {
  const supabase = getSupabaseServiceClient();
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

export async function createPetForUser(userId, payload) {
  const normalized = {
    id: randomUUID(),
    user_id: userId,
    name: String(payload.name).trim(),
    species: String(payload.species).trim().toLowerCase(),
    breed: payload.breed ? String(payload.breed).trim() : null,
    age: Number.isFinite(Number(payload.age)) ? Number(payload.age) : null,
    avatar_url: payload.avatarUrl ? String(payload.avatarUrl).trim() : null,
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    memoryPets.push(normalized);
    return normalized;
  }

  const { data, error } = await supabase
    .from('pets')
    .insert(normalized)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updatePetForUser(userId, petId, payload) {
  const updates = {};
  if (payload.name !== undefined) updates.name = String(payload.name).trim();
  if (payload.species !== undefined) updates.species = String(payload.species).trim().toLowerCase();
  if (payload.breed !== undefined) updates.breed = payload.breed ? String(payload.breed).trim() : null;
  if (payload.age !== undefined) updates.age = Number.isFinite(Number(payload.age)) ? Number(payload.age) : null;
  if (payload.avatarUrl !== undefined) updates.avatar_url = payload.avatarUrl ? String(payload.avatarUrl).trim() : null;

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const index = memoryPets.findIndex((pet) => pet.user_id === userId && pet.id === petId);
    if (index < 0) return null;
    memoryPets[index] = { ...memoryPets[index], ...updates };
    return memoryPets[index];
  }

  const { data, error } = await supabase
    .from('pets')
    .update(updates)
    .eq('user_id', userId)
    .eq('id', petId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deletePetForUser(userId, petId) {
  const supabase = getSupabaseServiceClient();
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
