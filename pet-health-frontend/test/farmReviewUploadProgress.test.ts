import test from 'node:test';
import assert from 'node:assert/strict';
import { farmReviewUploadPercent } from '../src/utils/farmReviewUploadShared.ts';
import { farmReviewUploadProgressLabel } from '../src/utils/farmReviewUploadProgress.ts';

test('farmReviewUploadPercent clamps to 0-100', () => {
  assert.equal(farmReviewUploadPercent(0, 3), 0);
  assert.equal(farmReviewUploadPercent(1, 3), 33);
  assert.equal(farmReviewUploadPercent(3, 3), 100);
  assert.equal(farmReviewUploadPercent(0, 0), 100);
});

test('farmReviewUploadProgressLabel includes percent and phase', () => {
  const t = ((key: string, vars?: Record<string, unknown>) => {
    if (vars) {
      return `${key}:${vars.current}/${vars.total}`;
    }
    return key;
  }) as Parameters<typeof farmReviewUploadProgressLabel>[1];

  assert.match(
    farmReviewUploadProgressLabel(
      { phase: 'uploading_photo', completedSteps: 0, totalSteps: 3, current: 1, total: 2 },
      t,
    ),
    /farm\.review\.uploadingPhoto:1\/2 \(0%\)/,
  );
  assert.match(
    farmReviewUploadProgressLabel(
      { phase: 'submitting', completedSteps: 2, totalSteps: 3 },
      t,
    ),
    /farm\.review\.submittingReview \(67%\)/,
  );
});
