import test from 'node:test';
import assert from 'node:assert/strict';
import {
  breederDisplaySpecies,
  breederSpeciesForSave,
  selectPrimarySpecies,
  splitBreederSpeciesForForm,
} from '../src/utils/breederSpeciesSelection.ts';

test('selectPrimarySpecies replaces the current choice', () => {
  assert.equal(selectPrimarySpecies('cat', 'dog'), 'dog');
});

test('breederSpeciesForSave keeps one primary species', () => {
  assert.deepEqual(breederSpeciesForSave('dog'), {
    primarySpecies: ['dog'],
  });
});

test('breederDisplaySpecies returns primary list only', () => {
  assert.deepEqual(breederDisplaySpecies(['dog', 'cat']), ['dog', 'cat']);
});

test('splitBreederSpeciesForForm keeps the first primary species', () => {
  assert.equal(splitBreederSpeciesForForm(['dog', 'cat']), 'dog');
});
