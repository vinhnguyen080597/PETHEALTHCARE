import test from 'node:test';
import assert from 'node:assert/strict';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import vi from '../src/i18n/locales/vi.json' with { type: 'json' };
import { ACTIVE_PET_FEED_SPECIES } from '../src/constants/petSpecies.ts';
import {
  listingBreedKeysForSpecies,
  nextListingBreedForSpecies,
  POPULAR_CAT_BREED_KEYS,
} from '../src/constants/petBreeds.ts';

test('listing breed keys follow the selected species', () => {
  const dogBreeds = listingBreedKeysForSpecies('dog');
  assert.ok(dogBreeds.includes('poodle'));
  assert.equal(dogBreeds.includes('meo_muop'), false);
  assert.deepEqual([...listingBreedKeysForSpecies('cat')], [...POPULAR_CAT_BREED_KEYS]);
  assert.ok(listingBreedKeysForSpecies('bird').includes('budgie'));
  assert.ok(listingBreedKeysForSpecies('fish').includes('betta'));
  assert.ok(listingBreedKeysForSpecies('rabbit').includes('holland_lop'));
  assert.ok(listingBreedKeysForSpecies('hamster').includes('syrian'));
  assert.ok(listingBreedKeysForSpecies('reptile').includes('turtle'));

  assert.equal(nextListingBreedForSpecies('dog', 'meo_muop'), 'poodle');
  assert.equal(nextListingBreedForSpecies('dog', 'mixed'), 'mixed');
  assert.equal(nextListingBreedForSpecies('cat', 'poodle'), 'meo_ta');
  assert.equal(nextListingBreedForSpecies('bird', ''), '');
});

test('every listing species breed key has EN and VI labels', () => {
  for (const species of ACTIVE_PET_FEED_SPECIES) {
    const keys = listingBreedKeysForSpecies(species);
    assert.ok(keys.includes('mixed'));
    assert.ok(keys.includes('other'));
    for (const id of keys) {
      const enLabel = en.createPetFeedPost.options.breeds[id as keyof typeof en.createPetFeedPost.options.breeds];
      const viLabel = vi.createPetFeedPost.options.breeds[id as keyof typeof vi.createPetFeedPost.options.breeds];
      assert.ok(enLabel, `missing EN breed ${id}`);
      assert.ok(viLabel, `missing VI breed ${id}`);
    }
  }
  assert.equal(vi.createPetFeedPost.options.breeds.mixed, 'Giống lai');
  assert.equal(vi.createPetFeedPost.options.breeds.pomeranian, 'Phốc sóc');
});

test('create listing form description section has no contact fields copy', () => {
  assert.equal(en.createPetFeedPost.descriptionAndContact, 'Description');
  assert.equal(vi.createPetFeedPost.descriptionAndContact, 'Mô tả');
});
