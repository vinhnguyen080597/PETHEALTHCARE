export type RewardedAdResult = {
  earned: boolean;
  reason?: 'unavailable' | 'closed' | 'load_failed';
};

export type RewardedAdAvailability = 'unsupported' | 'loading' | 'ready' | 'unavailable';

let availability: RewardedAdAvailability = __DEV__ ? 'ready' : 'unsupported';
const availabilityListeners = new Set<(status: RewardedAdAvailability) => void>();

function setAvailability(next: RewardedAdAvailability) {
  availability = next;
  availabilityListeners.forEach((listener) => listener(next));
}

export function isRewardedAdSupported(): boolean {
  return false;
}

export function getRewardedAdAvailability(): RewardedAdAvailability {
  return availability;
}

export function subscribeRewardedAdAvailability(listener: (status: RewardedAdAvailability) => void) {
  listener(availability);
  availabilityListeners.add(listener);
  return () => {
    availabilityListeners.delete(listener);
  };
}

export function initializeRewardedAds(): Promise<void> {
  return Promise.resolve();
}

export async function preloadRewardedAd(): Promise<RewardedAdAvailability> {
  const next: RewardedAdAvailability = __DEV__ ? 'ready' : 'unsupported';
  setAvailability(next);
  return next;
}

/** Web has no AdMob SDK — in dev, pretend the ad completed so UI/API can be tested in the browser. */
export async function showRewardedAd(): Promise<RewardedAdResult> {
  if (__DEV__) {
    return { earned: true };
  }
  return { earned: false, reason: 'unavailable' };
}
