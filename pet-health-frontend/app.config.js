/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

const ADMOB_TEST_ANDROID = 'ca-app-pub-3940256099942544~3347511713';
const ADMOB_TEST_IOS = 'ca-app-pub-3940256099942544~1458002511';

function resolveAdMobAppIds() {
  const androidAppId = process.env.EXPO_PUBLIC_ADMOB_APP_ANDROID?.trim() || ADMOB_TEST_ANDROID;
  const iosAppId = process.env.EXPO_PUBLIC_ADMOB_APP_IOS?.trim() || ADMOB_TEST_IOS;
  return { androidAppId, iosAppId };
}

function withAdMobPlugin(plugins) {
  const { androidAppId, iosAppId } = resolveAdMobAppIds();
  return plugins.map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'react-native-google-mobile-ads') {
      return ['react-native-google-mobile-ads', { androidAppId, iosAppId }];
    }
    return plugin;
  });
}

function withIapPlugin(plugins) {
  const hasIap = plugins.some(
    (plugin) => plugin === 'react-native-iap' || (Array.isArray(plugin) && plugin[0] === 'react-native-iap'),
  );
  if (hasIap) return plugins;
  return [
    ...plugins,
    [
      'react-native-iap',
      {
        paymentProvider: 'both',
      },
    ],
  ];
}

module.exports = () => {
  const base = appJson.expo;
  return {
    expo: {
      ...base,
      plugins: withIapPlugin(withAdMobPlugin([...(base.plugins ?? [])])),
    },
  };
};
