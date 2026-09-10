import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPetFeedDetailSpecs } from '../src/utils/petFeedDetailSpecs.ts';

test('buildPetFeedDetailSpecs returns breed gender location birthDate', () => {
  const specs = buildPetFeedDetailSpecs(
    {
      breed: 'Mèo ta',
      gender: 'Đực',
      location: 'An Giang',
      birthDateLabel: '15/01/2024',
    },
    {
      male: 'Đực',
      female: 'Cái',
    },
  );
  assert.deepEqual(
    specs.map((s) => s.key),
    ['breed', 'gender', 'location', 'birthDate'],
  );
  assert.equal(specs[0]?.value, 'Mèo ta');
  assert.equal(specs[1]?.value, 'Đực');
  assert.equal(specs[3]?.value, '15/01/2024');
});

test('buildPetFeedDetailSpecs skips blank values', () => {
  const specs = buildPetFeedDetailSpecs(
    { breed: '', gender: '', location: 'Hà Nội' },
    {
      male: 'Male',
      female: 'Female',
    },
  );
  assert.deepEqual(
    specs.map((s) => s.key),
    ['location'],
  );
});
