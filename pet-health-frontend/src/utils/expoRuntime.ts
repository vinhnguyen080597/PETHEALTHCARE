import Constants from 'expo-constants';

/** True when running inside the stock Expo Go client (no custom dev build). */
export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}
