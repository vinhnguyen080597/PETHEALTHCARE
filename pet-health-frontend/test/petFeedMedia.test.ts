import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatBytesAsMb, PET_FEED_PHOTO_MAX_BYTES, PET_FEED_VIDEO_MAX_BYTES } from '../src/utils/petFeedMediaLimits.ts';

describe('petFeedMediaLimits', () => {
  it('matches backend photo and video ceilings', () => {
    assert.equal(PET_FEED_PHOTO_MAX_BYTES, 25 * 1024 * 1024);
    assert.equal(PET_FEED_VIDEO_MAX_BYTES, 50 * 1024 * 1024);
  });

  it('formats megabyte labels', () => {
    assert.equal(formatBytesAsMb(12 * 1024 * 1024), '12MB');
    assert.equal(formatBytesAsMb(500 * 1024), '1MB');
  });
});
