// Must match the PC IPv4 printed by the backend: "LAN URLs for Expo devices".
// Production/staging builds should set EXPO_PUBLIC_API_ORIGIN to the deployed backend origin.
const LOCAL_IP = '192.168.1.4';
const LOCAL_API_ORIGIN = `http://${LOCAL_IP}:3000`;
const PRODUCTION_API_ORIGIN = 'https://pet-health-backend-serb.onrender.com';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

const publicEnv: Record<string, string | undefined> =
  typeof process !== 'undefined' && process.env ? process.env : {};

const configuredApiOrigin = publicEnv.EXPO_PUBLIC_API_ORIGIN?.trim();
const configuredApiBaseUrl = publicEnv.EXPO_PUBLIC_API_BASE_URL?.trim();
const configuredApiHealthUrl = publicEnv.EXPO_PUBLIC_API_HEALTH_URL?.trim();

const PUBLIC_SITE_ORIGIN = 'https://vinhnguyen080597.github.io/PETHEALTHCARE';

const DEV_APP_LINKS = {
  privacyPolicy: `${PUBLIC_SITE_ORIGIN}/privacy-policy/`,
  termsOfService: `${PUBLIC_SITE_ORIGIN}/terms-of-service/`,
  support: `${PUBLIC_SITE_ORIGIN}/support/`,
};

function resolveApiOrigin(): string {
  if (configuredApiOrigin) return trimTrailingSlash(configuredApiOrigin);
  if (__DEV__) return trimTrailingSlash(LOCAL_API_ORIGIN);
  return PRODUCTION_API_ORIGIN;
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
  const configured = publicEnv[envName]?.trim();
  if (configured) return validatePublicLink(configured, envName, allowedProtocols);
  return devFallback;
}

export const API_BASE_URL = trimTrailingSlash(configuredApiBaseUrl || `${apiOrigin}/api/v1`);

export const API_HEALTH_URL = trimTrailingSlash(configuredApiHealthUrl || `${apiOrigin}/health`);

export const APP_LINKS = {
  privacyPolicy: resolveAppLink('EXPO_PUBLIC_PRIVACY_POLICY_URL', DEV_APP_LINKS.privacyPolicy, ['https:']),
  termsOfService: resolveAppLink('EXPO_PUBLIC_TERMS_OF_SERVICE_URL', DEV_APP_LINKS.termsOfService, ['https:']),
  support: resolveAppLink('EXPO_PUBLIC_SUPPORT_URL', DEV_APP_LINKS.support, ['https:', 'mailto:']),
};
