import type { AppScreen } from '../screens/types';

/** Remember where Edit Breeder profile was opened from so back returns correctly. */
export function resolveBreederProfileReturnScreen(
  currentScreen: AppScreen,
  isAdmin: boolean,
): AppScreen {
  if (currentScreen === 'breeder-profile') {
    return isAdmin ? 'home' : 'account';
  }
  return currentScreen;
}
