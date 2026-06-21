import { createClient } from '@supabase/supabase-js';

/** JWT `role` claim (`service_role`, `anon`, …) or null if not a Supabase JWT. */
export function parseSupabaseKeyRole(secretKey) {
  if (!secretKey || typeof secretKey !== 'string') return null;
  const parts = secretKey.trim().split('.');
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(b64, 'base64').toString('utf8');
    const payload = JSON.parse(json);
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

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

  if (parseSupabaseKeyRole(supabaseServiceRoleKey) !== 'service_role') {
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

/**
 * Pet CRUD should use this (anon key + user JWT) so PostgREST runs as `authenticated`
 * with `auth.uid()` set. A misconfigured `SUPABASE_SERVICE_ROLE_KEY` (e.g. anon key pasted
 * there) does not bypass RLS and inserts fail without the real JWT on the request.
 */
export function createSupabaseWithUserAccessToken(accessToken) {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const token = typeof accessToken === 'string' ? accessToken.trim() : '';
  if (!url || !anon || !token) return null;

  return createClient(url, anon, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Auth methods (updateUser, verifyOtp email_change) require an in-memory session, not just a Bearer header. */
export async function createSupabaseAuthClientWithSession(session) {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const accessToken = typeof session?.access_token === 'string' ? session.access_token.trim() : '';
  const refreshToken = typeof session?.refresh_token === 'string' ? session.refresh_token.trim() : '';
  if (!url || !anon || !accessToken || !refreshToken) return null;

  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;
  return client;
}

export function getImageBucketName() {
  return getPrivateMediaBucketName();
}

export function getPrivateMediaBucketName() {
  return process.env.SUPABASE_PRIVATE_MEDIA_BUCKET || process.env.SUPABASE_IMAGE_BUCKET || 'pet-health-private-media';
}

export function getPublicMediaBucketName() {
  return process.env.SUPABASE_PUBLIC_MEDIA_BUCKET || 'pet-feed-public-media';
}
