import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CHAT_MEDIA_PREVIEW_PHOTO,
  CHAT_MEDIA_PREVIEW_VIDEO,
  formatChatInboxPreview,
  isChatVideoUrl,
  normalizeMessageMedia,
} from '../src/utils/chatMedia.ts';

describe('chatMedia', () => {
  it('detects video URLs from path and extension', () => {
    assert.equal(isChatVideoUrl('https://cdn.example/pet-feed/videos/a.mp4'), true);
    assert.equal(isChatVideoUrl('https://cdn.example/photos/a.jpg'), false);
  });

  it('normalizes http media urls', () => {
    assert.deepEqual(
      normalizeMessageMedia(['https://cdn.example/a.jpg', 'nope', '']),
      ['https://cdn.example/a.jpg'],
    );
  });

  it('maps inbox photo/video sentinels', () => {
    assert.equal(
      formatChatInboxPreview(CHAT_MEDIA_PREVIEW_PHOTO, 'empty', { photo: 'Ảnh', video: 'Video' }),
      'Ảnh',
    );
    assert.equal(
      formatChatInboxPreview(CHAT_MEDIA_PREVIEW_VIDEO, 'empty', { photo: 'Ảnh', video: 'Video' }),
      'Video',
    );
    assert.equal(formatChatInboxPreview('', 'empty', { photo: 'Ảnh', video: 'Video' }), 'empty');
  });
});
