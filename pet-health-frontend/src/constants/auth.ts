export const TOKEN_STORAGE_KEY = 'pet_health_access_token';
export const AUTH_SESSION_STORAGE_KEY = 'pet_health_auth_session';

/**
 * Set Supabase JWT expiry to MAX_SUPABASE_JWT_EXPIRY_SECONDS (604800 = 7 days).
 * The app refreshes once ~5 minutes before JWT expiry, and when the app/tab becomes active near expiry.
 */
export const MAX_SUPABASE_JWT_EXPIRY_SECONDS = 604_800;

/** Set after email/password sign-up until user finishes setup (health skip/finish) or signs out. */
export const PENDING_INITIAL_ONBOARDING_KEY = 'pet_health_pending_initial_onboarding';
