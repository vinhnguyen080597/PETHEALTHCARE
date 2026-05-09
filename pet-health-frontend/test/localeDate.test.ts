import test from 'node:test';
import assert from 'node:assert/strict';
import { formatLocaleDateTime } from '../src/i18n/localeDate.ts';

test('formatLocaleDateTime uses vi-VN for Vietnamese language', () => {
  const spy = Date.prototype.toLocaleString;
  let receivedLocale = '';
  Date.prototype.toLocaleString = function mock(locale?: string | string[]) {
    receivedLocale = Array.isArray(locale) ? String(locale[0] ?? '') : String(locale ?? '');
    return 'mock-result';
  };

  try {
    const result = formatLocaleDateTime('2026-05-09T10:00:00.000Z', 'vi');
    assert.equal(result, 'mock-result');
    assert.equal(receivedLocale, 'vi-VN');
  } finally {
    Date.prototype.toLocaleString = spy;
  }
});

test('formatLocaleDateTime falls back to en-US for non-vi languages', () => {
  const spy = Date.prototype.toLocaleString;
  let receivedLocale = '';
  Date.prototype.toLocaleString = function mock(locale?: string | string[]) {
    receivedLocale = Array.isArray(locale) ? String(locale[0] ?? '') : String(locale ?? '');
    return 'mock-result';
  };

  try {
    const result = formatLocaleDateTime('2026-05-09T10:00:00.000Z', 'en');
    assert.equal(result, 'mock-result');
    assert.equal(receivedLocale, 'en-US');
  } finally {
    Date.prototype.toLocaleString = spy;
  }
});

