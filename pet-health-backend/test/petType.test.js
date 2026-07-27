import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePetType,
  resolveBreederPetType,
  resolvePostPetType,
  resolvePetTypeFromSpeciesList,
} from '../src/utils/petType.js';

test('normalizePetType maps dog, cat, bird, fish, and mouse aliases', () => {
  assert.equal(normalizePetType('dog'), 'dog');
  assert.equal(normalizePetType('Chó'), 'dog');
  assert.equal(normalizePetType('cat'), 'cat');
  assert.equal(normalizePetType('Mèo'), 'cat');
  assert.equal(normalizePetType('chim'), 'bird');
  assert.equal(normalizePetType('Cá'), 'fish');
  assert.equal(normalizePetType('chuột'), 'mouse');
  assert.equal(normalizePetType('Bò'), 'cow');
  assert.equal(normalizePetType('heo'), 'pig');
  assert.equal(normalizePetType('Gà'), 'chicken');
  assert.equal(normalizePetType('rabbit'), null);
});

test('resolvePostPetType derives from species', () => {
  assert.equal(resolvePostPetType('bird'), 'bird');
  assert.equal(resolvePostPetType('fish'), 'fish');
});

test('resolveBreederPetType uses primary_species', () => {
  assert.equal(resolveBreederPetType({ primary_species: ['mouse', 'dog'] }), 'mouse');
  assert.equal(resolvePetTypeFromSpeciesList(['bird', 'dog']), 'bird');
  assert.equal(resolveBreederPetType({ primary_species: [] }), null);
});
