import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveScheduleDueStatus } from '../src/utils/scheduleDueStatus.ts';

const today = new Date('2026-07-09T15:30:00');

test('resolveScheduleDueStatus marks future dates as upcoming', () => {
  assert.equal(resolveScheduleDueStatus('2026-07-10', today), 'upcoming');
});

test('resolveScheduleDueStatus marks today as due_today', () => {
  assert.equal(resolveScheduleDueStatus('2026-07-09', today), 'due_today');
  assert.equal(resolveScheduleDueStatus('2026-07-09T08:00:00', today), 'due_today');
});

test('resolveScheduleDueStatus marks past dates as overdue', () => {
  assert.equal(resolveScheduleDueStatus('2026-07-08', today), 'overdue');
});

test('resolveScheduleDueStatus returns null for invalid dates', () => {
  assert.equal(resolveScheduleDueStatus('', today), null);
  assert.equal(resolveScheduleDueStatus('invalid', today), null);
});
