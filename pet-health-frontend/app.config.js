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
  name: 'PetCare: Pet Marketplace',
  slug: 'pet-health-care',
  scheme: 'pethealthcare',
  version: '1.1.3',
  orientation: 'portrait',
  icon: './assets/brand/PetMarketAvatar.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/brand/PetMarketAvatar.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.pethealthcare.app',
    buildNumber: '4',
    associatedDomains: ['applinks:pet-marketplace.org', 'applinks:www.pet-marketplace.org'],
    infoPlist: {
      CFBundleDisplayName: 'PetCare',
      ITSAppUsesNonExemptEncryption: false,
      NSPhotoLibraryUsageDescription:
        'PetCare lets you choose photos and videos from your library for pet profiles, wellness screening, breed recognition, and marketplace listings.',
    },
  },
  android: {
    package: 'com.pethealthcare.app',
    adaptiveIcon: {
      foregroundImage: './assets/brand/PetMarketAvatar.png',
      backgroundColor: '#ffffff',
    },
    predictiveBackGestureEnabled: false,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        category: ['BROWSABLE', 'DEFAULT'],
        data: [
          {
            scheme: 'https',
            host: 'pet-marketplace.org',
            pathPrefix: '/app/pet-feed',
          },
          {
            scheme: 'https',
            host: 'www.pet-marketplace.org',
            pathPrefix: '/app/pet-feed',
          },
        ],
      },
    ],
  },
  web: {
    favicon: './assets/brand/PetMarketAvatar.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-localization',
    'expo-asset',
    'expo-secure-store',
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/brand/PetMarketAvatar.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
        imageWidth: 200,
      },
    ],
    'expo-video',
    'expo-image',
    'expo-status-bar',
    [
      'expo-notifications',
      {
        icon: './assets/brand/PetMarketAvatar.png',
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
