import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCoreCareSchedule,
  calculateCoreCareScheduleFromHistory,
  calculateNextVaccinationSchedule,
  normalizeManualVaccineId,
} from '../src/utils/coreCareSchedule.ts';
import { EXTENDED_SCHEDULE_TEST_CASES } from './coreCareScheduleCases.extended.ts';
import { verifyScheduleTestCase } from './coreCareScheduleCaseHelpers.ts';

for (const scheduleCase of EXTENDED_SCHEDULE_TEST_CASES) {
  test(`${scheduleCase.id}: ${scheduleCase.title}`, () => {
    verifyScheduleTestCase(scheduleCase);
  });
}

function firstFvrcpDueDate(recommendations: ReturnType<typeof calculateCoreCareSchedule>): string | undefined {  return recommendations.find((item) => item.family === 'catFvrcp' && item.doseNumber === 1)?.dueDate;
}

test('dog puppy schedule starts core vaccine at eight weeks and includes deworming', () => {
  const recommendations = calculateCoreCareSchedule({
    species: 'dog',
    birthDate: new Date('2026-01-01T00:00:00'),
    today: new Date('2026-01-01T00:00:00'),
  });

  const firstDhpp = recommendations.find((item) => item.family === 'dogDhpp' && item.doseNumber === 1);
  const firstDeworming = recommendations.find((item) => item.family === 'dogDeworming' && item.doseNumber === 1);
  const rabies = recommendations.find((item) => item.family === 'dogRabies');

  assert.equal(firstDeworming?.dueDate, '2026-01-15');
  assert.equal(firstDhpp?.dueDate, '2026-02-26');
  assert.equal(rabies?.dueDate, '2026-03-26');
});

test('cat kitten schedule chains deworming, FVRCP, rabies, and maintenance deworming', () => {
  const recommendations = calculateCoreCareSchedule({
    species: 'cat',
    birthDate: new Date('2026-01-01T00:00:00'),
    today: new Date('2026-01-01T00:00:00'),
  });

  const firstDeworming = recommendations.find((item) => item.family === 'catDeworming' && item.doseNumber === 1);
  const thirdDeworming = recommendations.find((item) => item.family === 'catDeworming' && item.doseNumber === 3);
  const firstFvrcp = recommendations.find((item) => item.family === 'catFvrcp' && item.doseNumber === 1);
  const fourthDeworming = recommendations.find((item) => item.family === 'catDeworming' && item.doseNumber === 4);
  const firstFelv = recommendations.find((item) => item.family === 'catFelv' && item.doseNumber === 1);
  const rabies = recommendations.find((item) => item.family === 'catRabies');

  assert.equal(firstDeworming?.dueDate, '2026-01-22');
  assert.equal(thirdDeworming?.dueDate, '2026-02-19');
  assert.equal(firstFvrcp?.dueDate, '2026-02-26');
  assert.equal(fourthDeworming?.dueDate, '2026-03-05');
  assert.equal(firstFelv?.dueDate, '2026-02-26');
  assert.ok(rabies);
  assert.notEqual(rabies?.dueDate, firstFvrcp?.dueDate);
});

test('cat kitten deworming catch-up starts today when first milestone passed', () => {
  const recommendations = calculateCoreCareSchedule({
    species: 'cat',
    birthDate: new Date('2026-06-02T00:00:00'),
    today: new Date('2026-06-28T00:00:00'),
    selectedVaccineId: 'cat_3in1_fvrcp',
  });

  const firstDeworming = recommendations.find((item) => item.family === 'catDeworming' && item.doseNumber === 1);
  const thirdDeworming = recommendations.find((item) => item.family === 'catDeworming' && item.doseNumber === 3);
  const firstFvrcp = recommendations.find((item) => item.family === 'catFvrcp' && item.doseNumber === 1);

  assert.equal(firstDeworming?.dueDate, '2026-06-28');
  assert.equal(firstDeworming?.isCatchUp, true);
  assert.equal(thirdDeworming?.dueDate, '2026-07-26');
  assert.equal(firstFvrcp?.dueDate, '2026-08-02');
});

