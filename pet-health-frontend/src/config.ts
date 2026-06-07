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

const DEV_APP_LINKS = {
  privacyPolicy: 'https://pethealthcare.app/privacy-policy',
  termsOfService: 'https://pethealthcare.app/terms-of-service',
  support: 'mailto:support@pethealthcare.app',
};

function resolveApiOrigin(): string {
  if (configuredApiOrigin) return trimTrailingSlash(configuredApiOrigin);
  if (__DEV__) return trimTrailingSlash(LOCAL_API_ORIGIN);
  throw new Error('EXPO_PUBLIC_API_ORIGIN is required for production builds.');
}

const apiOrigin = resolveApiOrigin();

function validatePublicLink(value: string, envName: string, allowedProtocols: string[]): string {
  try {
    const parsed = new URL(value);
    if (!allowedProtocols.includes(parsed.protocol)) {
      throw new Error(`${envName} must use one of: ${allowedProtocols.join(', ')}`);
    }
    return value.replace(/\/+$/, '');
  } catch {
    throw new Error(`${envName} must be a valid public URL.`);
  }
}

function resolveAppLink(envName: string, devFallback: string, allowedProtocols: string[]): string {
  const configured = process.env[envName]?.trim();
  if (configured) return validatePublicLink(configured, envName, allowedProtocols);
  if (__DEV__) return devFallback;
  throw new Error(`${envName} is required for production builds.`);
}

export const API_BASE_URL = trimTrailingSlash(configuredApiBaseUrl || `${apiOrigin}/api/v1`);

export const API_HEALTH_URL = trimTrailingSlash(configuredApiHealthUrl || `${apiOrigin}/health`);

/** Google OAuth client IDs from Google Cloud Console (Web + iOS + Android types). */
export const GOOGLE_OAUTH = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
};

export const APP_LINKS = {
  privacyPolicy: resolveAppLink('EXPO_PUBLIC_PRIVACY_POLICY_URL', DEV_APP_LINKS.privacyPolicy, ['https:']),
  termsOfService: resolveAppLink('EXPO_PUBLIC_TERMS_OF_SERVICE_URL', DEV_APP_LINKS.termsOfService, ['https:']),
  support: resolveAppLink('EXPO_PUBLIC_SUPPORT_URL', DEV_APP_LINKS.support, ['https:', 'mailto:']),
};

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    GOOGLE_OAUTH.webClientId || GOOGLE_OAUTH.iosClientId || GOOGLE_OAUTH.androidClientId,
  );
}
