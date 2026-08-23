import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPetFeedDetailSpecs } from '../src/utils/petFeedDetailSpecs.ts';

test('buildPetFeedDetailSpecs returns breed age gender location in web order', () => {
  const specs = buildPetFeedDetailSpecs(
    {
      breed: 'Mèo ta',
      age_months: 2,
      gender: 'Đực',
      location: 'An Giang',
    },
    {
      ageMonths: (count) => `${count} tháng`,
      male: 'Đực',
      female: 'Cái',
    },
  );
  assert.deepEqual(
    specs.map((s) => s.key),
    ['breed', 'age', 'gender', 'location'],
  );
  assert.equal(specs[0]?.value, 'Mèo ta');
  assert.equal(specs[1]?.value, '2 tháng');
  assert.equal(specs[2]?.value, 'Đực');
});

test('buildPetFeedDetailSpecs skips blank values', () => {
  const specs = buildPetFeedDetailSpecs(
    { breed: '', age_months: null, gender: '', location: 'Hà Nội' },
    {
      ageMonths: (count) => `${count} mo`,
      male: 'Male',
      female: 'Female',
    },
  );
  assert.deepEqual(
    specs.map((s) => s.key),
    ['location'],
  );
});
