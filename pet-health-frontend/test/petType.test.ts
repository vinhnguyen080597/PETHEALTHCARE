import test from 'node:test';
import assert from 'node:assert/strict';
import {
  breederMatchesPetType,
  normalizePetType,
  postMatchesPetType,
  resolveBreederPetType,
  resolvePostPetType,
} from '../src/utils/petType.ts';

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

test('resolvePostPetType prefers pet_type then species', () => {
  assert.equal(resolvePostPetType({ pet_type: 'dog', species: 'cat' }), 'dog');
  assert.equal(resolvePostPetType({ pet_type: null, species: 'bird' }), 'bird');
});

test('postMatchesPetType filters by resolved pet type', () => {
  assert.equal(postMatchesPetType({ pet_type: null, species: 'fish' }, 'fish'), true);
  assert.equal(postMatchesPetType({ pet_type: null, species: 'cat' }, 'dog'), false);
});

test('breederMatchesPetType checks profile species and post species', () => {
  assert.equal(
    breederMatchesPetType({ pet_type: null, primary_species: ['bird'] }, 'bird', []),
    true,
  );
  assert.equal(
    breederMatchesPetType({ pet_type: null, primary_species: ['dog'] }, 'mouse', ['mouse']),
    true,
  );
  assert.equal(resolveBreederPetType({ pet_type: 'fish', primary_species: ['cat'] }), 'fish');
});
