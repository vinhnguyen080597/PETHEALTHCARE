import test from 'node:test';
import assert from 'node:assert/strict';
import { ADD_PET_SPECIES_OPTIONS, ACTIVE_PET_SPECIES } from '../src/constants/petSpecies.ts';

test('add pet form offers dog and cat species', () => {
  assert.deepEqual(ADD_PET_SPECIES_OPTIONS, ['dog', 'cat']);
});

test('active pet species scope remains cat-only for health flows', () => {
  assert.deepEqual(ACTIVE_PET_SPECIES, ['cat']);
});
