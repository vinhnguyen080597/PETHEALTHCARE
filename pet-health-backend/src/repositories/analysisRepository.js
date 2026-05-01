import { randomUUID } from 'node:crypto';
import { getSupabaseServiceClient } from '../config/supabase.js';

const memoryAnalyses = [];

export async function createAnalysisRecord(payload) {
  const row = {
    id: randomUUID(),
    user_id: payload.userId,
    pet_id: payload.petId,
    diagnosis: payload.diagnosis,
    severity: payload.severity,
    symptoms: payload.symptoms,
    treatment: payload.treatment,
    confidence: payload.confidence,
    disclaimer: payload.disclaimer,
    image_url: payload.imageUrl ?? null,
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    memoryAnalyses.push(row);
    return row;
  }

  const { data, error } = await supabase
    .from('analyses')
    .insert(row)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function listAnalysesByPet(userId, petId) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return memoryAnalyses
      .filter((item) => item.user_id === userId && item.pet_id === petId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('user_id', userId)
    .eq('pet_id', petId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
