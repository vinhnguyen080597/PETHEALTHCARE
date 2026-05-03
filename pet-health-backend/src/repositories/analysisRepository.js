import { randomUUID } from 'node:crypto';
import { getSupabaseServiceClient } from '../config/supabase.js';

const memoryAnalyses = [];

function isMissingOptionalColumnError(error) {
  if (!error) return false;
  const msg = [error.message, error.details, error.hint, String(error.code ?? '')].filter(Boolean).join(' ');
  return (
    /Could not find the|column .* does not exist|42703/i.test(msg) ||
    (String(error.code) === 'PGRST204' && /(weight_kg|video_url|extra_image|vaccination|neutering|medical_history|symptom_description)/i.test(msg))
  );
}

function stripOptionalHealthFields(row) {
  const {
    extra_image_urls: _e,
    video_url: _v,
    weight_kg: _w,
    vaccination_status: _vs,
    vaccine_type: _vt,
    neutering_status: _ns,
    medical_history: _mh,
    symptom_description: _sd,
    ...rest
  } = row;
  return rest;
}

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
    extra_image_urls: Array.isArray(payload.extraImageUrls) ? payload.extraImageUrls : [],
    video_url: payload.videoUrl ?? null,
    weight_kg: payload.weightKg ?? null,
    vaccination_status: payload.vaccinationStatus ?? null,
    vaccine_type: payload.vaccineType ?? null,
    neutering_status: payload.neuteringStatus ?? null,
    medical_history: payload.medicalHistory ?? null,
    symptom_description: payload.symptomDescription ?? null,
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    memoryAnalyses.push(row);
    return row;
  }

  let { data, error } = await supabase.from('analyses').insert(row).select('*').single();

  if (error && isMissingOptionalColumnError(error)) {
    ({ data, error } = await supabase
      .from('analyses')
      .insert(stripOptionalHealthFields(row))
      .select('*')
      .single());
  }

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
