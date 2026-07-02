/** Metro stub when monetization native modules are disabled for release builds. */

export const TestIds = {
  REWARDED: 'test-rewarded-ad-unit',
} as const;

export const AdEventType = {
  ERROR: 'error',
  CLOSED: 'closed',
} as const;

export const RewardedAdEventType = {
  LOADED: 'loaded',
  EARNED_REWARD: 'earned_reward',
} as const;

export const RewardedAd = {
  createForAdRequest() {
    return {
      addAdEventListener() {
        return () => undefined;
      },
      load() {},
      show() {
        return Promise.reject(new Error('AdMob is disabled in this build'));
      },
    };
  },
};

export default {
  initialize() {
    return Promise.resolve();
  },
};
