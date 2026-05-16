import { Asset } from 'expo-asset';

export const SERVICES_BACKGROUND = require('../../assets/services/BACKGROUND.png');
export const SERVICES_HERO_MAI = require('../../assets/services/friendlyMAI.png');
export const SERVICES_ICON_BREED = require('../../assets/services/DNA .png');
export const SERVICES_ICON_HEALTH = require('../../assets/services/medical .png');
export const SERVICES_ICON_VACCINE = require('../../assets/services/CALENDAR.png');

let preloadPromise: Promise<void> | null = null;

export function preloadServicesOnboardingImages(): Promise<void> {
  if (!preloadPromise) {
    preloadPromise = Promise.all([
      Asset.fromModule(SERVICES_BACKGROUND).downloadAsync(),
      Asset.fromModule(SERVICES_HERO_MAI).downloadAsync(),
      Asset.fromModule(SERVICES_ICON_BREED).downloadAsync(),
      Asset.fromModule(SERVICES_ICON_HEALTH).downloadAsync(),
      Asset.fromModule(SERVICES_ICON_VACCINE).downloadAsync(),
    ]).then(() => undefined);
  }
  return preloadPromise;
}
