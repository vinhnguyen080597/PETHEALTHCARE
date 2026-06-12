import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCoreCareSchedule, calculateNextVaccinationSchedule } from '../src/utils/coreCareSchedule.ts';

test('dog puppy schedule starts core vaccine at six weeks and includes deworming', () => {
  const recommendations = calculateCoreCareSchedule({
    species: 'dog',
    birthDate: new Date('2026-01-01T00:00:00'),
    today: new Date('2026-01-01T00:00:00'),
  });

  const firstDhpp = recommendations.find((item) => item.family === 'dogDhpp' && item.doseNumber === 1);
  const firstDeworming = recommendations.find((item) => item.family === 'dogDeworming' && item.doseNumber === 1);
  const rabies = recommendations.find((item) => item.family === 'dogRabies');

  assert.equal(firstDeworming?.dueDate, '2026-01-15');
  assert.equal(firstDhpp?.dueDate, '2026-02-12');
  assert.equal(rabies?.dueDate, '2026-03-26');
});

test('cat kitten schedule includes FVRCP, FeLV, rabies, and tropical deworming', () => {
  const recommendations = calculateCoreCareSchedule({
    species: 'cat',
    birthDate: new Date('2026-01-01T00:00:00'),
    today: new Date('2026-01-01T00:00:00'),
  });

  const firstFvrcp = recommendations.find((item) => item.family === 'catFvrcp' && item.doseNumber === 1);
  const firstFelv = recommendations.find((item) => item.family === 'catFelv' && item.doseNumber === 1);
  const firstDeworming = recommendations.find((item) => item.family === 'catDeworming' && item.doseNumber === 1);
  const rabies = recommendations.find((item) => item.family === 'catRabies');

  assert.equal(firstDeworming?.dueDate, '2026-01-15');
  assert.equal(firstFvrcp?.dueDate, '2026-02-12');
  assert.equal(firstFelv?.dueDate, '2026-02-26');
  assert.equal(rabies?.dueDate, '2026-03-26');
});

test('adult dog with unknown history gets catch-up reminders due today', () => {
  const recommendations = calculateCoreCareSchedule({
    species: 'dog',
    birthDate: new Date('2025-01-01T00:00:00'),
    today: new Date('2026-01-01T00:00:00'),
  });

  const dueToday = recommendations.filter((item) => item.dueDate === '2026-01-01');
  const dhppDoseTwo = recommendations.find((item) => item.family === 'dogDhpp' && item.doseNumber === 2);

  assert.ok(dueToday.some((item) => item.family === 'dogDhpp'));
  assert.ok(dueToday.some((item) => item.family === 'dogRabies'));
  assert.ok(dueToday.some((item) => item.family === 'dogDeworming'));
  assert.equal(dhppDoseTwo?.dueDate, '2026-01-29');
});

test('unsupported species returns no generated recommendations', () => {
  const recommendations = calculateCoreCareSchedule({
    species: 'hamster',
    birthDate: new Date('2026-01-01T00:00:00'),
    today: new Date('2026-01-01T00:00:00'),
  });

  assert.deepEqual(recommendations, []);
});

test('next vaccine schedule uses last administered dose and one-year horizon', () => {
  const recommendations = calculateNextVaccinationSchedule({
    species: 'cat',
    petAgeMonths: 12,
    today: new Date('2026-06-12T00:00:00'),
    administeredDoses: [
      {
        vaccineId: 'cat_rabies',
        administeredAt: new Date('2026-06-12T00:00:00'),
      },
    ],
  });

  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0]?.vaccineId, 'cat_rabies');
  assert.equal(recommendations[0]?.dueDate, '2027-06-12');
  assert.equal(recommendations[0]?.horizonMonths, 12);
});

test('young pet core vaccine schedule creates remaining primary doses', () => {
  const recommendations = calculateNextVaccinationSchedule({
    species: 'dog',
    petAgeMonths: 3,
    today: new Date('2026-06-12T00:00:00'),
    administeredDoses: [
      {
        vaccineId: 'dog_5in1_dhppl',
        administeredAt: new Date('2026-06-12T00:00:00'),
      },
    ],
  });

  assert.equal(recommendations.length, 2);
  assert.equal(recommendations[0]?.dueDate, '2026-07-10');
  assert.equal(recommendations[0]?.doseNumber, 2);
  assert.equal(recommendations[1]?.dueDate, '2026-08-07');
  assert.equal(recommendations[1]?.doseNumber, 3);
});

test('young pet core vaccine schedule counts existing history before new dose', () => {
  const recommendations = calculateNextVaccinationSchedule({
    species: 'dog',
    petAgeMonths: 4,
    today: new Date('2026-06-12T00:00:00'),
    administeredDoses: [
      {
        vaccineId: 'dog_5in1_dhppl',
        administeredAt: new Date('2026-05-01T00:00:00'),
      },
      {
        vaccineId: 'dog_5in1_dhppl',
        administeredAt: new Date('2026-06-12T00:00:00'),
      },
    ],
  });

  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0]?.doseNumber, 3);
  assert.equal(recommendations[0]?.dueDate, '2026-07-10');
});
