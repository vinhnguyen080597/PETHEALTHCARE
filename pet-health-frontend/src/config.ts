// Must match the PC IPv4 printed by the backend: "LAN URLs for Expo devices"
const LOCAL_IP = '192.168.1.4';

export const API_BASE_URL = "https://contest-patronage-sank.ngrok-free.dev/api/v1"
  // Platform.OS === 'android'
  //   ? `http://${LOCAL_IP}:3000/api/v1`
  //   : `http://${LOCAL_IP}:3000/api/v1`;

export const API_HEALTH_URL = "https://contest-patronage-sank.ngrok-free.dev/health"
  // Platform.OS === 'android'
  //   ? `http://${LOCAL_IP}:3000/health`
  //   : `http://${LOCAL_IP}:3000/health`;

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
