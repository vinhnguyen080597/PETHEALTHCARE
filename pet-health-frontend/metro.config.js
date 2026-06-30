const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

const stubExpoGoNativeModules = process.env.EXPO_PUBLIC_EXPO_GO_COMPAT === '1';
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (stubExpoGoNativeModules) {
    if (moduleName === 'react-native-iap') {
      return {
        filePath: path.resolve(__dirname, 'src/stubs/react-native-iap.ts'),
        type: 'sourceFile',
      };
    }
    if (moduleName === 'react-native-nitro-modules') {
      return {
        filePath: path.resolve(__dirname, 'src/stubs/react-native-nitro-modules.ts'),
        type: 'sourceFile',
      };
    }
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
