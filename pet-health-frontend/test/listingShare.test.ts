import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeListingShare } from '../src/utils/listingShare.ts';
import { CHAT_LISTING_SHARE_PREVIEW, formatChatInboxPreview } from '../src/utils/chatMedia.ts';

describe('listingShare', () => {
  it('requires an id and trims listing snapshot fields', () => {
    assert.equal(normalizeListingShare({ title: 'aaa' }), null);
    assert.deepEqual(
      normalizeListingShare({
        id: ' p1 ',
        title: '  aaa  ',
        thumb_url: 'https://cdn/x.jpg',
        breed: 'Mix',
        price_note: '333333',
      }),
      {
        id: 'p1',
        title: 'aaa',
        thumb_url: 'https://cdn/x.jpg',
        price_note: '333333',
        species: '',
        breed: 'Mix',
        location: '',
        status: 'published',
        created_at: null,
        updated_at: null,
      },
    );
  });

  it('maps the listing inbox sentinel', () => {
    assert.equal(
      formatChatInboxPreview(CHAT_LISTING_SHARE_PREVIEW, 'empty', {
        photo: 'Ảnh',
        video: 'Video',
        listing: 'Tin đăng',
      }),
      'Tin đăng',
    );
  });
});
