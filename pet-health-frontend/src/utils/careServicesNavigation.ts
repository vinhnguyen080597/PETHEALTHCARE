import type { AppScreen } from '../screens/types';

export type CareHubReturnScreen = 'home' | 'pet-profile';
export type CoreCareReturnScreen = 'home' | 'pet-profile' | 'onboarding-health-prompt';
export type HealthCheckReturnScreen = 'home' | 'pet-profile' | 'onboarding-health-prompt';

/** Where Care hub ("Chăm sóc") should return when its back button is pressed. */
export function resolveCareServicesReturnScreen(currentScreen: AppScreen): CareHubReturnScreen {
  if (currentScreen === 'pet-profile') return 'pet-profile';
  return 'home';
}

/**
 * Where Core Care should return.
 * Keep prior return target when refreshing while already on core-care screens.
 */
export function resolveCoreCareReturnScreen(
  currentScreen: AppScreen,
  previousReturn: CoreCareReturnScreen,
  explicit?: CoreCareReturnScreen,
): CoreCareReturnScreen {
  if (explicit) return explicit;
  if (currentScreen === 'core-care' || currentScreen === 'core-care-info') {
    return previousReturn;
  }
  if (currentScreen === 'onboarding-health-prompt') return 'onboarding-health-prompt';
  if (currentScreen === 'home') return 'home';
  if (currentScreen === 'pet-profile') return 'pet-profile';
  return previousReturn || 'pet-profile';
}

/** Where Health Check should return when opened from Care hub / profile / home. */
export function resolveHealthCheckReturnScreen(
  currentScreen: AppScreen,
  opts?: { returnToProfile?: boolean; fromCareHub?: boolean },
): HealthCheckReturnScreen {
  if (opts?.fromCareHub || currentScreen === 'onboarding-health-prompt') {
    return 'onboarding-health-prompt';
  }
  if (opts?.returnToProfile || currentScreen === 'pet-profile') {
    return 'pet-profile';
  }
  return 'home';
}
