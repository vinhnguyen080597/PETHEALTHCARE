import { Platform } from 'react-native';
import { RELEASE_MONETIZATION_ENABLED } from '../constants/releaseMonetization';
import type { NativeRewardedAdModule } from '../types/monetizationNative';
import { debugCheck, debugLog } from '../utils/debugLog';
import { isExpoGo } from '../utils/expoRuntime';

export type RewardedAdResult = {
  earned: boolean;
  reason?: 'unavailable' | 'closed' | 'load_failed';
};

export type RewardedAdAvailability = 'unsupported' | 'loading' | 'ready' | 'unavailable';

type RewardedAdModule = NativeRewardedAdModule;

type PreloadedSlot = {
  ad: ReturnType<RewardedAdModule['RewardedAd']['createForAdRequest']>;
};

let nativeAds: RewardedAdModule | null | undefined;
let initPromise: Promise<void> | null = null;
let preloadedSlot: PreloadedSlot | null = null;
let availability: RewardedAdAvailability = 'unsupported';
let preloadInFlight: Promise<RewardedAdAvailability> | null = null;
const availabilityListeners = new Set<(status: RewardedAdAvailability) => void>();

function getNativeAds(): RewardedAdModule | null {
  if (nativeAds !== undefined) return nativeAds;
  if (!RELEASE_MONETIZATION_ENABLED) {
    debugLog('STARTUP', 'rewardedAd.getNativeAds', { skipped: true, reason: 'monetization_disabled' });
    nativeAds = null;
    return nativeAds;
  }
  if (Platform.OS === 'web' || isExpoGo()) {
    debugLog('STARTUP', 'rewardedAd.getNativeAds', { skipped: true, reason: Platform.OS === 'web' ? 'web' : 'expo_go' });
    nativeAds = null;
    return nativeAds;
  }
  try {
    nativeAds = require('react-native-google-mobile-ads') as RewardedAdModule;
    debugCheck('STARTUP', 'rewardedAd.getNativeAds', true, { platform: Platform.OS });
  } catch (error) {
    debugCheck('STARTUP', 'rewardedAd.getNativeAds', false, {
      platform: Platform.OS,
      message: error instanceof Error ? error.message : String(error),
    });
    nativeAds = null;
  }
  return nativeAds;
}

function setAvailability(next: RewardedAdAvailability) {
  availability = next;
  availabilityListeners.forEach((listener) => listener(next));
}

function createRewardedAd(ads: RewardedAdModule) {
  const { RewardedAd, TestIds } = ads;
  const adUnitId = rewardedAdUnitId(TestIds);
  return RewardedAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });
}

export function isRewardedAdSupported(): boolean {
  return getNativeAds() != null;
}

export function getRewardedAdAvailability(): RewardedAdAvailability {
  if (!getNativeAds()) return 'unsupported';
  return availability;
}

export function subscribeRewardedAdAvailability(listener: (status: RewardedAdAvailability) => void) {
  listener(getRewardedAdAvailability());
  availabilityListeners.add(listener);
  return () => {
    availabilityListeners.delete(listener);
  };
}

export function initializeRewardedAds(): Promise<void> {
  debugLog('STARTUP', 'rewardedAd.initializeRewardedAds.enter');
  if (initPromise) return initPromise;
  const ads = getNativeAds();
  if (!ads) {
    initPromise = Promise.resolve();
    setAvailability('unsupported');
    debugLog('STARTUP', 'rewardedAd.initializeRewardedAds.exit', { availability: 'unsupported' });
    return initPromise;
  }
  setAvailability('loading');
  initPromise = ads
    .default()
    .initialize()
    .then(() => {
      debugLog('STARTUP', 'rewardedAd.initializeRewardedAds.exit', { availability: 'ready_to_preload' });
      return undefined;
    })
    .catch((error) => {
      debugCheck('STARTUP', 'rewardedAd.initializeRewardedAds', false, {
        message: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    });
  return initPromise;
}

function rewardedAdUnitId(TestIds: RewardedAdModule['TestIds']): string {
  if (__DEV__) return TestIds.REWARDED;
  const fromEnv = Platform.select({
    ios: process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS,
    android: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID,
    default: undefined,
  });
  return fromEnv?.trim() || TestIds.REWARDED;
}

export async function preloadRewardedAd(): Promise<RewardedAdAvailability> {
  const ads = getNativeAds();
  if (!ads) {
    setAvailability('unsupported');
    return 'unsupported';
  }
  if (availability === 'ready' && preloadedSlot) return 'ready';
  if (preloadInFlight) return preloadInFlight;

  preloadInFlight = (async () => {
    setAvailability('loading');
    preloadedSlot = null;
    await initializeRewardedAds();

    return new Promise<RewardedAdAvailability>((resolve) => {
      const ad = createRewardedAd(ads);
      const { RewardedAdEventType, AdEventType } = ads;
      const unsubscribers: Array<() => void> = [];
      let settled = false;

      const finish = (status: RewardedAdAvailability) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        unsubscribers.forEach((unsubscribe) => unsubscribe());
        if (status === 'ready') {
          preloadedSlot = { ad };
        } else {
          preloadedSlot = null;
        }
        setAvailability(status);
        resolve(status);
      };

      const timeout = setTimeout(() => finish('unavailable'), 12000);

      unsubscribers.push(
        ad.addAdEventListener(RewardedAdEventType.LOADED, () => finish('ready')),
        ad.addAdEventListener(AdEventType.ERROR, () => finish('unavailable')),
      );

      ad.load();
    });
  })();

  try {
    return await preloadInFlight;
  } finally {
    preloadInFlight = null;
  }
}

export async function showRewardedAd(): Promise<RewardedAdResult> {
  const ads = getNativeAds();
  if (!ads) return { earned: false, reason: 'unavailable' };

  let status = getRewardedAdAvailability();
  if (status !== 'ready') {
    status = await preloadRewardedAd();
  }
  if (status !== 'ready' || !preloadedSlot) {
    return { earned: false, reason: 'load_failed' };
  }

  const ad = preloadedSlot.ad;
  preloadedSlot = null;
  setAvailability('loading');

  const { RewardedAdEventType, AdEventType } = ads;

  return new Promise((resolve) => {
    let earned = false;
    let settled = false;
    const unsubscribers: Array<() => void> = [];

    const finish = (result: RewardedAdResult) => {
      if (settled) return;
      settled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      void preloadRewardedAd();
      resolve(result);
    };

    unsubscribers.push(
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      }),
      ad.addAdEventListener(AdEventType.CLOSED, () => {
        finish({ earned, reason: earned ? undefined : 'closed' });
      }),
      ad.addAdEventListener(AdEventType.ERROR, () => {
        finish({ earned: false, reason: 'load_failed' });
      }),
    );

    void ad.show().catch(() => {
      finish({ earned: false, reason: 'load_failed' });
    });
  });
}