test('selected cat FVRCP schedule keeps rabies and deworming but excludes FeLV', () => {
  const recommendations = calculateCoreCareSchedule({
    species: 'cat',
    birthDate: new Date('2026-01-01T00:00:00'),
    today: new Date('2026-01-01T00:00:00'),
    selectedVaccineId: 'cat_3in1_fvrcp',
  });

  assert.ok(recommendations.some((item) => item.family === 'catFvrcp'));
  assert.ok(recommendations.some((item) => item.family === 'catRabies'));
  assert.ok(recommendations.some((item) => item.family === 'catDeworming'));
  assert.equal(recommendations.find((item) => item.family === 'catDeworming' && item.doseNumber === 3)?.dueDate, '2026-02-19');
  assert.equal(recommendations.some((item) => item.family === 'catDeworming' && item.dueDate === firstFvrcpDueDate(recommendations)), false);
  assert.equal(recommendations.some((item) => item.family === 'catFelv'), false);
});

test('selected adult cat vaccine schedule creates deworming due today', () => {
  const recommendations = calculateCoreCareSchedule({
    species: 'cat',
    birthDate: new Date('2025-01-01T00:00:00'),
    today: new Date('2026-01-01T00:00:00'),
    selectedVaccineId: 'cat_3in1_fvrcp',
  });

  const deworming = recommendations.find((item) => item.family === 'catDeworming' && item.dueDate === '2026-01-01');
  assert.equal(deworming?.dueDate, '2026-01-01');
});

test('late kitten catch-up schedule staggers deworming, FVRCP, and rabies', () => {
  const recommendations = calculateCoreCareSchedule({
    species: 'cat',
    birthDate: new Date('2026-01-14T00:00:00'),
    today: new Date('2026-06-14T00:00:00'),
    selectedVaccineId: 'cat_3in1_fvrcp',
  });

  const firstDeworming = recommendations.find((item) => item.family === 'catDeworming' && item.doseNumber === 1);
  const fvrcpDoseOne = recommendations.find((item) => item.family === 'catFvrcp' && item.doseNumber === 1);
  const fvrcpDoseTwo = recommendations.find((item) => item.family === 'catFvrcp' && item.doseNumber === 2);
  const rabies = recommendations.find((item) => item.family === 'catRabies');
  const fourthDeworming = recommendations.find((item) => item.family === 'catDeworming' && item.doseNumber === 4);

  assert.equal(firstDeworming?.dueDate, '2026-06-14');
  assert.equal(firstDeworming?.isCatchUp, true);
  assert.equal(fvrcpDoseOne?.dueDate, '2026-07-19');
  assert.equal(fourthDeworming?.dueDate, '2026-07-26');
  assert.equal(fvrcpDoseTwo?.dueDate, '2026-08-16');
  assert.equal(rabies?.dueDate, '2026-08-23');
});

test('cat schedule from history continues after first deworming on 24/06', () => {
  const recommendations = calculateCoreCareScheduleFromHistory({
    species: 'cat',
    birthDate: new Date('2026-06-02T00:00:00'),
    today: new Date('2026-06-28T00:00:00'),
    selectedVaccineId: 'cat_3in1_fvrcp',
    administeredVaccines: [],
    administeredDewormings: [{ administeredAt: new Date('2026-06-24T00:00:00') }],
  });

  const secondDeworming = recommendations.find((item) => item.family === 'catDeworming' && item.doseNumber === 2);
  const thirdDeworming = recommendations.find((item) => item.family === 'catDeworming' && item.doseNumber === 3);
  const firstFvrcp = recommendations.find((item) => item.family === 'catFvrcp' && item.doseNumber === 1);

  assert.equal(secondDeworming?.dueDate, '2026-07-08');
  assert.equal(thirdDeworming?.dueDate, '2026-07-22');
  assert.equal(firstFvrcp?.dueDate, '2026-07-29');
});

