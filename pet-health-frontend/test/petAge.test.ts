import assert from 'node:assert/strict';
import test from 'node:test';
import {
  approximateBirthDateFromAgeMonths,
  birthDateToAgeMonths,
  calculateAgeBreakdown,
  formatBirthDateIso,
  formatPetAgeBreakdown,
  petBirthDateForForm,
  resolvePetAgeMonths,
} from '../src/utils/petAge.ts';

function mockT(key: string, opts?: Record<string, unknown>) {
  if (key === 'petAge.years') return `${opts?.count} năm`;
  if (key === 'petAge.months') return `${opts?.count} tháng`;
  if (key === 'petAge.days') return `${opts?.count} ngày`;
  return key;
}

test('birthDateToAgeMonths computes whole months', () => {
  const months = birthDateToAgeMonths('2024-01-15', new Date('2024-03-20T12:00:00'));
  assert.equal(months, 2);
});

test('petBirthDateForForm prefers stored birth_date', () => {
  assert.equal(petBirthDateForForm({ birth_date: '2023-05-10T00:00:00+00:00', age: 12 }), '2023-05-10');
});

test('resolvePetAgeMonths uses birth_date when available', () => {
  const today = new Date();
  const birthDate = formatBirthDateIso(approximateBirthDateFromAgeMonths(6, today));
  assert.equal(resolvePetAgeMonths({ birth_date: birthDate, age: 99 }), 6);
});

test('calculateAgeBreakdown returns years months days', () => {
  assert.deepEqual(calculateAgeBreakdown('2024-01-15', new Date('2025-01-21T12:00:00')), {
    years: 1,
    months: 0,
    days: 6,
  });
  assert.deepEqual(calculateAgeBreakdown('2025-05-10', new Date('2025-06-15T12:00:00')), {
    years: 0,
    months: 1,
    days: 5,
  });
  assert.deepEqual(calculateAgeBreakdown('2023-06-01', new Date('2025-12-13T12:00:00')), {
    years: 2,
    months: 6,
    days: 12,
  });
});

test('formatPetAgeBreakdown omits zero parts', () => {
  assert.equal(formatPetAgeBreakdown({ years: 1, months: 0, days: 6 }, mockT), '1 năm 6 ngày');
  assert.equal(formatPetAgeBreakdown({ years: 0, months: 1, days: 5 }, mockT), '1 tháng 5 ngày');
  assert.equal(
    formatPetAgeBreakdown({ years: 1, months: 6, days: 12 }, mockT),
    '1 năm 6 tháng 12 ngày',
  );
});
