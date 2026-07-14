import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isOwnedPetFeedPublicMediaUrl } from '../src/services/imageStorageService.js';

describe('isOwnedPetFeedPublicMediaUrl', () => {
  const userId = 'user-abc';

  it('accepts public object URLs under the user pet-feed folder', () => {
    const url = `https://xyz.supabase.co/storage/v1/object/public/pet-feed-public-media/${userId}/pet-feed/photos/123.jpg`;
    assert.equal(isOwnedPetFeedPublicMediaUrl(userId, url, 'photo'), true);
  });

  it('rejects URLs for another user path', () => {
    const url = `https://xyz.supabase.co/storage/v1/object/public/pet-feed-public-media/other-user/pet-feed/photos/123.jpg`;
    assert.equal(isOwnedPetFeedPublicMediaUrl(userId, url, 'photo'), false);
  });

  it('rejects wrong media kind folder', () => {
    const url = `https://xyz.supabase.co/storage/v1/object/public/pet-feed-public-media/${userId}/pet-feed/photos/123.jpg`;
    assert.equal(isOwnedPetFeedPublicMediaUrl(userId, url, 'video'), false);
  });

  it('accepts memory:// fallback URLs for local storage', () => {
    const url = `memory://pet-feed-public-media/${userId}/pet-feed/videos/clip.mp4`;
    assert.equal(isOwnedPetFeedPublicMediaUrl(userId, url, 'video'), true);
  });
});
