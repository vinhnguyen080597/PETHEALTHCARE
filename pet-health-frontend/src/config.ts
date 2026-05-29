// Must match the PC IPv4 printed by the backend: "LAN URLs for Expo devices".
// Production/staging builds should set EXPO_PUBLIC_API_ORIGIN to the deployed backend origin.
const LOCAL_IP = '192.168.1.4';
const LOCAL_API_ORIGIN = `http://${LOCAL_IP}:3000`;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

const configuredApiOrigin = process.env.EXPO_PUBLIC_API_ORIGIN?.trim();
const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const configuredApiHealthUrl = process.env.EXPO_PUBLIC_API_HEALTH_URL?.trim();

const apiOrigin = trimTrailingSlash(configuredApiOrigin || LOCAL_API_ORIGIN);

export const API_BASE_URL = trimTrailingSlash(configuredApiBaseUrl || `${apiOrigin}/api/v1`);

export const API_HEALTH_URL = trimTrailingSlash(configuredApiHealthUrl || `${apiOrigin}/health`);

/** Google OAuth client IDs from Google Cloud Console (Web + iOS + Android types). */
export const GOOGLE_OAUTH = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
};

/**
 * Build-time admin secret for internal/debug flows.
 * Keep this only in temporary build/dev environments.
 */
export const ADMIN_INTERNAL_API_KEY = process.env.EXPO_PUBLIC_ADMIN_INTERNAL_API_KEY ?? '';

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    GOOGLE_OAUTH.webClientId || GOOGLE_OAUTH.iosClientId || GOOGLE_OAUTH.androidClientId,
  );
}
