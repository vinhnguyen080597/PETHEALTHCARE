import { createClient } from '@supabase/supabase-js';

let cachedServiceClient = null;
let cachedAnonClient = null;

export function getSupabaseServiceClient() {
  if (cachedServiceClient) {
    return cachedServiceClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  cachedServiceClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  return cachedServiceClient;
}

export function getSupabaseAnonClient() {
  if (cachedAnonClient) {
    return cachedAnonClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  cachedAnonClient = createClient(supabaseUrl, supabaseAnonKey);
  return cachedAnonClient;
}

export function getImageBucketName() {
  return process.env.SUPABASE_IMAGE_BUCKET || 'pet-diagnosis-images';
}
