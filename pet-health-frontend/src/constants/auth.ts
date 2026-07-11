export const TOKEN_STORAGE_KEY = 'pet_health_access_token';
export const AUTH_SESSION_STORAGE_KEY = 'pet_health_auth_session';

export { SESSION_REFRESH_BUFFER_SECONDS } from '../utils/authSession';

/** Set after email/password sign-up until user finishes setup (health skip/finish) or signs out. */
export const PENDING_INITIAL_ONBOARDING_KEY = 'pet_health_pending_initial_onboarding';
