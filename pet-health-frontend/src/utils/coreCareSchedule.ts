export type CoreCareScheduleSpecies = 'dog' | 'cat';
export type CoreCareScheduleKind = 'vaccine' | 'deworming';

export type CoreCareScheduleFamily =
  | 'dogDhpp'
  | 'dogRabies'
  | 'dogLepto'
  | 'dogDeworming'
  | 'catFvrcp'
  | 'catRabies'
  | 'catFelv'
  | 'catDeworming';

export type CoreCareScheduleRecommendation = {
  id: string;
  kind: CoreCareScheduleKind;
  family: CoreCareScheduleFamily;
  doseNumber: number;
  dueDate: string;
  targetDate: string;
  sourceLabel: string;
  sourceUrl: string;
  isCatchUp: boolean;
};

export type AdministeredVaccineDoseInput = {
  vaccineId: string;
  administeredAt: Date;
};

export type AdministeredDewormingDoseInput = {
  administeredAt: Date;
};

type CatKittenScheduleState = {
  dewormDosesCompleted: number;
  dewormDates: Date[];
  fvrcpDosesCompleted: number;
  fvrcpDates: Date[];
  rabiesDosesCompleted: number;
  rabiesDates: Date[];
};

export type CoreCareNextVaccineRecommendation = {
  id: string;
  vaccineId: string;
  doseNumber: number;
  dueDate: string;
  targetDate: string;
  administeredAt: string;
  sourceLabel: string;
  sourceUrl: string;
  isCatchUp: boolean;
  horizonMonths: number;
  isRestartRequired?: boolean;
};

type CalculateCoreCareScheduleInput = {
  species: string;
  birthDate: Date;
  today?: Date;
  selectedVaccineId?: string | null;
};

type CalculateNextVaccinationScheduleInput = {
  species: string;
  administeredDoses: AdministeredVaccineDoseInput[];
  petAgeMonths?: number | null;
  today?: Date;
  horizonMonths?: number;
};

type CalculateCoreCareScheduleFromHistoryInput = {
  species: string;
  birthDate: Date;
  administeredVaccines: AdministeredVaccineDoseInput[];
  administeredDewormings: AdministeredDewormingDoseInput[];
  selectedVaccineId?: string | null;
  today?: Date;
};

type SeriesInput = {
  family: CoreCareScheduleFamily;
  kind: CoreCareScheduleKind;
  startAgeDays: number;
  finalMinAgeDays: number;
  intervalDays: number;
  today: Date;
  birthDate: Date;
  sourceLabel: string;
  sourceUrl: string;
  maxPrimaryDoseCount?: number;
  boosterAgeDays?: number;
};

