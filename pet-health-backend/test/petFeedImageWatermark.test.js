import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import sharp from 'sharp';
import {
  PET_FEED_IMAGE_WATERMARK_OPACITY,
  PET_FEED_IMAGE_WATERMARK_ROTATE_DEG,
  PET_FEED_IMAGE_WATERMARK_TEXT,
  bakePetFeedImageWatermark,
} from '../src/services/petFeedImageWatermark.js';

describe('bakePetFeedImageWatermark', () => {
  it('keeps Pet Marketplace brand text style contract', () => {
    assert.equal(PET_FEED_IMAGE_WATERMARK_TEXT, 'Pet Marketplace');
    assert.equal(PET_FEED_IMAGE_WATERMARK_OPACITY, 0.3);
    assert.equal(Math.abs(PET_FEED_IMAGE_WATERMARK_ROTATE_DEG), 45);
  });

  it('composites a watermark into a JPEG buffer', async () => {
    const input = await sharp({
      create: {
        width: 320,
        height: 240,
        channels: 3,
        background: { r: 40, g: 120, b: 200 },
      },
    })
      .jpeg()
      .toBuffer();

    const output = await bakePetFeedImageWatermark(input, 'image/jpeg');
    assert.ok(Buffer.isBuffer(output));
    assert.notEqual(Buffer.compare(input, output), 0);

    const meta = await sharp(output).metadata();
    assert.equal(meta.format, 'jpeg');
    assert.equal(meta.width, 320);
    assert.equal(meta.height, 240);
  });

  it('returns the original buffer when input is empty', async () => {
    const empty = Buffer.alloc(0);
    const output = await bakePetFeedImageWatermark(empty, 'image/jpeg');
    assert.equal(output, empty);
  });
});
