import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import vi from './locales/vi.json';

export const APP_LANGUAGE_STORAGE_KEY = 'pethealth_app_language';

function resolveInitialLanguage(saved: string | null | undefined, deviceCode: string | undefined): 'en' | 'vi' {
  if (saved === 'vi' || saved === 'en') return saved;
  return deviceCode === 'vi' ? 'vi' : 'en';
}

let initPromise: Promise<void> | null = null;

export function initI18n(): Promise<void> {
  if (i18n.isInitialized) return Promise.resolve();
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const saved = await AsyncStorage.getItem(APP_LANGUAGE_STORAGE_KEY);
    const deviceCode = Localization.getLocales()[0]?.languageCode ?? undefined;
    const lng = resolveInitialLanguage(saved ?? undefined, deviceCode);

    await i18n.use(initReactI18next).init({
      resources: {
        en: { translation: en },
        vi: { translation: vi },
      },
      lng,
      fallbackLng: 'en',
      compatibilityJSON: 'v4',
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
  })();
  return initPromise;
}

export async function setAppLanguage(lng: 'en' | 'vi'): Promise<void> {
  await AsyncStorage.setItem(APP_LANGUAGE_STORAGE_KEY, lng);
  await i18n.changeLanguage(lng);
}

export default i18n;
