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

test('create listing screen title is create listing / tạo bài đăng', () => {
  assert.equal(en.createPetFeedPost.title, 'Create listing');
  assert.equal(vi.createPetFeedPost.title, 'Tạo bài đăng');
});

test('create listing media hint does not mention drafts', () => {
  assert.equal(/draft/i.test(en.createPetFeedPost.mediaHint), false);
  assert.equal(/nháp/i.test(vi.createPetFeedPost.mediaHint), false);
});

test('create listing submit progress copy has EN/VI photo counters', () => {
  assert.match(en.createPetFeedPost.submitProgress.uploadingPhoto, /\{current\}/);
  assert.match(en.createPetFeedPost.submitProgress.uploadingPhoto, /\{total\}/);
  assert.match(vi.createPetFeedPost.submitProgress.uploadingPhoto, /\{current\}/);
  assert.match(vi.createPetFeedPost.submitProgress.uploadingPhoto, /\{total\}/);
  assert.equal(vi.createPetFeedPost.submitProgress.uploadingVideo, 'Đang tải video…');
  assert.equal(en.createPetFeedPost.submitProgress.saving, 'Submitting for review…');
  assert.equal(vi.createPetFeedPost.submitProgress.saving, 'Đang gửi duyệt…');
  assert.equal(en.createPetFeedPost.submitProgress.done, 'Complete');
  assert.equal(vi.createPetFeedPost.submitProgress.done, 'Hoàn tất');
});

test('create listing shows success copy after submit completes', () => {
  assert.equal(en.createPetFeedPost.submitSuccessTitle, 'Listing submitted successfully');
  assert.equal(vi.createPetFeedPost.submitSuccessTitle, 'Bài đăng đã được gửi thành công');
  assert.equal(en.createPetFeedPost.submitSuccessBody, 'An admin is reviewing it and will notify you soon');
  assert.equal(vi.createPetFeedPost.submitSuccessBody, 'Admin đang xem xét và sẽ thông báo sớm đến bạn');
  assert.equal(en.createPetFeedPost.publishSuccess, 'Listing published successfully.');
  assert.equal(vi.createPetFeedPost.publishSuccess, 'Đã đăng bài thành công.');
});

test('listing paperwork options are vaccine book, origin, and pedigree on request', () => {
  const paperwork = en.createPetFeedPost.options.paperwork;
  assert.deepEqual(Object.keys(paperwork), ['vaccineBook', 'origin', 'pedigreeOnRequest']);
  assert.equal(vi.createPetFeedPost.options.paperwork.vaccineBook, 'Sổ tiêm');
  assert.equal(vi.createPetFeedPost.options.paperwork.origin, 'Giấy nguồn gốc');
  assert.equal(vi.createPetFeedPost.options.paperwork.pedigreeOnRequest, 'Làm phả theo yêu cầu');
  assert.equal(en.createPetFeedPost.options.paperwork.pedigreeOnRequest, 'Pedigree on request');
});
