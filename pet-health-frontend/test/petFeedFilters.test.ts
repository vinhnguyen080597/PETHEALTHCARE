import test from 'node:test';
import assert from 'node:assert/strict';
import { countPostsByGender, postMatchesGender, resolvePostGender } from '../src/utils/petFeedGender.ts';
import { postMatchesProvince } from '../src/utils/petFeedLocation.ts';

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
  assert.equal(postMatchesProvince({ location: 'Hà Nội', breeder_profile: null }, 'TP. Hồ Chí Minh'), false);
});
