import { Asset } from 'expo-asset';

export const MAI_AND_PETS = require('../../assets/mai/MAI-AND-PETS.png');
export const MAI_GREETING = require('../../assets/mai/MAI-GREETING.png');

let preloadPromise: Promise<void> | null = null;

/** Warms disk cache for bundled Mai art before onboarding screens mount. */
export function preloadMaiOnboardingImages(): Promise<void> {
  if (!preloadPromise) {
    preloadPromise = Promise.all([
      Asset.fromModule(MAI_AND_PETS).downloadAsync(),
      Asset.fromModule(MAI_GREETING).downloadAsync(),
    ]).then(() => undefined);
  }
  return preloadPromise;
}