test('late adult cat vaccinated today defers deworming one week after skipped pre-vaccine dose', () => {
  const birthDate = new Date('2025-01-01T00:00:00');
  const today = new Date('2026-07-11T00:00:00');
  const vaccineDate = new Date('2026-07-11T00:00:00');

  const recommendations = calculateCoreCareScheduleFromHistory({
    species: 'cat',
    birthDate,
    today,
    selectedVaccineId: 'cat_3in1_fvrcp',
    administeredVaccines: [{ vaccineId: 'cat_3in1_fvrcp', administeredAt: vaccineDate }],
    administeredDewormings: [],
  });

  const dewormingDueToday = recommendations.find(
    (item) => item.family === 'catDeworming' && item.dueDate === '2026-07-11',
  );
  const fvrcpDoseOne = recommendations.find((item) => item.family === 'catFvrcp' && item.doseNumber === 1);
  const firstDeworming = recommendations.find((item) => item.family === 'catDeworming' && item.doseNumber === 1);
  const fvrcpDoseTwo = recommendations.find((item) => item.family === 'catFvrcp' && item.doseNumber === 2);

  assert.equal(fvrcpDoseOne, undefined, 'should not schedule FVRCP dose 1 after it was already administered');
  assert.equal(dewormingDueToday, undefined, 'should not schedule deworming on the same day as catch-up vaccine');
  assert.equal(firstDeworming?.dueDate, '2026-07-18', 'deworming should be one week after the recent vaccine');
  assert.equal(fvrcpDoseTwo?.dueDate, '2026-08-08', 'next FVRCP dose stays four weeks after the first dose');
});

test('late adult cat vaccinated yesterday skips completed FVRCP dose in preview', () => {
  const recommendations = calculateCoreCareScheduleFromHistory({
    species: 'cat',
    birthDate: new Date('2025-01-01T00:00:00'),
    today: new Date('2026-07-11T00:00:00'),
    selectedVaccineId: 'cat_3in1_fvrcp',
    administeredVaccines: [{ vaccineId: 'cat_3in1_fvrcp', administeredAt: new Date('2026-07-10T00:00:00') }],
    administeredDewormings: [],
  });

  const fvrcpDoseOne = recommendations.find((item) => item.family === 'catFvrcp' && item.doseNumber === 1);
  const fvrcpDoseTwo = recommendations.find((item) => item.family === 'catFvrcp' && item.doseNumber === 2);
  const firstDeworming = recommendations.find((item) => item.family === 'catDeworming' && item.doseNumber === 1);
  const rabiesDoseOne = recommendations.find((item) => item.family === 'catRabies' && item.doseNumber === 1);

  assert.equal(fvrcpDoseOne, undefined);
  assert.equal(fvrcpDoseTwo?.dueDate, '2026-08-07');
  assert.equal(firstDeworming?.dueDate, '2026-07-17');
  assert.equal(rabiesDoseOne?.dueDate, '2026-07-11');
  assert.deepEqual(
    recommendations.map((item) => item.dueDate),
    ['2026-07-11', '2026-07-17', '2026-08-07'],
  );
});

test('duplicate administered FVRCP doses still schedule the next dose once', () => {
  const duplicateDose = { vaccineId: 'cat_3in1_fvrcp', administeredAt: new Date('2026-07-11T00:00:00') };
  const recommendations = calculateCoreCareScheduleFromHistory({
    species: 'cat',
    birthDate: new Date('2025-01-01T00:00:00'),
    today: new Date('2026-07-11T00:00:00'),
    selectedVaccineId: 'cat_3in1_fvrcp',
    administeredVaccines: [duplicateDose, duplicateDose],
    administeredDewormings: [],
  });

  assert.equal(recommendations.length, 3);
  assert.equal(
    recommendations.find((item) => item.family === 'catFvrcp' && item.doseNumber === 2)?.dueDate,
    '2026-08-08',
  );
});

test('kitten deworming defers one week after same-day first vaccine', () => {
  const recommendations = calculateCoreCareScheduleFromHistory({
    species: 'cat',
    birthDate: new Date('2026-01-14T00:00:00'),
    today: new Date('2026-06-14T00:00:00'),
    selectedVaccineId: 'cat_3in1_fvrcp',
    administeredVaccines: [{ vaccineId: 'cat_3in1_fvrcp', administeredAt: new Date('2026-06-14T00:00:00') }],
    administeredDewormings: [],
  });

  const nextDeworming = recommendations
    .filter((item) => item.family === 'catDeworming')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  assert.equal(nextDeworming?.dueDate, '2026-06-21');
});

