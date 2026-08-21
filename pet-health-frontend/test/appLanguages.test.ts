import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  APP_LANGUAGES,
  LANGUAGE_SEARCH_MIN_COUNT,
  filterAppLanguages,
  findAppLanguage,
  resolveAppLanguageCode,
  shouldShowLanguageSearch,
} from '../src/utils/appLanguages.ts';

describe('appLanguages', () => {
  it('resolves language codes from i18n tags', () => {
    assert.equal(resolveAppLanguageCode('vi'), 'vi');
    assert.equal(resolveAppLanguageCode('vi-VN'), 'vi');
    assert.equal(resolveAppLanguageCode('en-US'), 'en');
    assert.equal(resolveAppLanguageCode(undefined), 'en');
  });

  it('maps languages to ISO country codes for flag images', () => {
    assert.equal(findAppLanguage('vi').countryIsoCode, 'vn');
    assert.equal(findAppLanguage('en').countryIsoCode, 'us');
    assert.equal(findAppLanguage('vi').nativeName, 'Tiếng Việt');
    assert.equal(findAppLanguage('en').nativeName, 'English');
  });

  it('filters languages by native name and search aliases', () => {
    assert.equal(filterAppLanguages('việt').map((item) => item.code).join(','), 'vi');
    assert.equal(filterAppLanguages('english').map((item) => item.code).join(','), 'en');
    assert.equal(filterAppLanguages('xyz').length, 0);
    assert.equal(filterAppLanguages('').length, APP_LANGUAGES.length);
  });

  it('hides search until the catalog is large enough', () => {
    assert.equal(shouldShowLanguageSearch(2), false);
    assert.equal(shouldShowLanguageSearch(LANGUAGE_SEARCH_MIN_COUNT), true);
  });
});
