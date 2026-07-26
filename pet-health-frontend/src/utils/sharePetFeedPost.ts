import { Alert, Platform, Share } from 'react-native';
import i18n from '../i18n';
import type { PetFeedPost } from '../types';
import { petFeedPostShareUrl } from './petFeedDeepLinks';

export async function sharePetFeedPost(post: PetFeedPost) {
  const url = petFeedPostShareUrl(post.id);
  const title = post.title?.trim() || i18n.t('petFeed.shareFallbackTitle');
  const message = `${title}\n${url}`;

  if (Platform.OS === 'web') {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text: title, url });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        Alert.alert(i18n.t('common.ok'), i18n.t('petFeed.shareCopied'));
        return;
      }
    } catch {
      /* fall through */
    }
    Alert.alert(i18n.t('petFeed.shareTitle'), url);
    return;
  }

  try {
    await Share.share(
      Platform.OS === 'ios'
        ? { url, message }
        : { message, title },
    );
  } catch {
    Alert.alert(i18n.t('petFeed.shareFailed'));
  }
}
