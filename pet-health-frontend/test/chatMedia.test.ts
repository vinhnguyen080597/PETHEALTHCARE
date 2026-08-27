import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  appendChatMediaPicks,
  CHAT_MEDIA_PREVIEW_PHOTO,
  CHAT_MEDIA_PREVIEW_VIDEO,
  CHAT_UI,
  chatMediaKindFromMeta,
  formatChatInboxPreview,
  inboxPreviewFromMessage,
  isChatVideoUrl,
  isFarmChatConversation,
  messageHasSendableContent,
  normalizeMessageMedia,
} from '../src/utils/chatMedia.ts';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import vi from '../src/i18n/locales/vi.json' with { type: 'json' };

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

  it('supports media-only send and farm conversation detection', () => {
    assert.equal(messageHasSendableContent('', 1), true);
    assert.equal(messageHasSendableContent('hi', 0), true);
    assert.equal(messageHasSendableContent('  ', 0), false);
    assert.equal(isFarmChatConversation({ post_id: '' }), true);
    assert.equal(isFarmChatConversation({ post_id: 'p1' }), false);
    assert.equal(inboxPreviewFromMessage('', ['https://cdn.example/a.jpg']), CHAT_MEDIA_PREVIEW_PHOTO);
  });

  it('validates chat attachment picks like web', () => {
    assert.equal(chatMediaKindFromMeta({ mimeType: 'image/png' }), 'image');
    assert.equal(chatMediaKindFromMeta({ mimeType: 'image/gif' }), null);
    const picked = appendChatMediaPicks(
      [],
      [
        { uri: 'file://a.jpg', kind: 'image' },
        { uri: 'file://b.mp4', kind: 'video', fileSize: 60 * 1024 * 1024 },
      ],
    );
    assert.equal(picked.files.length, 1);
    assert.equal(picked.error, 'video_too_large');
  });

  it('chat UI accent matches web brand amber', () => {
    assert.equal(CHAT_UI.accent, '#D97706');
    assert.equal(en.petFeed.messages.chatWithFarm, 'Chat with farm');
    assert.equal(vi.petFeed.messages.chatWithFarm, 'Nhắn tin với trại');
    assert.ok(en.petFeed.messages.attach);
    assert.ok(vi.petFeed.messages.attach);
  });
});
