import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { TOKEN_STORAGE_KEY } from '../constants/auth';

const useSecureStore = Platform.OS !== 'web';

export async function getStoredAuthToken(): Promise<string | null> {
  if (!useSecureStore) {
    return AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  }

  const secureToken = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
  if (secureToken) return secureToken;

  // One-time migration from the previous AsyncStorage-backed token storage.
  const legacyToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  if (legacyToken) {
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, legacyToken);
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }
  return legacyToken;
}

export async function setStoredAuthToken(token: string): Promise<void> {
  if (!useSecureStore) {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
    return;
  }

  await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
  await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
}

export async function removeStoredAuthToken(): Promise<void> {
  if (useSecureStore) {
    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
  }
  await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
}