test('kitten deworm doses stay chronological after same-day vaccine and deworm history', () => {
  const recommendations = calculateCoreCareScheduleFromHistory({
    species: 'cat',
    birthDate: new Date('2026-04-01T00:00:00'),
    today: new Date('2026-07-11T00:00:00'),
    selectedVaccineId: 'cat_3in1_fvrcp',
    administeredVaccines: [{ vaccineId: 'cat_3in1_fvrcp', administeredAt: new Date('2026-07-10T00:00:00') }],
    administeredDewormings: [{ administeredAt: new Date('2026-07-10T00:00:00') }],
  });

  const dewormingDates = recommendations
    .filter((item) => item.family === 'catDeworming')
    .map((item) => item.dueDate);
  assert.deepEqual(dewormingDates, ['2026-07-24', '2026-08-07', '2026-08-21', '2026-09-04']);
});

test('adult dog vaccinated today skips completed core dose and defers deworming', () => {
  const recommendations = calculateCoreCareScheduleFromHistory({
    species: 'dog',
    birthDate: new Date('2025-01-01T00:00:00'),
    today: new Date('2026-07-11T00:00:00'),
    selectedVaccineId: 'dog_5in1_dhppl',
    administeredVaccines: [{ vaccineId: 'dog_5in1_dhppl', administeredAt: new Date('2026-07-11T00:00:00') }],
    administeredDewormings: [],
  });

  const dhppDoseOne = recommendations.find((item) => item.family === 'dogDhpp' && item.doseNumber === 1);
  const dhppDoseTwo = recommendations.find((item) => item.family === 'dogDhpp' && item.doseNumber === 2);
  const firstDeworming = recommendations.find((item) => item.family === 'dogDeworming' && item.doseNumber === 1);

  assert.equal(dhppDoseOne, undefined);
  assert.equal(dhppDoseTwo?.dueDate, '2026-08-08');
  assert.equal(firstDeworming?.dueDate, '2026-07-18');
});

test('puppy dog history skips completed DHPP dose and schedules the next one', () => {
  const recommendations = calculateCoreCareScheduleFromHistory({
    species: 'dog',
    birthDate: new Date('2026-01-01T00:00:00'),
    today: new Date('2026-03-01T00:00:00'),
    selectedVaccineId: 'dog_5in1_dhppl',
    administeredVaccines: [{ vaccineId: 'dog_5in1_dhppl', administeredAt: new Date('2026-02-15T00:00:00') }],
    administeredDewormings: [],
  });

  const dhppDoseOne = recommendations.find((item) => item.family === 'dogDhpp' && item.doseNumber === 1);
  const dhppDoseTwo = recommendations.find((item) => item.family === 'dogDhpp' && item.doseNumber === 2);

  assert.equal(dhppDoseOne, undefined);
  assert.equal(dhppDoseTwo?.dueDate, '2026-03-15');
});

test('manual vaccine text is normalized into stable vaccine ids', () => {
  assert.equal(normalizeManualVaccineId('Đã tiêm vaccine 4 trong 1 Felocell', 'cat'), 'cat_4in1');
  assert.equal(normalizeManualVaccineId('Vaccine 4-trong-1', 'cat'), 'cat_4in1');
  assert.equal(normalizeManualVaccineId('Mũi dại Rabisin', 'cat'), 'cat_rabies');
  assert.equal(normalizeManualVaccineId('Vaccine 7 trong 1 có lepto', 'dog'), 'dog_7in1');
});

test('young pet primary series warns when the next dose is overdue for more than six weeks', () => {
  const recommendations = calculateNextVaccinationSchedule({
    species: 'cat',
    petAgeMonths: 4,
    today: new Date('2026-06-12T00:00:00'),
    administeredDoses: [
      {
        vaccineId: 'cat_4in1',
        administeredAt: new Date('2026-04-15T00:00:00'),
      },
    ],
  });

  assert.equal(recommendations[0]?.doseNumber, 2);
  assert.equal(recommendations[0]?.isRestartRequired, true);
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
