/** Keep in sync with src/constants/releaseMonetization.ts */
const RELEASE_MONETIZATION_ENABLED = false;

const disabledNativeModules = {
  'react-native-google-mobile-ads': { platforms: { ios: null, android: null } },
  'react-native-iap': { platforms: { ios: null, android: null } },
  'react-native-nitro-modules': { platforms: { ios: null, android: null } },
};

/** @type {import('@react-native-community/cli-types').Config} */
module.exports = {
  dependencies: RELEASE_MONETIZATION_ENABLED ? {} : disabledNativeModules,
};
