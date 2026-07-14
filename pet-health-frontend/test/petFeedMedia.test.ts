import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatBytesAsMb,
  isPetFeedVideoDurationAllowed,
  PET_FEED_PHOTO_MAX_BYTES,
  PET_FEED_VIDEO_MAX_BYTES,
  PET_FEED_VIDEO_MAX_DURATION_SECONDS,
} from '../src/utils/petFeedMediaLimits.ts';

describe('petFeedMediaLimits', () => {
  it('matches backend photo and video ceilings', () => {
    assert.equal(PET_FEED_PHOTO_MAX_BYTES, 8 * 1024 * 1024);
    assert.equal(PET_FEED_VIDEO_MAX_BYTES, 50 * 1024 * 1024);
    assert.equal(PET_FEED_VIDEO_MAX_DURATION_SECONDS, 180);
  });

  it('formats megabyte labels', () => {
    assert.equal(formatBytesAsMb(12 * 1024 * 1024), '12MB');
    assert.equal(formatBytesAsMb(500 * 1024), '1MB');
  });
});

describe('isPetFeedVideoDurationAllowed', () => {
  it('accepts durations under the 3-minute cap (milliseconds)', () => {
    assert.equal(isPetFeedVideoDurationAllowed(179_000), true);
    assert.equal(isPetFeedVideoDurationAllowed(180_000), true);
  });

  it('rejects longer than 3 minutes', () => {
    assert.equal(isPetFeedVideoDurationAllowed(181_000), false);
    assert.equal(isPetFeedVideoDurationAllowed(200_000), false);
  });

  it('treats missing duration as allowed', () => {
    assert.equal(isPetFeedVideoDurationAllowed(null), true);
    assert.equal(isPetFeedVideoDurationAllowed(undefined), true);
  });
});
