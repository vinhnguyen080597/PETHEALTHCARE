import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePetFeedDeepLink,
  petFeedPostAppSchemeUrl,
  petFeedPostShareUrl,
} from '../src/utils/petFeedDeepLinkUrls.ts';

test('builds https share URL for a post', () => {
  assert.match(petFeedPostShareUrl('abc_123'), /\/app\/pet-feed\/posts\/abc_123\/$/);
  assert.match(petFeedPostShareUrl('abc_123'), /^https:\/\/pet-marketplace\.org\//);
});

test('builds custom scheme URL for landing-page handoff', () => {
  assert.equal(petFeedPostAppSchemeUrl('abc_123'), 'pethealthcare://pet-feed/posts/abc_123');
});

test('parses custom scheme deep link', () => {
  assert.deepEqual(parsePetFeedDeepLink('pethealthcare://pet-feed/posts/post-42'), {
    type: 'pet-feed-post',
    postId: 'post-42',
  });
});

test('parses https Universal Link path on custom domain', () => {
  assert.deepEqual(
    parsePetFeedDeepLink('https://pet-marketplace.org/app/pet-feed/posts/post-42/'),
    { type: 'pet-feed-post', postId: 'post-42' },
  );
});

test('parses legacy GitHub Pages path', () => {
  assert.deepEqual(
    parsePetFeedDeepLink('https://vinhnguyen080597.github.io/PETHEALTHCARE/app/pet-feed/posts/post-42/'),
    { type: 'pet-feed-post', postId: 'post-42' },
  );
});

test('parses legacy query deep link', () => {
  assert.deepEqual(
    parsePetFeedDeepLink('https://pet-marketplace.org/?petFeedPost=post-42'),
    { type: 'pet-feed-post', postId: 'post-42' },
  );
});

test('rejects invalid post ids', () => {
  assert.equal(parsePetFeedDeepLink('pethealthcare://pet-feed/posts/../evil'), null);
});
