import test from 'node:test';
import assert from 'node:assert/strict';
import { MEDIA_WATERMARK_TEXT } from '../src/utils/mediaWatermark.ts';

test('media watermark brand text is Pethub: Pet Marketplace', () => {
  assert.equal(MEDIA_WATERMARK_TEXT, 'Pethub: Pet Marketplace');
});
