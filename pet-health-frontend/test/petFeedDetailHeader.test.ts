import test from 'node:test';
import assert from 'node:assert/strict';
import { petFeedDetailShowsMessageButton } from '../src/utils/petFeedDetailHeader.ts';

test('petFeedDetailShowsMessageButton hides for owner and requires handler', () => {
  assert.equal(petFeedDetailShowsMessageButton(true, true), false);
  assert.equal(petFeedDetailShowsMessageButton(false, false), false);
  assert.equal(petFeedDetailShowsMessageButton(false, true), true);
});
