import { getSupabaseServiceClient } from '../config/supabase.js';

export const FEATURE_FLAG_KEYS = ['breed_recognition', 'health_analysis', 'rewarded_ads', 'subscription'];

export const DEFAULT_FEATURE_FLAGS = {
  breed_recognition: true,
  health_analysis: true,
  rewarded_ads: true,
  subscription: true,
};

const SETTINGS_KEY = 'feature_flags';
let memoryFlags = { ...DEFAULT_FEATURE_FLAGS };

export function normalizeFeatureFlags(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    breed_recognition: source.breed_recognition !== false,
    health_analysis: source.health_analysis !== false,
    rewarded_ads: source.rewarded_ads !== false,
    subscription: source.subscription !== false,
  };
}

export async function getFeatureFlags() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return normalizeFeatureFlags(memoryFlags);

  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle();
  if (error) throw error;
  if (!data?.value) return normalizeFeatureFlags(DEFAULT_FEATURE_FLAGS);
  return normalizeFeatureFlags(data.value);
}

export async function updateFeatureFlags(patch, updatedBy = null) {
  const current = await getFeatureFlags();
  const merged = { ...current };
  for (const key of FEATURE_FLAG_KEYS) {
    if (key in patch) merged[key] = patch[key] !== false;
  }
  const next = normalizeFeatureFlags(merged);
  const now = new Date().toISOString();
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    memoryFlags = next;
    return next;
  }

  const row = {
    key: SETTINGS_KEY,
    value: next,
    updated_at: now,
    ...(updatedBy ? { updated_by: updatedBy } : {}),
  };
  const { data, error } = await supabase.from('app_settings').upsert(row, { onConflict: 'key' }).select('value').single();
  if (error) throw error;
  return normalizeFeatureFlags(data?.value ?? next);
}
