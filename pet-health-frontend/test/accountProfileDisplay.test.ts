import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { accountProfileInitials, accountShowsVerifiedBadge } from '../src/utils/accountProfileDisplay.ts';
import { BRAND } from '../src/theme/brand.ts';

const root = dirname(fileURLToPath(import.meta.url));
const en = JSON.parse(readFileSync(join(root, '../src/i18n/locales/en.json'), 'utf8'));
const vi = JSON.parse(readFileSync(join(root, '../src/i18n/locales/vi.json'), 'utf8'));

describe('accountProfileDisplay', () => {
  it('builds initials from display name', () => {
    assert.equal(accountProfileInitials('Mai Nguyen', null), 'MN');
    assert.equal(accountProfileInitials('Mai', null), 'MA');
  });

  it('falls back to email local-part', () => {
    assert.equal(accountProfileInitials('', 'hello@petcare.app'), 'HE');
    assert.equal(accountProfileInitials(null, 'ab'), 'AB');
  });

  it('shows verified badge for admin and verified breeders only', () => {
  assert.equal(accountShowsVerifiedBadge('admin', 'unverified'), true);
  assert.equal(accountShowsVerifiedBadge('breeder', 'verified'), true);
  assert.equal(accountShowsVerifiedBadge('breeder', 'pending_review'), false);
  assert.equal(accountShowsVerifiedBadge('sen', 'unverified'), false);
  assert.equal(accountShowsVerifiedBadge('breeder', 'verified', { complianceStripped: true }), false);
  });
});

describe('auth brand tokens', () => {
  it('uses warm orange primary aligned with web', () => {
    assert.equal(BRAND.primary, '#F97316');
    assert.equal(BRAND.accent, '#F59E0B');
    assert.equal(BRAND.surface, '#FCFBFA');
    assert.equal(BRAND.inputBorder, '#E2E8F0');
    assert.equal(BRAND.logout, '#EF4444');
  });
});

describe('account.profile i18n parity', () => {
  it('keeps verified badge label in EN and VI', () => {
    assert.equal(en.account.profile.verified, 'Verified');
    assert.equal(vi.account.profile.verified, 'Đã xác minh');
  });
});
