import * as Google from 'expo-auth-session/providers/google';
import { GOOGLE_OAUTH } from '../config';

export function useGoogleIdTokenAuth() {
  return Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_OAUTH.webClientId || undefined,
    iosClientId: GOOGLE_OAUTH.iosClientId || undefined,
    androidClientId: GOOGLE_OAUTH.androidClientId || undefined,
  });
}
