import assert from 'node:assert/strict';
import {
  calculateCoreCareSchedule,
  calculateCoreCareScheduleFromHistory,
  calculateNextVaccinationSchedule,
  normalizeManualVaccineId,
  type AdministeredDewormingDoseInput,
  type AdministeredVaccineDoseInput,
  type CoreCareNextVaccineRecommendation,
  type CoreCareScheduleRecommendation,
} from '../src/utils/coreCareSchedule.ts';

export type ScheduleCaseFn =
  | 'calculateCoreCareSchedule'
  | 'calculateCoreCareScheduleFromHistory'
  | 'calculateNextVaccinationSchedule'
  | 'normalizeManualVaccineId';

export type ScheduleCaseInput = {
  species: string;
  birth?: string;
  today: string;
  vaccine?: string | null;
  vaccines?: AdministeredVaccineDoseInput[];
  dewormings?: AdministeredDewormingDoseInput[];
  petAgeMonths?: number | null;
  horizonMonths?: number;
  normalizeText?: string;
  normalizeSpecies?: string;
};

export type ScheduleCaseExpectation = {
  count?: number;
  minCount?: number;
  maxCount?: number;
  dueDates?: string[];
  has?: Array<{ family?: string; vaccineId?: string; dose?: number; due?: string; catchUp?: boolean }>;
  lacks?: Array<{ family?: string; vaccineId?: string; dose?: number }>;
  sorted?: boolean;
  normalizeId?: string | null;
};

export type ScheduleTestCaseDef = {
  id: string;
  title: string;
  group: string;
  fn: ScheduleCaseFn;
  desc: string;
  birth: string;
  today: string;
  vaccine: string;
  history: string;
  path: string;
  checks: string[];
  review?: boolean;
  input: ScheduleCaseInput;
  expect: ScheduleCaseExpectation;
};

export function scheduleDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

export function scheduleItem(
  recommendations: Array<CoreCareScheduleRecommendation | CoreCareNextVaccineRecommendation>,
  familyOrVaccineId: string,
  doseNumber: number,
) {
  return recommendations.find(
    (item) => (item.family ?? item.vaccineId) === familyOrVaccineId && item.doseNumber === doseNumber,
  );
}

export function runScheduleTestCase(testCase: ScheduleTestCaseDef) {
  const input = testCase.input;
  const today = scheduleDate(input.today);

  if (testCase.fn === 'normalizeManualVaccineId') {
    return normalizeManualVaccineId(input.normalizeText ?? '', input.normalizeSpecies ?? input.species);
  }

  if (testCase.fn === 'calculateCoreCareSchedule') {
    return calculateCoreCareSchedule({
      species: input.species,
      birthDate: scheduleDate(input.birth ?? input.today),
      today,
      selectedVaccineId: input.vaccine ?? null,
    });
  }

  if (testCase.fn === 'calculateCoreCareScheduleFromHistory') {
    return calculateCoreCareScheduleFromHistory({
      species: input.species,
      birthDate: scheduleDate(input.birth ?? input.today),
      today,
      selectedVaccineId: input.vaccine ?? null,
      administeredVaccines: input.vaccines ?? [],
      administeredDewormings: input.dewormings ?? [],
    });
  }

  return calculateNextVaccinationSchedule({
    species: input.species,
    today,
    petAgeMonths: input.petAgeMonths ?? null,
    administeredDoses: input.vaccines ?? [],
    horizonMonths: input.horizonMonths,
  });
}

export function verifyScheduleTestCase(testCase: ScheduleTestCaseDef) {
  const result = runScheduleTestCase(testCase);
  const expect = testCase.expect;

  if (testCase.fn === 'normalizeManualVaccineId') {
    assert.equal(result, expect.normalizeId ?? null);
    return;
  }

  const recommendations = result as Array<CoreCareScheduleRecommendation | CoreCareNextVaccineRecommendation>;

  if (typeof expect.count === 'number') assert.equal(recommendations.length, expect.count);
  if (typeof expect.minCount === 'number') assert.ok(recommendations.length >= expect.minCount);
  if (typeof expect.maxCount === 'number') assert.ok(recommendations.length <= expect.maxCount);

  if (expect.dueDates) {
    assert.deepEqual(
      recommendations.map((item) => item.dueDate),
      expect.dueDates,
    );
  }

  for (const item of expect.has ?? []) {
    const familyOrVaccineId = item.family ?? item.vaccineId;
    assert.ok(familyOrVaccineId, 'has expectation requires family or vaccineId');
    const match = scheduleItem(recommendations, familyOrVaccineId, item.dose ?? 1);
    assert.ok(match, `expected ${familyOrVaccineId} dose ${item.dose ?? 1}`);
    if (item.due) assert.equal(match.dueDate, item.due);
    if (typeof item.catchUp === 'boolean') assert.equal(match.isCatchUp, item.catchUp);
  }

  for (const item of expect.lacks ?? []) {
    const familyOrVaccineId = item.family ?? item.vaccineId;
    assert.ok(familyOrVaccineId, 'lacks expectation requires family or vaccineId');
    assert.equal(scheduleItem(recommendations, familyOrVaccineId, item.dose ?? 1), undefined);
  }

  if (expect.sorted) {
    const dueDates = recommendations.map((item) => item.dueDate);
    const sorted = [...dueDates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    assert.deepEqual(dueDates, sorted);
  }
}

export function vaccineDose(vaccineId: string, administeredAt: string): AdministeredVaccineDoseInput {
  return { vaccineId, administeredAt: scheduleDate(administeredAt) };
}

export function dewormDose(administeredAt: string): AdministeredDewormingDoseInput {
  return { administeredAt: scheduleDate(administeredAt) };
}
