import test from 'node:test';
import assert from 'node:assert/strict';
import { isBucketMissingError } from '../src/services/storageBootstrap.js';

test('isBucketMissingError detects Supabase storage bucket errors', () => {
  assert.equal(isBucketMissingError({ message: 'Bucket not found' }), true);
  assert.equal(isBucketMissingError(new Error('Bucket not found')), true);
  assert.equal(isBucketMissingError({ message: 'row-level security' }), false);
});
