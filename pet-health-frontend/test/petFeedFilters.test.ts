import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PET_FEED_SORT_DIRECTION,
  DEFAULT_PET_FEED_SORT_FIELD,
  PET_FEED_SORT_CHIP_FIELDS,
} from '../src/constants/petFeedSort.ts';
import { ALL_PROVINCES_FILTER } from '../src/constants/vietnamProvinces.ts';
import { countPostsByGender, postMatchesGender, resolvePostGender } from '../src/utils/petFeedGender.ts';
import { postMatchesProvince } from '../src/utils/petFeedLocation.ts';
import { isPetFeedQuickFilterActive } from '../src/utils/petFeedQuickFilters.ts';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import vi from '../src/i18n/locales/vi.json' with { type: 'json' };

test('resolvePostGender handles English and Vietnamese labels', () => {
  assert.equal(resolvePostGender('male'), 'male');
  assert.equal(resolvePostGender('female'), 'female');
  assert.equal(resolvePostGender('Đực'), 'male');
  assert.equal(resolvePostGender('Cái'), 'female');
  assert.equal(resolvePostGender(''), 'unknown');
});

test('postMatchesGender filters by resolved gender', () => {
  assert.equal(postMatchesGender({ gender: 'Đực' }, 'male'), true);
  assert.equal(postMatchesGender({ gender: 'Cái' }, 'male'), false);
});

test('countPostsByGender counts Vietnamese gender values', () => {
  const posts = [{ gender: 'Đực' }, { gender: 'Cái' }, { gender: 'Cái' }];
  assert.equal(countPostsByGender(posts, 'male'), 1);
  assert.equal(countPostsByGender(posts, 'female'), 2);
});

test('postMatchesProvince matches province inside free-text location', () => {
  assert.equal(
    postMatchesProvince({ location: 'Q. Bình Tân, TP. Hồ Chí Minh', breeder_profile: null }, 'TP. Hồ Chí Minh'),
    true,
  );
  assert.equal(
    postMatchesProvince({ location: 'Đà Nẵng', breeder_profile: null }, 'TP. Đà Nẵng'),
    true,
  );
  assert.equal(postMatchesProvince({ location: 'Hà Nội', breeder_profile: null }, 'TP. Hồ Chí Minh'), false);
});

test('pet feed sort defaults to newest date with no chip selected', () => {
  assert.deepEqual([...PET_FEED_SORT_CHIP_FIELDS], ['age', 'price']);
  assert.equal(DEFAULT_PET_FEED_SORT_FIELD, 'date');
  assert.equal(DEFAULT_PET_FEED_SORT_DIRECTION, 'desc');
});

test('pet feed filter all-provinces label is Nationwide / Toàn quốc', () => {
  assert.equal(en.petFeed.filters.allProvinces, 'Nationwide');
  assert.equal(vi.petFeed.filters.allProvinces, 'Toàn quốc');
});

test('pet feed sort i18n has EN/VI parity for chip sort fields', () => {
  for (const field of PET_FEED_SORT_CHIP_FIELDS) {
    assert.ok(en.petFeed.sort[field], `missing EN sort.${field}`);
    assert.ok(vi.petFeed.sort[field], `missing VI sort.${field}`);
  }
  assert.equal('date' in en.petFeed.sort, false);
  assert.equal('date' in vi.petFeed.sort, false);
});

test('quick-filter icon ignores species; highlights only sidebar panel filters', () => {
  assert.equal(
    isPetFeedQuickFilterActive({
      provinceFilter: ALL_PROVINCES_FILTER,
      genderFilter: 'all',
      sortField: 'date',
      sortDirection: 'desc',
    }),
    false,
  );
  assert.equal(
    isPetFeedQuickFilterActive({
      provinceFilter: ALL_PROVINCES_FILTER,
      genderFilter: 'male',
      sortField: 'date',
      sortDirection: 'desc',
    }),
    true,
  );
  assert.equal(
    isPetFeedQuickFilterActive({
      provinceFilter: ALL_PROVINCES_FILTER,
      genderFilter: 'all',
      sortField: 'age',
      sortDirection: 'asc',
    }),
    true,
  );
});