type VaccineSeriesSpec = {
  key: string;
  primaryDoseCount: number;
  primaryIntervalDays: number;
  boosterIntervalDays: number;
  sourceLabel: string;
  sourceUrl: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_DAYS = 7;
const MONTH_DAYS = 30;

const WSAVA_2024_URL = 'https://wsava.org/wp-content/uploads/2024/05/2024-Guidelines-for-the-Vaccination-of-Dogs-and-Cats.pdf';
const AAHA_CANINE_2022_URL = 'https://www.aaha.org/resources/2022-aaha-canine-vaccination-guidelines/recommendations-for-core-and-noncore-canine-vaccines/';
const AAFP_FELINE_2020_URL = 'https://journals.sagepub.com/doi/full/10.1177/1098612X20941784';
const TROCCAP_URL = 'https://www.troccap.com/canine-guidelines/general-considerations-canine/';
const ONE_YEAR_DAYS = 365;
const LAPSED_PRIMARY_SERIES_DAYS = 42;
const PRE_VACCINE_DEWORMING_DAYS = 7;

const CORE_CARE_DEBUG_ENABLED =
  (typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production') ||
  /^(1|true|yes)$/i.test(String(process.env.EXPO_PUBLIC_CORE_CARE_DEBUG ?? ''));

function scheduleDebug(fn: string, phase: 'enter' | 'exit' | 'check', payload?: Record<string, unknown>) {
  if (!CORE_CARE_DEBUG_ENABLED) return;
  try {
    console.log(`[CORE_CARE_DEBUG] ${fn}.${phase}`, JSON.stringify(payload ?? {}, null, 2));
  } catch {
    console.log(`[CORE_CARE_DEBUG] ${fn}.${phase}`, payload);
  }
}

function scheduleCheck(fn: string, label: string, ok: boolean, payload?: Record<string, unknown>) {
  if (!CORE_CARE_DEBUG_ENABLED) return ok;
  if (ok) {
    scheduleDebug(fn, 'check', { [label]: 'ok', ...payload });
  } else {
    console.log(`[CORE_CARE_DEBUG] ${fn}.${label}.fail`, JSON.stringify(payload ?? {}, null, 2));
  }
  return ok;
}

function summarizeRecommendations(recommendations: CoreCareScheduleRecommendation[]) {
  return recommendations.map((item) => ({
    kind: item.kind,
    family: item.family,
    doseNumber: item.doseNumber,
    dueDate: item.dueDate,
    isCatchUp: item.isCatchUp,
  }));
}

export function normalizeCoreCareScheduleSpecies(species: string): CoreCareScheduleSpecies | null {
  const normalized = species.trim().toLowerCase();
  if (normalized === 'dog') return 'dog';
  if (normalized === 'cat') return 'cat';
  return null;
}

export function formatCoreCareScheduleDate(date: Date): string {
  const normalized = startOfDay(date);
  const y = normalized.getFullYear();
  const m = String(normalized.getMonth() + 1).padStart(2, '0');
  const d = String(normalized.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dedupeAdministeredVaccineDoses(doses: AdministeredVaccineDoseInput[]): AdministeredVaccineDoseInput[] {
  const seen = new Set<string>();
  return doses.filter((dose) => {
    const key = `${dose.vaccineId}|${formatCoreCareScheduleDate(startOfDay(dose.administeredAt))}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeAdministeredDewormingDoses(doses: AdministeredDewormingDoseInput[]): AdministeredDewormingDoseInput[] {
  const seen = new Set<string>();
  return doses.filter((dose) => {
    const key = formatCoreCareScheduleDate(startOfDay(dose.administeredAt));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeManualVaccineId(text: string, species: string): string | null {
  const normalizedSpecies = normalizeCoreCareScheduleSpecies(species);
  if (!normalizedSpecies) return null;

  const normalized = text.trim().toLowerCase();
  if (!normalized) return null;

  if (normalizedSpecies === 'cat') {
    if (/3\s*[- ]?\s*(in|trong)\s*[- ]?\s*1|3\s*[- ]?\s*1|fvrcp|rcp\b|purevax|giảm bạch cầu|giam bach cau|calici|herpes|cúm mèo|cum meo/.test(normalized)) {
      return 'cat_3in1_fvrcp';
    }
    if (/4\s*[- ]?\s*(in|trong)\s*[- ]?\s*1|4\s*[- ]?\s*1|felocell|rcpch|chlamydia/.test(normalized)) return 'cat_4in1';
    if (/dại|dai|rabies|rabisin|defensor/.test(normalized)) return 'cat_rabies';
    if (/felv|bạch cầu|bach cau|leukemia/.test(normalized)) return 'cat_felv';
    return null;
  }

  if (/5\s*[- ]?\s*(in|trong)\s*[- ]?\s*1|5\s*[- ]?\s*1|dhpp|dapp|dhppl|care|parvo|adenovirus|distemper/.test(normalized)) return 'dog_5in1_dhppl';
  if (/7\s*[- ]?\s*(in|trong)\s*[- ]?\s*1|7\s*[- ]?\s*1|lepto|leptospira/.test(normalized)) return 'dog_7in1';
  if (/dại|dai|rabies|rabisin|defensor/.test(normalized)) return 'dog_rabies';
  if (/bordetella|kennel cough|ho cũi|ho cui/.test(normalized)) return 'dog_bordetella';
  return null;
}

export function calculateCoreCareSchedule({
  species,
  birthDate,
  today = new Date(),
  selectedVaccineId = null,
}: CalculateCoreCareScheduleInput): CoreCareScheduleRecommendation[] {
  scheduleDebug('calculateCoreCareSchedule', 'enter', {
    species,
    birthDate: formatCoreCareScheduleDate(birthDate),
    today: formatCoreCareScheduleDate(today),
    selectedVaccineId,
  });
  const normalizedSpecies = normalizeCoreCareScheduleSpecies(species);
  if (!normalizedSpecies) {
    scheduleCheck('calculateCoreCareSchedule', 'species_supported', false, { species });
    return [];
  }

  const normalizedBirthDate = startOfDay(birthDate);
  const normalizedToday = startOfDay(today);
  if (normalizedBirthDate.getTime() > normalizedToday.getTime()) {
    scheduleCheck('calculateCoreCareSchedule', 'birth_before_today', false, {
      birthDate: formatCoreCareScheduleDate(normalizedBirthDate),
      today: formatCoreCareScheduleDate(normalizedToday),
    });
    return [];
  }

  const recommendations =
    normalizedSpecies === 'dog'
      ? calculateDogSchedule(normalizedBirthDate, normalizedToday, selectedVaccineId)
      : calculateCatSchedule(normalizedBirthDate, normalizedToday, selectedVaccineId);

  const result = finalizeScheduleRecommendations(recommendations);

  scheduleDebug('calculateCoreCareSchedule', 'exit', {
    count: result.length,
    recommendations: summarizeRecommendations(result),
  });
  return result;
}

export function calculateNextVaccinationSchedule({
  species,
  administeredDoses,
  petAgeMonths,
  today = new Date(),
  horizonMonths = 12,
}: CalculateNextVaccinationScheduleInput): CoreCareNextVaccineRecommendation[] {
  const normalizedSpecies = normalizeCoreCareScheduleSpecies(species);
  if (!normalizedSpecies) return [];

  const normalizedToday = startOfDay(today);
  const normalizedDoses = dedupeAdministeredVaccineDoses(administeredDoses);
  const horizonDate = addMonths(normalizedToday, horizonMonths);
  const grouped = new Map<string, Array<AdministeredVaccineDoseInput & { series: VaccineSeriesSpec }>>();

  for (const dose of normalizedDoses) {
    const administeredAt = startOfDay(dose.administeredAt);
    if (administeredAt.getTime() > normalizedToday.getTime()) continue;

    const series = vaccineSeriesForDose(normalizedSpecies, dose.vaccineId, petAgeMonths);
    if (!series) continue;

    const current = grouped.get(series.key) ?? [];
    current.push({ ...dose, administeredAt, series });
    grouped.set(series.key, current);
  }

  return [...grouped.values()]
    .flatMap((doses) => {
      const sortedDoses = [...doses].sort((a, b) => a.administeredAt.getTime() - b.administeredAt.getTime());
      const latestDose = sortedDoses[sortedDoses.length - 1];
      if (!latestDose) return [];

      const series = latestDose.series;
      const recommendations: CoreCareNextVaccineRecommendation[] = [];
      let lastDate = latestDose.administeredAt;

      if (sortedDoses.length < series.primaryDoseCount) {
        const isRestartRequired =
          typeof petAgeMonths === 'number' &&
          petAgeMonths < 6 &&
          daysBetween(latestDose.administeredAt, normalizedToday) > LAPSED_PRIMARY_SERIES_DAYS;

        for (let doseNumber = sortedDoses.length + 1; doseNumber <= series.primaryDoseCount; doseNumber += 1) {
          const targetDate = addDays(lastDate, series.primaryIntervalDays);
          const dueDate = maxDate(normalizedToday, targetDate);
          if (dueDate.getTime() > horizonDate.getTime()) break;

          recommendations.push({
            id: `next-vaccine-${series.key}-${doseNumber}-${formatCoreCareScheduleDate(dueDate)}`,
            vaccineId: latestDose.vaccineId,
            doseNumber,
            dueDate: formatCoreCareScheduleDate(dueDate),
            targetDate: formatCoreCareScheduleDate(targetDate),
            administeredAt: formatCoreCareScheduleDate(latestDose.administeredAt),
            sourceLabel: series.sourceLabel,
            sourceUrl: series.sourceUrl,
            isCatchUp: dueDate.getTime() > targetDate.getTime(),
            horizonMonths,
            isRestartRequired,
          });
          lastDate = dueDate;
        }
        return recommendations;
      }

      const doseNumber = sortedDoses.length + 1;
      const targetDate = addDays(latestDose.administeredAt, series.boosterIntervalDays);
      const dueDate = maxDate(normalizedToday, targetDate);
      if (dueDate.getTime() > horizonDate.getTime()) return [];

      return [
        {
          id: `next-vaccine-${series.key}-${doseNumber}-${formatCoreCareScheduleDate(dueDate)}`,
          vaccineId: latestDose.vaccineId,
          doseNumber,
          dueDate: formatCoreCareScheduleDate(dueDate),
          targetDate: formatCoreCareScheduleDate(targetDate),
          administeredAt: formatCoreCareScheduleDate(latestDose.administeredAt),
          sourceLabel: series.sourceLabel,
          sourceUrl: series.sourceUrl,
          isCatchUp: dueDate.getTime() > targetDate.getTime(),
          horizonMonths,
        },
      ];
    })
    .sort((a, b) => {
      const dueDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (dueDiff !== 0) return dueDiff;
      return a.vaccineId.localeCompare(b.vaccineId);
    });
}

export function calculateCoreCareScheduleFromHistory({
  species,
  birthDate,
  administeredVaccines,
  administeredDewormings,
  selectedVaccineId = null,
  today = new Date(),
}: CalculateCoreCareScheduleFromHistoryInput): CoreCareScheduleRecommendation[] {
  const normalizedVaccines = dedupeAdministeredVaccineDoses(administeredVaccines);
  const normalizedDewormings = dedupeAdministeredDewormingDoses(administeredDewormings);
  scheduleDebug('calculateCoreCareScheduleFromHistory', 'enter', {
    species,
    birthDate: formatCoreCareScheduleDate(birthDate),
    today: formatCoreCareScheduleDate(today),
    selectedVaccineId,
    administeredVaccines: normalizedVaccines.length,
    administeredDewormings: normalizedDewormings.length,
  });
  const normalizedSpecies = normalizeCoreCareScheduleSpecies(species);
  if (!normalizedSpecies) {
    scheduleCheck('calculateCoreCareScheduleFromHistory', 'species_supported', false, { species });
    return [];
  }

  const normalizedBirthDate = startOfDay(birthDate);
  const normalizedToday = startOfDay(today);
  if (normalizedBirthDate.getTime() > normalizedToday.getTime()) {
    scheduleCheck('calculateCoreCareScheduleFromHistory', 'birth_before_today', false);
    return [];
  }

  const ageDays = daysBetween(normalizedBirthDate, normalizedToday);
  if (ageDays > weeks(26)) {
    const baseRecommendations =
      normalizedSpecies === 'dog' ? adultDogCatchUp(normalizedToday) : adultCatCatchUp(normalizedToday);
    let result = filterInitialScheduleBySelection(
      normalizedSpecies,
      baseRecommendations,
      selectedVaccineId,
      normalizedToday,
    );
    if (normalizedSpecies === 'cat') {
      result = adjustAdultCatCatchUpForAdministeredVaccines(
        result,
        normalizedVaccines,
        normalizedToday,
      );
      result = adjustCatDewormingForRecentVaccination(
        result,
        normalizedVaccines,
        normalizedDewormings,
        normalizedToday,
      );
    } else {
      result = adjustAdultDogCatchUpForAdministeredVaccines(
        result,
        normalizedVaccines,
        normalizedToday,
      );
      result = adjustDogDewormingForRecentVaccination(
        result,
        normalizedVaccines,
        normalizedDewormings,
        normalizedToday,
      );
    }
    scheduleDebug('calculateCoreCareScheduleFromHistory', 'exit', {
      path: 'adult_catch_up',
      count: result.length,
      recommendations: summarizeRecommendations(result),
    });
    return finalizeScheduleRecommendations(result);
  }

  if (normalizedSpecies === 'cat') {
    const state = catKittenStateFromHistory(
      normalizedDewormings,
      normalizedVaccines.filter((dose) => dose.vaccineId === 'cat_3in1_fvrcp' || dose.vaccineId === 'cat_4in1'),
      normalizedVaccines.filter((dose) => dose.vaccineId === 'cat_rabies'),
      normalizedToday,
    );
    scheduleDebug('calculateCoreCareScheduleFromHistory', 'check', {
      path: 'cat_kitten_history',
      state: {
        dewormDosesCompleted: state.dewormDosesCompleted,
        fvrcpDosesCompleted: state.fvrcpDosesCompleted,
        rabiesDosesCompleted: state.rabiesDosesCompleted,
      },
    });
    const recommendations = buildCatKittenIntegratedSchedule(normalizedBirthDate, normalizedToday, state);
    const result = filterInitialScheduleBySelection('cat', recommendations, selectedVaccineId, normalizedToday);
    scheduleDebug('calculateCoreCareScheduleFromHistory', 'exit', {
      path: 'cat_kitten_history',
      count: result.length,
      recommendations: summarizeRecommendations(result),
    });
    return finalizeScheduleRecommendations(result);
  }

  const result = applyDogScheduleHistoryAdjustments(
    calculateDogSchedule(normalizedBirthDate, normalizedToday, selectedVaccineId),
    normalizedVaccines,
    normalizedDewormings,
    normalizedToday,
  );
  scheduleDebug('calculateCoreCareScheduleFromHistory', 'exit', {
    path: 'dog_history_fallback',
    count: result.length,
    recommendations: summarizeRecommendations(result),
  });
  return finalizeScheduleRecommendations(result);
}

function sortScheduleRecommendations(
  recommendations: CoreCareScheduleRecommendation[],
): CoreCareScheduleRecommendation[] {
  return [...recommendations].sort((a, b) => {
    const dueDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (dueDiff !== 0) return dueDiff;
    return a.id.localeCompare(b.id);
  });
}

function finalizeScheduleRecommendations(
  recommendations: CoreCareScheduleRecommendation[],
): CoreCareScheduleRecommendation[] {
  return sortScheduleRecommendations(recommendations).map((recommendation) => ({
    ...recommendation,
    id: `${recommendation.family}-${recommendation.doseNumber}-${recommendation.dueDate}`,
  }));
}

function applyDogScheduleHistoryAdjustments(
  recommendations: CoreCareScheduleRecommendation[],
  administeredVaccines: AdministeredVaccineDoseInput[],
  administeredDewormings: AdministeredDewormingDoseInput[],
  today: Date,
): CoreCareScheduleRecommendation[] {
  let adjusted = adjustDogScheduleForAdministeredVaccines(recommendations, administeredVaccines, today);
  adjusted = adjustDogDewormingForRecentVaccination(adjusted, administeredVaccines, administeredDewormings, today);
  return adjusted;
}

function calculateDogSchedule(birthDate: Date, today: Date, selectedVaccineId: string | null): CoreCareScheduleRecommendation[] {
  const ageDays = daysBetween(birthDate, today);
  if (ageDays > weeks(26)) return filterInitialScheduleBySelection('dog', adultDogCatchUp(today), selectedVaccineId, today);

  const recommendations = [
    ...buildPrimarySeries({
      family: 'dogDhpp',
      kind: 'vaccine',
      startAgeDays: weeks(8),
      finalMinAgeDays: weeks(16),
      intervalDays: weeks(4),
      maxPrimaryDoseCount: 3,
      birthDate,
      today,
      sourceLabel: 'WSAVA 2024 / AAHA 2022',
      sourceUrl: WSAVA_2024_URL,
    }),
    ...buildTwoDoseSeries({
      family: 'dogLepto',
      kind: 'vaccine',
      firstDueDate: maxDate(today, addDays(birthDate, weeks(12))),
      intervalDays: weeks(4),
      sourceLabel: 'AAHA 2022 / WSAVA 2024',
      sourceUrl: AAHA_CANINE_2022_URL,
    }),
    buildSingleRecommendation({
      family: 'dogRabies',
      kind: 'vaccine',
      doseNumber: 1,
      today,
      targetDate: addDays(birthDate, weeks(12)),
      sourceLabel: 'WSAVA Asia / Vietnam rabies requirement',
      sourceUrl: WSAVA_2024_URL,
    }),
    ...buildDewormingSeries({
      family: 'dogDeworming',
      birthDate,
      today,
      earlyWeeks: [2, 4, 6, 8],
    }),
  ];
  return filterInitialScheduleBySelection('dog', recommendations, selectedVaccineId, today);
}

function calculateCatSchedule(birthDate: Date, today: Date, selectedVaccineId: string | null): CoreCareScheduleRecommendation[] {
  const ageDays = daysBetween(birthDate, today);
  if (ageDays > weeks(26)) return filterInitialScheduleBySelection('cat', adultCatCatchUp(today), selectedVaccineId, today);

  const recommendations = [
    ...buildCatKittenIntegratedSchedule(birthDate, today),
    ...buildTwoDoseSeries({
      family: 'catFelv',
      kind: 'vaccine',
      firstDueDate: maxDate(today, addDays(birthDate, weeks(8))),
      intervalDays: weeks(4),
      sourceLabel: 'AAHA-AAFP 2020',
      sourceUrl: AAFP_FELINE_2020_URL,
    }),
  ];
  return filterInitialScheduleBySelection('cat', recommendations, selectedVaccineId, today);
}

function adultDogCatchUp(today: Date): CoreCareScheduleRecommendation[] {
  return [
    ...buildTwoDoseSeries({
      family: 'dogDhpp',
      kind: 'vaccine',
      firstDueDate: today,
      intervalDays: weeks(4),
      sourceLabel: 'AAHA 2022 catch-up',
      sourceUrl: AAHA_CANINE_2022_URL,
    }),
    ...buildTwoDoseSeries({
      family: 'dogLepto',
      kind: 'vaccine',
      firstDueDate: today,
      intervalDays: weeks(4),
      sourceLabel: 'AAHA 2022 catch-up',
      sourceUrl: AAHA_CANINE_2022_URL,
    }),
    buildSingleRecommendation({
      family: 'dogRabies',
      kind: 'vaccine',
      doseNumber: 1,
      today,
      targetDate: today,
      sourceLabel: 'Vietnam rabies requirement',
      sourceUrl: WSAVA_2024_URL,
    }),
    buildSingleRecommendation({
      family: 'dogDeworming',
      kind: 'deworming',
      doseNumber: 1,
      today,
      targetDate: today,
      sourceLabel: 'TroCCAP tropical parasite guidance',
      sourceUrl: TROCCAP_URL,
    }),
  ];
}

function adultCatCatchUp(today: Date): CoreCareScheduleRecommendation[] {
  return [
    ...buildTwoDoseSeries({
      family: 'catFvrcp',
      kind: 'vaccine',
      firstDueDate: today,
      intervalDays: weeks(4),
      sourceLabel: 'AAHA-AAFP 2020 catch-up',
      sourceUrl: AAFP_FELINE_2020_URL,
    }),
    ...buildTwoDoseSeries({
      family: 'catFelv',
      kind: 'vaccine',
      firstDueDate: today,
      intervalDays: weeks(4),
      sourceLabel: 'AAHA-AAFP 2020 risk-based catch-up',
      sourceUrl: AAFP_FELINE_2020_URL,
    }),
    buildSingleRecommendation({
      family: 'catRabies',
      kind: 'vaccine',
      doseNumber: 1,
      today,
      targetDate: today,
      sourceLabel: 'Vietnam rabies requirement',
      sourceUrl: WSAVA_2024_URL,
    }),
    buildSingleRecommendation({
      family: 'catDeworming',
      kind: 'deworming',
      doseNumber: 1,
      today,
      targetDate: today,
      sourceLabel: 'TroCCAP tropical parasite guidance',
      sourceUrl: TROCCAP_URL,
    }),
  ];
}

function filterInitialScheduleBySelection(
  species: CoreCareScheduleSpecies,
  recommendations: CoreCareScheduleRecommendation[],
  selectedVaccineId: string | null,
  today: Date,
): CoreCareScheduleRecommendation[] {
  if (!selectedVaccineId) return recommendations;

  const selectedFamilies = selectedInitialVaccineFamilies(species, selectedVaccineId);
  const filtered = recommendations.filter((recommendation) => {
    if (recommendation.kind === 'deworming') return true;
    if (species === 'dog' && recommendation.family === 'dogRabies') return true;
    if (species === 'cat' && recommendation.family === 'catRabies') return true;
    return selectedFamilies.has(recommendation.family);
  });

  if (species === 'cat') return filtered;
  return spaceInitialSchedule(species, filtered, selectedFamilies, today);
}

function catKittenStateFromHistory(
  administeredDewormings: AdministeredDewormingDoseInput[],
  fvrcpDoses: AdministeredVaccineDoseInput[],
  rabiesDoses: AdministeredVaccineDoseInput[],
  today: Date,
): CatKittenScheduleState {
  const dewormDates = administeredDewormings
    .map((dose) => startOfDay(dose.administeredAt))
    .filter((date) => date.getTime() <= today.getTime())
    .sort((a, b) => a.getTime() - b.getTime());
  const fvrcpDates = fvrcpDoses
    .map((dose) => startOfDay(dose.administeredAt))
    .filter((date) => date.getTime() <= today.getTime())
    .sort((a, b) => a.getTime() - b.getTime());
  const rabiesDates = rabiesDoses
    .map((dose) => startOfDay(dose.administeredAt))
    .filter((date) => date.getTime() <= today.getTime())
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    dewormDosesCompleted: dewormDates.length,
    dewormDates,
    fvrcpDosesCompleted: fvrcpDates.length,
    fvrcpDates,
    rabiesDosesCompleted: rabiesDates.length,
    rabiesDates,
  };
}

function buildCatKittenIntegratedSchedule(
  birthDate: Date,
  today: Date,
  state: CatKittenScheduleState = {
    dewormDosesCompleted: 0,
    dewormDates: [],
    fvrcpDosesCompleted: 0,
    fvrcpDates: [],
    rabiesDosesCompleted: 0,
    rabiesDates: [],
  },
): CoreCareScheduleRecommendation[] {
  const dewormSourceLabel = 'TroCCAP / CAPC parasite guidance';
  const dewormSourceUrl = TROCCAP_URL;
  const vaccineSourceLabel = 'WSAVA 2024 / AAHA-AAFP 2020';
  const vaccineSourceUrl = AAFP_FELINE_2020_URL;
  const rabiesSourceLabel = 'WSAVA 2024 / Vietnam rabies requirement';
  const rabiesSourceUrl = WSAVA_2024_URL;

  const recommendations: CoreCareScheduleRecommendation[] = [];
  const allVaccineDates = [...state.fvrcpDates, ...state.rabiesDates];
  const recentVaccineForDewormDeferral = findRecentVaccineForDewormDeferral(today, allVaccineDates, state.dewormDates);
  const skipPreVaccineEarlyDewormSeries =
    state.dewormDosesCompleted === 0 && recentVaccineForDewormDeferral !== null && state.fvrcpDosesCompleted > 0;

  let lastEarlyDewormDue: Date | null =
    state.dewormDosesCompleted > 0 ? state.dewormDates[state.dewormDosesCompleted - 1] ?? null : null;

  if (!skipPreVaccineEarlyDewormSeries) {
    for (let doseNumber = state.dewormDosesCompleted + 1; doseNumber <= 3; doseNumber += 1) {
      const targetDate =
        doseNumber === 1
          ? addDays(birthDate, weeks(3))
          : addDays(birthDate, weeks(3 + (doseNumber - 1) * 2));
      let dueDate =
        doseNumber === 1 && state.dewormDosesCompleted === 0
          ? maxDate(today, targetDate)
          : maxDate(today, addDays(lastEarlyDewormDue!, weeks(2)));
      if (doseNumber === state.dewormDosesCompleted + 1 && recentVaccineForDewormDeferral) {
        dueDate = deferredDewormDueAfterRecentVaccine(today, dueDate, recentVaccineForDewormDeferral);
      }
      recommendations.push(
        buildScheduledRecommendation({
          family: 'catDeworming',
          kind: 'deworming',
          doseNumber,
          today,
          targetDate,
          dueDate,
          sourceLabel: dewormSourceLabel,
          sourceUrl: dewormSourceUrl,
        }),
      );
      lastEarlyDewormDue = dueDate;
    }
  }

  const thirdEarlyDewormDue =
    state.dewormDosesCompleted >= 3
      ? state.dewormDates[2]!
      : skipPreVaccineEarlyDewormSeries
        ? deferredDewormDueAfterRecentVaccine(today, today, recentVaccineForDewormDeferral!)
        : recommendations.find((item) => item.family === 'catDeworming' && item.doseNumber === 3)?.dueDate
          ? new Date(`${recommendations.find((item) => item.family === 'catDeworming' && item.doseNumber === 3)!.dueDate}T00:00:00`)
          : lastEarlyDewormDue!;

  let lastFvrcpDue: Date | null = state.fvrcpDosesCompleted > 0 ? state.fvrcpDates[state.fvrcpDosesCompleted - 1] ?? null : null;

  for (let doseNumber = state.fvrcpDosesCompleted + 1; doseNumber <= 3; doseNumber += 1) {
    const targetDate =
      doseNumber === 1
        ? addDays(thirdEarlyDewormDue, PRE_VACCINE_DEWORMING_DAYS)
        : addDays(birthDate, weeks(8 + (doseNumber - 1) * 4));
    const dueDate =
      doseNumber === 1
        ? maxDate(today, targetDate)
        : maxDate(today, addDays(lastFvrcpDue!, weeks(4)));
    recommendations.push(
      buildScheduledRecommendation({
        family: 'catFvrcp',
        kind: 'vaccine',
        doseNumber,
        today,
        targetDate,
        dueDate,
        sourceLabel: vaccineSourceLabel,
        sourceUrl: vaccineSourceUrl,
      }),
    );
    lastFvrcpDue = dueDate;
  }

  const firstFvrcpDue =
    state.fvrcpDosesCompleted > 0
      ? state.fvrcpDates[0]!
      : new Date(
          `${recommendations.find((item) => item.family === 'catFvrcp' && item.doseNumber === 1)!.dueDate}T00:00:00`,
        );

  const postVaccineDewormsCompleted = Math.max(0, state.dewormDosesCompleted - 3);
  let lastPostVaccineDewormDue = firstFvrcpDue;

  if (postVaccineDewormsCompleted < 1) {
    const targetDate = addDays(firstFvrcpDue, PRE_VACCINE_DEWORMING_DAYS);
    let dueDate = maxDate(today, targetDate);
    const lastPendingEarlyDewormDue = recommendations
      .filter((item) => item.family === 'catDeworming' && item.doseNumber <= 3)
      .map((item) => new Date(`${item.dueDate}T00:00:00`))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    if (lastPendingEarlyDewormDue && state.dewormDosesCompleted < 3) {
      dueDate = maxDate(dueDate, addDays(lastPendingEarlyDewormDue, weeks(2)));
    }
    recommendations.push(
      buildScheduledRecommendation({
        family: 'catDeworming',
        kind: 'deworming',
        doseNumber: 4,
        today,
        targetDate,
        dueDate,
        sourceLabel: dewormSourceLabel,
        sourceUrl: dewormSourceUrl,
      }),
    );
    lastPostVaccineDewormDue = dueDate;
  } else if (postVaccineDewormsCompleted >= 1) {
    lastPostVaccineDewormDue = state.dewormDates[3] ?? state.dewormDates[state.dewormDates.length - 1]!;
  }

  if (postVaccineDewormsCompleted < 2) {
    const targetDate = addDays(addDays(firstFvrcpDue, PRE_VACCINE_DEWORMING_DAYS), weeks(2));
    const dueDate = maxDate(today, addDays(lastPostVaccineDewormDue, weeks(2)));
    recommendations.push(
      buildScheduledRecommendation({
        family: 'catDeworming',
        kind: 'deworming',
        doseNumber: 5,
        today,
        targetDate,
        dueDate,
        sourceLabel: dewormSourceLabel,
        sourceUrl: dewormSourceUrl,
      }),
    );
    lastPostVaccineDewormDue = dueDate;
  } else if (state.dewormDates[4]) {
    lastPostVaccineDewormDue = state.dewormDates[4];
  }

  const secondFvrcpDue = recommendations.find((item) => item.family === 'catFvrcp' && item.doseNumber === 2)?.dueDate;
  const projectedSecondFvrcpDue = secondFvrcpDue
    ? new Date(`${secondFvrcpDue}T00:00:00`)
    : lastFvrcpDue
      ? addDays(lastFvrcpDue, weeks(4))
      : addDays(firstFvrcpDue, weeks(4));

  if (state.rabiesDosesCompleted < 1) {
    const rabiesTarget = addDays(birthDate, weeks(12));
    let dueDate = maxDate(projectedSecondFvrcpDue, rabiesTarget);
    if (dueDate.getTime() === projectedSecondFvrcpDue.getTime()) {
      dueDate = addDays(projectedSecondFvrcpDue, PRE_VACCINE_DEWORMING_DAYS);
    }
    recommendations.push(
      buildScheduledRecommendation({
        family: 'catRabies',
        kind: 'vaccine',
        doseNumber: 1,
        today,
        targetDate: rabiesTarget,
        dueDate: maxDate(today, dueDate),
        sourceLabel: rabiesSourceLabel,
        sourceUrl: rabiesSourceUrl,
      }),
    );
  }

  const lastEarlySeriesDewormDue =
    state.dewormDosesCompleted >= 5
      ? state.dewormDates[4]!
      : lastPostVaccineDewormDue ?? thirdEarlyDewormDue;
  const maintenanceStartDose = Math.max(6, state.dewormDosesCompleted + 1);

  recommendations.push(
    ...buildCatMaintenanceDeworming(birthDate, today, maintenanceStartDose, lastEarlySeriesDewormDue),
  );

  return recommendations;
}

function buildCatMaintenanceDeworming(
  birthDate: Date,
  today: Date,
  startDoseNumber: number,
  afterDueDate: Date,
): CoreCareScheduleRecommendation[] {
  const threeMonths = addDays(birthDate, MONTH_DAYS * 3);
  const sixMonths = addDays(birthDate, MONTH_DAYS * 6);
  const kittenEnd = addDays(birthDate, weeks(26));
  const recommendations: CoreCareScheduleRecommendation[] = [];
  let doseNumber = startDoseNumber;

  let nextTarget = maxDate(addDays(afterDueDate, MONTH_DAYS), threeMonths);
  while (nextTarget.getTime() <= sixMonths.getTime() && nextTarget.getTime() <= kittenEnd.getTime()) {
    const dueDate = maxDate(today, nextTarget);
    recommendations.push(
      buildScheduledRecommendation({
        family: 'catDeworming',
        kind: 'deworming',
        doseNumber,
        today,
        targetDate: nextTarget,
        dueDate,
        sourceLabel: 'TroCCAP / CAPC parasite guidance',
        sourceUrl: TROCCAP_URL,
      }),
    );
    doseNumber += 1;
    nextTarget = addDays(nextTarget, MONTH_DAYS);
  }

  let quarterlyTarget = addDays(sixMonths, MONTH_DAYS * 3);
  while (quarterlyTarget.getTime() <= kittenEnd.getTime()) {
    const dueDate = maxDate(today, quarterlyTarget);
    recommendations.push(
      buildScheduledRecommendation({
        family: 'catDeworming',
        kind: 'deworming',
        doseNumber,
        today,
        targetDate: quarterlyTarget,
        dueDate,
        sourceLabel: 'TroCCAP / CAPC parasite guidance',
        sourceUrl: TROCCAP_URL,
      }),
    );
    doseNumber += 1;
    quarterlyTarget = addDays(quarterlyTarget, MONTH_DAYS * 3);
  }

  return recommendations;
}

function spaceInitialSchedule(
  species: CoreCareScheduleSpecies,
  recommendations: CoreCareScheduleRecommendation[],
  selectedFamilies: Set<CoreCareScheduleFamily>,
  today: Date,
): CoreCareScheduleRecommendation[] {
  const firstSelectedVaccine = recommendations
    .filter((recommendation) => recommendation.kind === 'vaccine' && selectedFamilies.has(recommendation.family))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  if (!firstSelectedVaccine) return recommendations;

  const firstSelectedDueTime = new Date(`${firstSelectedVaccine.dueDate}T00:00:00`).getTime();
  const firstSelectedTargetTime = new Date(`${firstSelectedVaccine.targetDate}T00:00:00`).getTime();
  const todayTime = today.getTime();

  if (firstSelectedDueTime === todayTime && firstSelectedTargetTime < todayTime) {
    return staggerInitialCatchUpSchedule(species, recommendations, selectedFamilies, firstSelectedVaccine, today);
  }

  const dewormingFamily = routineDewormingFamily(species);
  const firstVaccineDate = new Date(`${firstSelectedVaccine.dueDate}T00:00:00`);
  const preVaccineTargetDate = addDays(firstVaccineDate, -PRE_VACCINE_DEWORMING_DAYS);
  const preVaccineDueDate = maxDate(today, preVaccineTargetDate);
  const preVaccineTime = preVaccineDueDate.getTime();
  const firstVaccineTime = firstVaccineDate.getTime();
  const filteredWithoutConflictingDeworming = recommendations.filter((recommendation) => {
    if (recommendation.family !== dewormingFamily) return true;

    const dueTime = new Date(`${recommendation.dueDate}T00:00:00`).getTime();
    return dueTime < preVaccineTime || dueTime > firstVaccineTime;
  });
  const preVaccineDoseNumber = nextDewormingDoseNumberBeforeDate(
    filteredWithoutConflictingDeworming,
    dewormingFamily,
    preVaccineDueDate,
  );
  const preVaccineDeworming = buildPreVaccineDeworming(species, today, firstVaccineDate, preVaccineDoseNumber);

  return [preVaccineDeworming, ...filteredWithoutConflictingDeworming];
}

function staggerInitialCatchUpSchedule(
  species: CoreCareScheduleSpecies,
  recommendations: CoreCareScheduleRecommendation[],
  selectedFamilies: Set<CoreCareScheduleFamily>,
  firstSelectedVaccine: CoreCareScheduleRecommendation,
  today: Date,
): CoreCareScheduleRecommendation[] {
  const baselineVaccineDate = addDays(today, PRE_VACCINE_DEWORMING_DAYS);
  const secondSelectedVaccineDate = addDays(baselineVaccineDate, weeks(4));
  const rabiesFamily: CoreCareScheduleFamily = species === 'dog' ? 'dogRabies' : 'catRabies';
  const dewormingFamily = routineDewormingFamily(species);
  const selectedVaccineFamily = firstSelectedVaccine.family;
  const selectedVaccineHasSecondDose = recommendations.some(
    (recommendation) => recommendation.family === selectedVaccineFamily && recommendation.kind === 'vaccine' && recommendation.doseNumber > 1,
  );

  const preVaccineDeworming = {
    ...buildPreVaccineDeworming(species, today, baselineVaccineDate, 1),
    isCatchUp: true,
  };

  const adjustedRecommendations = recommendations.flatMap((recommendation) => {
    if (recommendation.family === selectedVaccineFamily && recommendation.kind === 'vaccine') {
      const dueDate = addDays(baselineVaccineDate, weeks(4) * (recommendation.doseNumber - 1));
      return [
        {
          ...recommendation,
          dueDate: formatCoreCareScheduleDate(dueDate),
          isCatchUp: true,
        },
      ];
    }

    if (
      recommendation.family === rabiesFamily &&
      recommendation.kind === 'vaccine' &&
      !selectedFamilies.has(rabiesFamily) &&
      new Date(`${recommendation.dueDate}T00:00:00`).getTime() <= baselineVaccineDate.getTime()
    ) {
      return [
        {
          ...recommendation,
          dueDate: formatCoreCareScheduleDate(secondSelectedVaccineDate),
          isCatchUp: true,
        },
      ];
    }

    if (recommendation.family === dewormingFamily) {
      const dueTime = new Date(`${recommendation.dueDate}T00:00:00`).getTime();
      if (dueTime >= today.getTime() && dueTime <= secondSelectedVaccineDate.getTime()) return [];
    }

    return [recommendation];
  });

  const optimizedRoutineDeworming =
    selectedVaccineHasSecondDose
      ? [
          buildSingleRecommendation({
            family: dewormingFamily,
            kind: 'deworming',
            doseNumber: 2,
            today,
            targetDate: addDays(secondSelectedVaccineDate, -PRE_VACCINE_DEWORMING_DAYS),
            sourceLabel: 'TroCCAP / CAPC parasite guidance',
            sourceUrl: TROCCAP_URL,
          }),
        ]
      : [];

  return [preVaccineDeworming, ...adjustedRecommendations, ...optimizedRoutineDeworming];
}

function selectedInitialVaccineFamilies(species: CoreCareScheduleSpecies, selectedVaccineId: string): Set<CoreCareScheduleFamily> {
  if (species === 'dog') {
    if (selectedVaccineId === 'dog_5in1_dhppl' || selectedVaccineId === 'dog_7in1') {
      return new Set(['dogDhpp', 'dogLepto']);
    }
    if (selectedVaccineId === 'dog_rabies') return new Set(['dogRabies']);
    return new Set();
  }

  if (selectedVaccineId === 'cat_3in1_fvrcp' || selectedVaccineId === 'cat_4in1') {
    return new Set(['catFvrcp']);
  }
  if (selectedVaccineId === 'cat_felv') return new Set(['catFelv']);
  if (selectedVaccineId === 'cat_rabies') return new Set(['catRabies']);
  return new Set();
}

function routineDewormingFamily(species: CoreCareScheduleSpecies): 'dogDeworming' | 'catDeworming' {
  return species === 'dog' ? 'dogDeworming' : 'catDeworming';
}

function nextDewormingDoseNumberBeforeDate(
  recommendations: CoreCareScheduleRecommendation[],
  family: 'dogDeworming' | 'catDeworming',
  beforeDate: Date,
): number {
  const beforeTime = beforeDate.getTime();
  return (
    recommendations.filter((recommendation) => {
      if (recommendation.family !== family) return false;
      return new Date(`${recommendation.dueDate}T00:00:00`).getTime() < beforeTime;
    }).length + 1
  );
}

function buildPreVaccineDeworming(
  species: CoreCareScheduleSpecies,
  today: Date,
  firstVaccineDate: Date,
  doseNumber: number,
): CoreCareScheduleRecommendation {
  return buildSingleRecommendation({
    family: routineDewormingFamily(species),
    kind: 'deworming',
    doseNumber,
    today,
    targetDate: addDays(firstVaccineDate, -PRE_VACCINE_DEWORMING_DAYS),
    sourceLabel: 'TroCCAP / CAPC parasite guidance',
    sourceUrl: TROCCAP_URL,
  });
}

function buildPrimarySeries(input: SeriesInput): CoreCareScheduleRecommendation[] {
  let targetDate = addDays(input.birthDate, input.startAgeDays);
  let dueDate = maxDate(input.today, targetDate);
  const finalMinDate = addDays(input.birthDate, input.finalMinAgeDays);
  const recommendations: CoreCareScheduleRecommendation[] = [];
  let doseNumber = 1;
  const maxPrimaryDoseCount = input.maxPrimaryDoseCount ?? Number.POSITIVE_INFINITY;
  const hasMaxPrimaryDoseCount = Number.isFinite(maxPrimaryDoseCount);

  recommendations.push(buildDatedRecommendation(input, doseNumber, input.today, targetDate));
  while (hasMaxPrimaryDoseCount ? doseNumber < maxPrimaryDoseCount : dueDate.getTime() < finalMinDate.getTime()) {
    doseNumber += 1;
    targetDate = addDays(dueDate, input.intervalDays);
    dueDate = maxDate(input.today, targetDate);
    recommendations.push(buildDatedRecommendation(input, doseNumber, input.today, targetDate));
  }

  if (input.boosterAgeDays) {
    const boosterDate = addDays(input.birthDate, input.boosterAgeDays);
    const lastDueDate = recommendations[recommendations.length - 1]?.dueDate;
    const minimumBoosterDate = lastDueDate ? addDays(new Date(`${lastDueDate}T00:00:00`), input.intervalDays) : null;
    if (
      boosterDate.getTime() >= input.today.getTime() &&
      formatCoreCareScheduleDate(boosterDate) !== lastDueDate &&
      (!minimumBoosterDate || boosterDate.getTime() >= minimumBoosterDate.getTime())
    ) {
      recommendations.push(buildDatedRecommendation(input, doseNumber + 1, input.today, boosterDate));
    }
  }

  return recommendations;
}

function buildTwoDoseSeries({
  family,
  kind,
  firstDueDate,
  intervalDays,
  sourceLabel,
  sourceUrl,
}: {
  family: CoreCareScheduleFamily;
  kind: CoreCareScheduleKind;
  firstDueDate: Date;
  intervalDays: number;
  sourceLabel: string;
  sourceUrl: string;
}): CoreCareScheduleRecommendation[] {
  const today = startOfDay(new Date(firstDueDate));
  return [
    buildSingleRecommendation({
      family,
      kind,
      doseNumber: 1,
      today,
      targetDate: firstDueDate,
      sourceLabel,
      sourceUrl,
    }),
    buildSingleRecommendation({
      family,
      kind,
      doseNumber: 2,
      today,
      targetDate: addDays(firstDueDate, intervalDays),
      sourceLabel,
      sourceUrl,
    }),
  ];
}

function buildDewormingSeries({
  family,
  birthDate,
  today,
  earlyWeeks,
}: {
  family: CoreCareScheduleFamily;
  birthDate: Date;
  today: Date;
  earlyWeeks: number[];
}): CoreCareScheduleRecommendation[] {
  const sixMonthDate = addDays(birthDate, MONTH_DAYS * 6);
  if (today.getTime() > sixMonthDate.getTime()) {
    return [
      buildSingleRecommendation({
        family,
        kind: 'deworming',
        doseNumber: 1,
        today,
        targetDate: today,
        sourceLabel: 'TroCCAP tropical parasite guidance',
        sourceUrl: TROCCAP_URL,
      }),
    ];
  }

  const dates = earlyWeeks.map((week) => addDays(birthDate, weeks(week)));
  let monthlyDate = addDays(birthDate, weeks(12));
  while (monthlyDate.getTime() <= sixMonthDate.getTime()) {
    dates.push(monthlyDate);
    monthlyDate = addDays(monthlyDate, MONTH_DAYS);
  }

  return dates
    .filter((date) => date.getTime() >= today.getTime())
    .map((targetDate, index) =>
      buildSingleRecommendation({
        family,
        kind: 'deworming',
        doseNumber: index + 1,
        today,
        targetDate,
        sourceLabel: 'TroCCAP / CAPC parasite guidance',
        sourceUrl: TROCCAP_URL,
      }),
    );
}

function buildDatedRecommendation(input: SeriesInput, doseNumber: number, today: Date, targetDate: Date): CoreCareScheduleRecommendation {
  return buildSingleRecommendation({
    family: input.family,
    kind: input.kind,
    doseNumber,
    today,
    targetDate,
    sourceLabel: input.sourceLabel,
    sourceUrl: input.sourceUrl,
  });
}

function buildSingleRecommendation({
  family,
  kind,
  doseNumber,
  today,
  targetDate,
  sourceLabel,
  sourceUrl,
}: {
  family: CoreCareScheduleFamily;
  kind: CoreCareScheduleKind;
  doseNumber: number;
  today: Date;
  targetDate: Date;
  sourceLabel: string;
  sourceUrl: string;
}): CoreCareScheduleRecommendation {
  const dueDate = maxDate(today, targetDate);
  return buildScheduledRecommendation({
    family,
    kind,
    doseNumber,
    today,
    targetDate,
    dueDate,
    sourceLabel,
    sourceUrl,
  });
}

function buildScheduledRecommendation({
  family,
  kind,
  doseNumber,
  today,
  targetDate,
  dueDate,
  sourceLabel,
  sourceUrl,
}: {
  family: CoreCareScheduleFamily;
  kind: CoreCareScheduleKind;
  doseNumber: number;
  today: Date;
  targetDate: Date;
  dueDate: Date;
  sourceLabel: string;
  sourceUrl: string;
}): CoreCareScheduleRecommendation {
  const normalizedDueDate = maxDate(today, dueDate);
  return {
    id: `${family}-${doseNumber}-${formatCoreCareScheduleDate(normalizedDueDate)}`,
    family,
    kind,
    doseNumber,
    dueDate: formatCoreCareScheduleDate(normalizedDueDate),
    targetDate: formatCoreCareScheduleDate(targetDate),
    sourceLabel,
    sourceUrl,
    isCatchUp: normalizedDueDate.getTime() > targetDate.getTime(),
  };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = startOfDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = startOfDay(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? startOfDay(a) : startOfDay(b);
}

function mostRecentVaccineWithinWeek(today: Date, vaccineDates: Date[]): Date | null {
  const windowStart = addDays(today, -PRE_VACCINE_DEWORMING_DAYS);
  const recentVaccines = vaccineDates
    .filter((date) => date.getTime() >= windowStart.getTime() && date.getTime() <= today.getTime())
    .sort((a, b) => b.getTime() - a.getTime());
  return recentVaccines[0] ?? null;
}

function hasDewormingOnOrAfterDate(dewormDates: Date[], sinceDate: Date): boolean {
  return dewormDates.some((date) => date.getTime() >= sinceDate.getTime());
}

function findRecentVaccineForDewormDeferral(today: Date, vaccineDates: Date[], dewormDates: Date[]): Date | null {
  const recentVaccine = mostRecentVaccineWithinWeek(today, vaccineDates);
  if (!recentVaccine) return null;
  if (hasDewormingOnOrAfterDate(dewormDates, recentVaccine)) return null;
  return recentVaccine;
}

function deferredDewormDueAfterRecentVaccine(today: Date, defaultDueDate: Date, recentVaccineDate: Date): Date {
  const deferredDue = addDays(recentVaccineDate, PRE_VACCINE_DEWORMING_DAYS);
  if (defaultDueDate.getTime() <= recentVaccineDate.getTime()) {
    return maxDate(today, deferredDue);
  }
  return maxDate(defaultDueDate, maxDate(today, deferredDue));
}

function administeredVaccineDatesByIds(
  administeredVaccines: AdministeredVaccineDoseInput[],
  vaccineIds: Set<string>,
  today: Date,
): Date[] {
  return administeredVaccines
    .filter((dose) => vaccineIds.has(dose.vaccineId))
    .map((dose) => startOfDay(dose.administeredAt))
    .filter((date) => date.getTime() <= today.getTime())
    .sort((a, b) => a.getTime() - b.getTime());
}

function adjustAdultDogCatchUpForAdministeredVaccines(
  recommendations: CoreCareScheduleRecommendation[],
  administeredVaccines: AdministeredVaccineDoseInput[],
  today: Date,
): CoreCareScheduleRecommendation[] {
  return adjustDogScheduleForAdministeredVaccines(recommendations, administeredVaccines, today);
}

function adjustDogScheduleForAdministeredVaccines(
  recommendations: CoreCareScheduleRecommendation[],
  administeredVaccines: AdministeredVaccineDoseInput[],
  today: Date,
): CoreCareScheduleRecommendation[] {
  let adjusted = recommendations;
  const dhppDates = administeredVaccineDatesByIds(
    administeredVaccines,
    new Set(['dog_5in1_dhppl', 'dog_7in1']),
    today,
  );
  const leptoDates = administeredVaccineDatesByIds(administeredVaccines, new Set(['dog_7in1']), today);

  if (dhppDates.length > 0) {
    const completedDoses = dhppDates.length;
    const lastAdministeredDate = dhppDates[completedDoses - 1]!;
    adjusted = adjusted
      .filter((recommendation) => !(recommendation.family === 'dogDhpp' && recommendation.doseNumber <= completedDoses))
      .map((recommendation) => {
        if (recommendation.family !== 'dogDhpp') return recommendation;

        const targetDate = addDays(lastAdministeredDate, weeks(4) * (recommendation.doseNumber - completedDoses));
        return buildScheduledRecommendation({
          family: recommendation.family,
          kind: recommendation.kind,
          doseNumber: recommendation.doseNumber,
          today,
          targetDate,
          dueDate: maxDate(today, targetDate),
          sourceLabel: recommendation.sourceLabel,
          sourceUrl: recommendation.sourceUrl,
        });
      });
  }

  if (leptoDates.length > 0) {
    const completedDoses = leptoDates.length;
    const lastAdministeredDate = leptoDates[completedDoses - 1]!;
    adjusted = adjusted
      .filter((recommendation) => !(recommendation.family === 'dogLepto' && recommendation.doseNumber <= completedDoses))
      .map((recommendation) => {
        if (recommendation.family !== 'dogLepto') return recommendation;

        const targetDate = addDays(lastAdministeredDate, weeks(4) * (recommendation.doseNumber - completedDoses));
        return buildScheduledRecommendation({
          family: recommendation.family,
          kind: recommendation.kind,
          doseNumber: recommendation.doseNumber,
          today,
          targetDate,
          dueDate: maxDate(today, targetDate),
          sourceLabel: recommendation.sourceLabel,
          sourceUrl: recommendation.sourceUrl,
        });
      });
  }

  const rabiesDates = administeredVaccineDatesByIds(administeredVaccines, new Set(['dog_rabies']), today);
  if (rabiesDates.length > 0) {
    adjusted = adjusted.filter(
      (recommendation) => !(recommendation.family === 'dogRabies' && recommendation.doseNumber <= rabiesDates.length),
    );
  }

  return adjusted;
}

function adjustDogDewormingForRecentVaccination(
  recommendations: CoreCareScheduleRecommendation[],
  administeredVaccines: AdministeredVaccineDoseInput[],
  administeredDewormings: AdministeredDewormingDoseInput[],
  today: Date,
): CoreCareScheduleRecommendation[] {
  const vaccineDates = administeredVaccines
    .map((dose) => startOfDay(dose.administeredAt))
    .filter((date) => date.getTime() <= today.getTime());
  const dewormDates = administeredDewormings
    .map((dose) => startOfDay(dose.administeredAt))
    .filter((date) => date.getTime() <= today.getTime());
  const recentVaccine = findRecentVaccineForDewormDeferral(today, vaccineDates, dewormDates);
  if (!recentVaccine) return recommendations;

  let adjustedFirstDeworm = false;
  return recommendations.map((recommendation) => {
    if (adjustedFirstDeworm || recommendation.family !== 'dogDeworming') return recommendation;

    adjustedFirstDeworm = true;
    const targetDate = new Date(`${recommendation.targetDate}T00:00:00`);
    const currentDue = new Date(`${recommendation.dueDate}T00:00:00`);
    const deferredDue = deferredDewormDueAfterRecentVaccine(today, currentDue, recentVaccine);
    if (deferredDue.getTime() === currentDue.getTime()) return recommendation;

    return buildScheduledRecommendation({
      family: recommendation.family,
      kind: recommendation.kind,
      doseNumber: recommendation.doseNumber,
      today,
      targetDate,
      dueDate: deferredDue,
      sourceLabel: recommendation.sourceLabel,
      sourceUrl: recommendation.sourceUrl,
    });
  });
}

function adjustAdultCatCatchUpForAdministeredVaccines(
  recommendations: CoreCareScheduleRecommendation[],
  administeredVaccines: AdministeredVaccineDoseInput[],
  today: Date,
): CoreCareScheduleRecommendation[] {
  let adjusted = recommendations;
  const fvrcpDates = administeredVaccineDatesByIds(
    administeredVaccines,
    new Set(['cat_3in1_fvrcp', 'cat_4in1']),
    today,
  );

  if (fvrcpDates.length > 0) {
    const completedDoses = fvrcpDates.length;
    const lastAdministeredDate = fvrcpDates[completedDoses - 1]!;
    adjusted = adjusted
      .filter((recommendation) => !(recommendation.family === 'catFvrcp' && recommendation.doseNumber <= completedDoses))
      .map((recommendation) => {
        if (recommendation.family !== 'catFvrcp') return recommendation;

        const targetDate = addDays(lastAdministeredDate, weeks(4) * (recommendation.doseNumber - completedDoses));
        return buildScheduledRecommendation({
          family: recommendation.family,
          kind: recommendation.kind,
          doseNumber: recommendation.doseNumber,
          today,
          targetDate,
          dueDate: maxDate(today, targetDate),
          sourceLabel: recommendation.sourceLabel,
          sourceUrl: recommendation.sourceUrl,
        });
      });
  }

  const rabiesDates = administeredVaccineDatesByIds(administeredVaccines, new Set(['cat_rabies']), today);
  if (rabiesDates.length > 0) {
    adjusted = adjusted.filter(
      (recommendation) => !(recommendation.family === 'catRabies' && recommendation.doseNumber <= rabiesDates.length),
    );
  }

  return adjusted;
}

function adjustCatDewormingForRecentVaccination(
  recommendations: CoreCareScheduleRecommendation[],
  administeredVaccines: AdministeredVaccineDoseInput[],
  administeredDewormings: AdministeredDewormingDoseInput[],
  today: Date,
): CoreCareScheduleRecommendation[] {
  const vaccineDates = administeredVaccines
    .map((dose) => startOfDay(dose.administeredAt))
    .filter((date) => date.getTime() <= today.getTime());
  const dewormDates = administeredDewormings
    .map((dose) => startOfDay(dose.administeredAt))
    .filter((date) => date.getTime() <= today.getTime());
  const recentVaccine = findRecentVaccineForDewormDeferral(today, vaccineDates, dewormDates);
  if (!recentVaccine) return recommendations;

  let adjustedFirstDeworm = false;
  return recommendations.map((recommendation) => {
    if (adjustedFirstDeworm || recommendation.family !== 'catDeworming') return recommendation;

    adjustedFirstDeworm = true;
    const targetDate = new Date(`${recommendation.targetDate}T00:00:00`);
    const currentDue = new Date(`${recommendation.dueDate}T00:00:00`);
    const deferredDue = deferredDewormDueAfterRecentVaccine(today, currentDue, recentVaccine);
    if (deferredDue.getTime() === currentDue.getTime()) return recommendation;

    return buildScheduledRecommendation({
      family: recommendation.family,
      kind: recommendation.kind,
      doseNumber: recommendation.doseNumber,
      today,
      targetDate,
      dueDate: deferredDue,
      sourceLabel: recommendation.sourceLabel,
      sourceUrl: recommendation.sourceUrl,
    });
  });
}

function daysBetween(start: Date, end: Date): number {
  return Math.floor((startOfDay(end).getTime() - startOfDay(start).getTime()) / DAY_MS);
}

function weeks(value: number): number {
  return value * WEEK_DAYS;
}

function vaccineSeriesForDose(
  species: CoreCareScheduleSpecies,
  vaccineId: string,
  petAgeMonths?: number | null,
): VaccineSeriesSpec | null {
  const isYoungPet = typeof petAgeMonths === 'number' && petAgeMonths < 6;
  if (species === 'dog') {
    if (vaccineId === 'dog_rabies') {
      return {
        key: 'dog-rabies',
        primaryDoseCount: 1,
        primaryIntervalDays: weeks(4),
        boosterIntervalDays: ONE_YEAR_DAYS,
        sourceLabel: 'WSAVA 2024 / Vietnam rabies requirement',
        sourceUrl: WSAVA_2024_URL,
      };
    }
    if (vaccineId === 'dog_bordetella') {
      return {
        key: 'dog-bordetella',
        primaryDoseCount: 1,
        primaryIntervalDays: weeks(4),
        boosterIntervalDays: ONE_YEAR_DAYS,
        sourceLabel: 'AAHA 2022 lifestyle-based vaccine guidance',
        sourceUrl: AAHA_CANINE_2022_URL,
      };
    }
    if (vaccineId === 'dog_5in1_dhppl' || vaccineId === 'dog_7in1') {
      return {
        key: 'dog-core-combo',
        primaryDoseCount: isYoungPet ? 3 : 2,
        primaryIntervalDays: weeks(4),
        boosterIntervalDays: ONE_YEAR_DAYS,
        sourceLabel: 'WSAVA 2024 / AAHA 2022',
        sourceUrl: AAHA_CANINE_2022_URL,
      };
    }
    return null;
  }

  if (vaccineId === 'cat_rabies') {
    return {
      key: 'cat-rabies',
      primaryDoseCount: 1,
      primaryIntervalDays: weeks(4),
      boosterIntervalDays: ONE_YEAR_DAYS,
      sourceLabel: 'WSAVA 2024 / Vietnam rabies requirement',
      sourceUrl: WSAVA_2024_URL,
    };
  }
  if (vaccineId === 'cat_3in1_fvrcp' || vaccineId === 'cat_4in1') {
    return {
      key: 'cat-core-combo',
      primaryDoseCount: isYoungPet ? 3 : 2,
      primaryIntervalDays: weeks(4),
      sourceLabel: 'WSAVA 2024 / AAHA-AAFP 2020',
      sourceUrl: AAFP_FELINE_2020_URL,
      boosterIntervalDays: ONE_YEAR_DAYS,
    };
  }
  if (vaccineId === 'cat_felv') {
    return {
      key: 'cat-felv',
      primaryDoseCount: 2,
      primaryIntervalDays: weeks(4),
      boosterIntervalDays: ONE_YEAR_DAYS,
      sourceLabel: 'AAHA-AAFP 2020',
      sourceUrl: AAFP_FELINE_2020_URL,
    };
  }
  return null;
}
