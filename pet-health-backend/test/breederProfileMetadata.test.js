import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeBreederProfileMetadata } from '../src/utils/breederProfileMetadata.js';

test('sanitizeBreederProfileMetadata removes deprecated breeder form keys', () => {
  assert.deepEqual(
    sanitizeBreederProfileMetadata({
      breederType: 'home_breeder',
      scaleRange: '1_3',
      breedingPetRange: 'none',
      careChecklist: ['vaccination_schedule'],
      transparencyCommitments: ['accurate_information'],
    }),
    {
      breederType: 'home_breeder',
      transparencyCommitments: ['accurate_information'],
    },
  );
});
