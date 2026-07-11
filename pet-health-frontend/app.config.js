/** @type {import('expo/config').ExpoConfig} */
/** v1 release: set true when enabling AdMob + IAP. */
const RELEASE_MONETIZATION_ENABLED = false;

const MONETIZATION_PLUGIN_NAMES = new Set(['react-native-google-mobile-ads', 'react-native-iap']);

function withoutMonetizationPlugins(plugins) {
  return plugins.filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return !MONETIZATION_PLUGIN_NAMES.has(name);
  });
}

const baseConfig = {
  name: 'Pet Health Care',
  slug: 'pet-health-care',
  scheme: 'pethealthcare',
  version: '1.0.1',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.pethealthcare.app',
    buildNumber: '2',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSPhotoLibraryUsageDescription:
        'Pet Health Care lets you choose photos and videos from your library for pet profiles, wellness screening, breed recognition, and Pet Feed listings.',
    },
  },
  android: {
    package: 'com.pethealthcare.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-localization',
    'expo-asset',
    'expo-secure-store',
    'expo-font',
    'expo-video',
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#1E6FE8',
      },
    ],
    '@react-native-community/datetimepicker',
    [
      'expo-build-properties',
      {
        ios: {
          useFrameworks: 'static',
        },
      },
    ],
  ],
  extra: {
    eas: {
      projectId: '657583fb-c196-40dc-884d-9db95f5be282',
    },
  },
  owner: 'cattieshouse',
};

const plugins = RELEASE_MONETIZATION_ENABLED
  ? baseConfig.plugins
  : withoutMonetizationPlugins(baseConfig.plugins);

module.exports = {
  expo: {
    ...baseConfig,
    plugins,
  },
};
