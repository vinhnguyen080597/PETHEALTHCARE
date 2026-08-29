import test from 'node:test';
import assert from 'node:assert/strict';
import {
  petFeedDetailShowsEditButton,
  petFeedDetailShowsMessageButton,
} from '../src/utils/petFeedDetailHeader.ts';

test('petFeedDetailShowsMessageButton hides for owner and requires handler', () => {
  assert.equal(petFeedDetailShowsMessageButton(true, true), false);
  assert.equal(petFeedDetailShowsMessageButton(false, false), false);
  assert.equal(petFeedDetailShowsMessageButton(false, true), true);
});

test('petFeedDetailShowsEditButton shows for owner and requires handler', () => {
  assert.equal(petFeedDetailShowsEditButton(true, true), true);
  assert.equal(petFeedDetailShowsEditButton(true, false), false);
  assert.equal(petFeedDetailShowsEditButton(false, true), false);
});
