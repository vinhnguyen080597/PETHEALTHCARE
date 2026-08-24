import test from 'node:test';
import assert from 'node:assert/strict';
import { BRAND } from '../src/theme/brand.ts';
import {
  formatHeaderBadgeCount,
  headerActionColors,
} from '../src/utils/headerActionDisplay.ts';

test('formatHeaderBadgeCount matches web badge formatting', () => {
  assert.equal(formatHeaderBadgeCount(0), '0');
  assert.equal(formatHeaderBadgeCount(2), '2');
  assert.equal(formatHeaderBadgeCount(99), '99');
  assert.equal(formatHeaderBadgeCount(100), '99+');
});

test('headerActionColors match web SiteHeader and BRAND header tokens', () => {
  const colors = headerActionColors();
  assert.equal(colors.icon, '#78716C');
  assert.equal(colors.badge, '#D97706');
  assert.equal(colors.pressBackground, '#FFFBEB');
  assert.equal(colors.icon, BRAND.headerIcon);
  assert.equal(colors.badge, BRAND.headerBadge);
  assert.equal(colors.pressBackground, BRAND.headerIconPress);
});
