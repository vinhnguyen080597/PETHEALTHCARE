import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPetFeedSubmitProgress,
  countPetFeedPrepareSteps,
  countPetFeedUploadAndSaveSteps,
  petFeedSubmitPercent,
} from '../src/utils/petFeedSubmitProgress.ts';

test('petFeedSubmitPercent clamps and rounds', () => {
  assert.equal(petFeedSubmitPercent(0, 0), 100);
  assert.equal(petFeedSubmitPercent(0, 10), 0);
  assert.equal(petFeedSubmitPercent(5, 10), 50);
  assert.equal(petFeedSubmitPercent(10, 10), 100);
  assert.equal(petFeedSubmitPercent(11, 10), 100);
});

test('countPetFeedUploadAndSaveSteps counts local media plus save', () => {
  assert.equal(
    countPetFeedUploadAndSaveSteps({
      photoUris: ['file://a.jpg', 'https://cdn/x.jpg', 'file://b.jpg'],
      videoUri: 'file://v.mp4',
      listThumbUri: 'file://t.jpg',
      healthEvidenceUris: ['file://e.jpg', 'https://cdn/e2.jpg'],
    }),
    6,
  );
  assert.equal(
    countPetFeedUploadAndSaveSteps({
      photoUris: ['https://cdn/a.jpg'],
      videoUri: 'https://cdn/v.mp4',
    }),
    1,
  );
});

test('countPetFeedPrepareSteps only counts local photos', () => {
  assert.deepEqual(
    countPetFeedPrepareSteps(['file://a.jpg', 'https://cdn/b.jpg', 'file://c.jpg']),
    { preparePhotoCount: 2, prepareThumb: true },
  );
  assert.deepEqual(countPetFeedPrepareSteps(['https://cdn/a.jpg']), {
    preparePhotoCount: 0,
    prepareThumb: false,
  });
});

test('buildPetFeedSubmitProgress includes percent and photo counters', () => {
  const progress = buildPetFeedSubmitProgress({
    phase: 'uploading_photo',
    completedSteps: 2,
    totalSteps: 8,
    current: 2,
    total: 5,
  });
  assert.equal(progress.percent, 25);
  assert.equal(progress.current, 2);
  assert.equal(progress.total, 5);
  assert.equal(progress.phase, 'uploading_photo');
});
