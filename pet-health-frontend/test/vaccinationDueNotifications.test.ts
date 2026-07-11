import test from 'node:test';
import assert from 'node:assert/strict';
import type { CoreCareRecord } from '../src/types.ts';
import {
  countVaccinationScheduleDue,
  isVaccinationScheduleDueRecord,
  totalVaccinationScheduleDue,
} from '../src/utils/vaccinationDueNotifications.ts';

const today = new Date('2026-07-11T12:00:00');

function reminder(overrides: Partial<CoreCareRecord> = {}): CoreCareRecord {
  return {
    id: 'r1',
    user_id: 'u1',
    pet_id: 'p1',
    type: 'reminder',
    title: 'Vaccine dose',
    note: '',
    occurred_at: '2026-01-01T00:00:00.000Z',
    due_at: '2026-07-11',
    status: 'pending',
    metadata: {
      generatedCoreCareScheduleId: 'sched-1',
      generatedCoreCareKind: 'vaccine',
    },
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

test('counts generated vaccine reminders that are due today', () => {
  assert.equal(isVaccinationScheduleDueRecord(reminder(), today), true);
  assert.equal(countVaccinationScheduleDue([reminder()], today), 1);
});

test('counts deworming schedule reminders', () => {
  const deworming = reminder({
    metadata: {
      generatedCoreCareScheduleId: 'sched-2',
      generatedCoreCareKind: 'deworming',
    },
  });
  assert.equal(isVaccinationScheduleDueRecord(deworming, today), true);
});

test('counts manual reminders', () => {
  const manual = reminder({
    title: 'Custom vet follow-up',
    metadata: {},
  });
  assert.equal(isVaccinationScheduleDueRecord(manual, today), true);
});

test('ignores upcoming vaccine reminders', () => {
  const upcoming = reminder({ due_at: '2026-07-20' });
  assert.equal(isVaccinationScheduleDueRecord(upcoming, today), false);
});

test('counts dog generated vaccine schedule reminders', () => {
  const dogReminder = reminder({
    metadata: {
      generatedCoreCareVaccineScheduleId: 'dog-sched-1',
      vaccineId: 'dhpp',
      generatedCoreCareDoseNumber: 2,
    },
  });
  assert.equal(isVaccinationScheduleDueRecord(dogReminder, today), true);
});

test('ignores completed reminders', () => {
  const done = reminder({ status: 'done' });
  assert.equal(countVaccinationScheduleDue([done], today), 0);
});

test('counts vaccine, deworming, and manual reminders together', () => {
  const deworming = reminder({
    id: 'r2',
    metadata: {
      generatedCoreCareScheduleId: 'sched-2',
      generatedCoreCareKind: 'deworming',
    },
  });
  const manual = reminder({ id: 'r3', metadata: {} });
  assert.equal(countVaccinationScheduleDue([reminder(), deworming, manual], today), 3);
});

test('totals per-pet counts', () => {
  const counts = { p1: 2, p2: 0, p3: 1 };
  assert.equal(totalVaccinationScheduleDue(counts), 3);
});
