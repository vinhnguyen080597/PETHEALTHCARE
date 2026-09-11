import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAT_ICON_RIPPLE_PLAY_MS,
  CHAT_ICON_RIPPLE_RING_COUNT,
  CHAT_ICON_RIPPLE_STAGGER_MS,
  chatIconRippleEndsAtMs,
  chatIconRippleRingDelayMs,
  chatIconRippleRingIndexes,
} from '../src/utils/chatIconRipple.ts';

test('chat icon ripple plays two staggered rings within 2s then stops', () => {
  assert.deepEqual(chatIconRippleRingIndexes(), [0, 1]);
  assert.equal(chatIconRippleRingIndexes().length, CHAT_ICON_RIPPLE_RING_COUNT);
  assert.equal(chatIconRippleRingDelayMs(0), 0);
  assert.equal(chatIconRippleRingDelayMs(1), CHAT_ICON_RIPPLE_STAGGER_MS);
  assert.equal(chatIconRippleRingDelayMs(-2), 0);
  assert.equal(chatIconRippleEndsAtMs(1), CHAT_ICON_RIPPLE_PLAY_MS);
  assert.ok(chatIconRippleEndsAtMs(0) <= CHAT_ICON_RIPPLE_PLAY_MS);
});
