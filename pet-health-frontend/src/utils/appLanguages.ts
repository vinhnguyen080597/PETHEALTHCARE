export type AppLanguageCode = 'en' | 'vi';

export type AppLanguageOption = {
  code: AppLanguageCode;
  /** ISO short label (EN, VI, …) — used in a11y / search, not chip UI. */
  shortCode: string;
  /** ISO 3166-1 alpha-2 for `react-native-country-flag`. */
  countryIsoCode: string;
  /** Native endonym shown in the picker list. */
  nativeName: string;
  /** Extra tokens for search (English name, aliases). */
  searchTerms: string[];
};

/** Supported languages — append rows here as locales are added. */
export const APP_LANGUAGES: readonly AppLanguageOption[] = [
  {
    code: 'en',
    shortCode: 'EN',
    countryIsoCode: 'us',
    nativeName: 'English',
    searchTerms: ['english', 'en', 'us', 'usa', 'united states'],
  },
  {
    code: 'vi',
    shortCode: 'VI',
    countryIsoCode: 'vn',
    nativeName: 'Tiếng Việt',
    searchTerms: ['vietnamese', 'viet', 'vietnam', 'vi', 'tieng viet'],
  },
] as const;

/** Show search field once the catalog grows past a couple of options. */
export const LANGUAGE_SEARCH_MIN_COUNT = 5;

export function resolveAppLanguageCode(language: string | undefined | null): AppLanguageCode {
  if ((language ?? '').toLowerCase().startsWith('vi')) return 'vi';
  return 'en';
}

export function findAppLanguage(code: AppLanguageCode): AppLanguageOption {
  return APP_LANGUAGES.find((item) => item.code === code) ?? APP_LANGUAGES[0]!;
}

export function shouldShowLanguageSearch(languageCount = APP_LANGUAGES.length) {
  return languageCount >= LANGUAGE_SEARCH_MIN_COUNT;
}

export function filterAppLanguages(query: string, languages: readonly AppLanguageOption[] = APP_LANGUAGES) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...languages];
  return languages.filter((item) => {
    const haystack = [item.code, item.shortCode, item.countryIsoCode, item.nativeName, ...item.searchTerms]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalized);
  });
}
