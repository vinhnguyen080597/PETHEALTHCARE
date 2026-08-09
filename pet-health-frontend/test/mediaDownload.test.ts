import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canDownloadPostMedia,
  mediaDownloadFileName,
  selectedMediaDownloadUrl,
} from '../src/utils/mediaDownload.ts';

const root = dirname(fileURLToPath(import.meta.url));
const en = JSON.parse(readFileSync(join(root, '../src/i18n/locales/en.json'), 'utf8'));
const vi = JSON.parse(readFileSync(join(root, '../src/i18n/locales/vi.json'), 'utf8'));

test('only admin can download post media', () => {
  assert.equal(canDownloadPostMedia(true), true);
  assert.equal(canDownloadPostMedia(false), false);
});

test('mediaDownloadFileName and selected url', () => {
  assert.equal(
    mediaDownloadFileName('https://cdn.example.com/a/b/photo.webp'),
    'photo.webp',
  );
  assert.equal(selectedMediaDownloadUrl({ type: 'image', uri: ' https://x ' }), 'https://x');
  assert.equal(selectedMediaDownloadUrl(null), null);
});

test('petFeed downloadMedia i18n exists EN/VI', () => {
  assert.ok(en.petFeed.downloadMedia);
  assert.ok(vi.petFeed.downloadMedia);
  assert.ok(en.petFeed.downloadMediaFailed);
  assert.ok(vi.petFeed.downloadMediaFailed);
});
