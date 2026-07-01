/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

/** v1 release: set true when enabling AdMob + IAP. */
const RELEASE_MONETIZATION_ENABLED = false;

// const ADMOB_TEST_ANDROID = 'ca-app-pub-3940256099942544~3347511713';
// const ADMOB_TEST_IOS = 'ca-app-pub-3940256099942544~1458002511';

// function resolveAdMobAppIds() {
//   const androidAppId = process.env.EXPO_PUBLIC_ADMOB_APP_ANDROID?.trim() || ADMOB_TEST_ANDROID;
//   const iosAppId = process.env.EXPO_PUBLIC_ADMOB_APP_IOS?.trim() || ADMOB_TEST_IOS;
//   return { androidAppId, iosAppId };
// }

// function withAdMobPlugin(plugins) {
//   const { androidAppId, iosAppId } = resolveAdMobAppIds();
//   return plugins.map((plugin) => {
//     if (Array.isArray(plugin) && plugin[0] === 'react-native-google-mobile-ads') {
//       return ['react-native-google-mobile-ads', { androidAppId, iosAppId }];
//     }
//     return plugin;
//   });
// }

// function withIapPlugin(plugins) {
//   const hasIap = plugins.some(
//     (plugin) => plugin === 'react-native-iap' || (Array.isArray(plugin) && plugin[0] === 'react-native-iap'),
//   );
//   if (hasIap) return plugins;
//   return [
//     ...plugins,
//     [
//       'react-native-iap',
//       {
//         paymentProvider: 'both',
//       },
//     ],
//   ];
// }

const MONETIZATION_PLUGIN_NAMES = new Set(['react-native-google-mobile-ads', 'react-native-iap']);

function withoutMonetizationPlugins(plugins) {
  return plugins.filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return !MONETIZATION_PLUGIN_NAMES.has(name);
  });
}

module.exports = () => {
  const base = appJson.expo;
  let plugins = [...(base.plugins ?? [])];
  if (RELEASE_MONETIZATION_ENABLED) {
    // plugins = withIapPlugin(withAdMobPlugin(plugins));
  } else {
    plugins = withoutMonetizationPlugins(plugins);
  }
  return {
    expo: {
      ...base,
      plugins,
      ...(RELEASE_MONETIZATION_ENABLED
        ? {}
        : {
            autolinking: {
              exclude: [
                'react-native-google-mobile-ads',
                'react-native-iap',
                'react-native-nitro-modules',
              ],
            },
          }),
    },
  };
};
