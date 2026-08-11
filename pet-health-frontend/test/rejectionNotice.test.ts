import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isGenericListingRejectedPreview,
  resolveRejectionNotice,
} from '../src/utils/rejectionNotice.ts';

test('generic listing-rejected previews are not treated as the admin reason', () => {
  assert.equal(
    isGenericListingRejectedPreview('Bài đăng "gà bé mèo con" chưa được duyệt.'),
    true,
  );
  assert.equal(isGenericListingRejectedPreview('Thiếu sổ tiêm và ảnh môi trường'), false);
});

test('resolveRejectionNotice prefers stored reason over generic body preview', () => {
  assert.equal(
    resolveRejectionNotice({
      body_preview: 'Bài đăng "gà bé mèo con" chưa được duyệt.',
      metadata: { rejection_reason: 'Ảnh không khớp bé' },
    }).reason,
    'Ảnh không khớp bé',
  );
});
