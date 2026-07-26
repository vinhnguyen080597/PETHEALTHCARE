import { Linking, Platform } from 'react-native';
import {
  parsePetFeedDeepLink,
  petFeedPostAppSchemeUrl,
  petFeedPostShareUrl,
  type PetFeedDeepLink,
} from './petFeedDeepLinkUrls';

export {
  parsePetFeedDeepLink,
  petFeedPostAppSchemeUrl,
  petFeedPostShareUrl,
  type PetFeedDeepLink,
};

export function subscribeToPetFeedDeepLinks(onLink: (link: PetFeedDeepLink) => void) {
  let active = true;

  void Linking.getInitialURL().then((url) => {
    if (!active) return;
    const link = parsePetFeedDeepLink(url);
    if (link) onLink(link);
  });

  const subscription = Linking.addEventListener('url', ({ url }) => {
    const link = parsePetFeedDeepLink(url);
    if (link) onLink(link);
  });

  return () => {
    active = false;
    subscription.remove();
  };
}

export function preferredStoreUrl(options: {
  iosAppStoreUrl?: string;
  androidPlayStoreUrl?: string;
}) {
  if (Platform.OS === 'ios') return options.iosAppStoreUrl?.trim() || '';
  if (Platform.OS === 'android') return options.androidPlayStoreUrl?.trim() || '';
  return options.iosAppStoreUrl?.trim() || options.androidPlayStoreUrl?.trim() || '';
}
