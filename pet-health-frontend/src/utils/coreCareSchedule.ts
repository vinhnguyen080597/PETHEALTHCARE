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
};

type CalculateCoreCareScheduleInput = {
  species: string;
  birthDate: Date;
  today?: Date;
};

type CalculateNextVaccinationScheduleInput = {
  species: string;
  administeredDoses: AdministeredVaccineDoseInput[];
  petAgeMonths?: number | null;
  today?: Date;
  horizonMonths?: number;
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

export function calculateCoreCareSchedule({
  species,
  birthDate,
  today = new Date(),
}: CalculateCoreCareScheduleInput): CoreCareScheduleRecommendation[] {
  const normalizedSpecies = normalizeCoreCareScheduleSpecies(species);
  if (!normalizedSpecies) return [];

  const normalizedBirthDate = startOfDay(birthDate);
  const normalizedToday = startOfDay(today);
  if (normalizedBirthDate.getTime() > normalizedToday.getTime()) return [];

  const recommendations =
    normalizedSpecies === 'dog'
      ? calculateDogSchedule(normalizedBirthDate, normalizedToday)
      : calculateCatSchedule(normalizedBirthDate, normalizedToday);

  return recommendations
    .sort((a, b) => {
      const dueDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (dueDiff !== 0) return dueDiff;
      return a.id.localeCompare(b.id);
    })
    .map((recommendation) => ({
      ...recommendation,
      id: `${recommendation.family}-${recommendation.doseNumber}-${recommendation.dueDate}`,
    }));
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
  const horizonDate = addMonths(normalizedToday, horizonMonths);
  const grouped = new Map<string, Array<AdministeredVaccineDoseInput & { series: VaccineSeriesSpec }>>();

  for (const dose of administeredDoses) {
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

function calculateDogSchedule(birthDate: Date, today: Date): CoreCareScheduleRecommendation[] {
  const ageDays = daysBetween(birthDate, today);
  if (ageDays > weeks(26)) return adultDogCatchUp(today);

  return [
    ...buildPrimarySeries({
      family: 'dogDhpp',
      kind: 'vaccine',
      startAgeDays: weeks(6),
      finalMinAgeDays: weeks(16),
      intervalDays: weeks(4),
      boosterAgeDays: weeks(26),
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
}

function calculateCatSchedule(birthDate: Date, today: Date): CoreCareScheduleRecommendation[] {
  const ageDays = daysBetween(birthDate, today);
  if (ageDays > weeks(26)) return adultCatCatchUp(today);

  return [
    ...buildPrimarySeries({
      family: 'catFvrcp',
      kind: 'vaccine',
      startAgeDays: weeks(6),
      finalMinAgeDays: weeks(20),
      intervalDays: weeks(4),
      boosterAgeDays: weeks(26),
      birthDate,
      today,
      sourceLabel: 'WSAVA 2024 / AAHA-AAFP 2020',
      sourceUrl: AAFP_FELINE_2020_URL,
    }),
    ...buildTwoDoseSeries({
      family: 'catFelv',
      kind: 'vaccine',
      firstDueDate: maxDate(today, addDays(birthDate, weeks(8))),
      intervalDays: weeks(4),
      sourceLabel: 'AAHA-AAFP 2020',
      sourceUrl: AAFP_FELINE_2020_URL,
    }),
    buildSingleRecommendation({
      family: 'catRabies',
      kind: 'vaccine',
      doseNumber: 1,
      today,
      targetDate: addDays(birthDate, weeks(12)),
      sourceLabel: 'WSAVA 2024 / Vietnam rabies requirement',
      sourceUrl: WSAVA_2024_URL,
    }),
    ...buildDewormingSeries({
      family: 'catDeworming',
      birthDate,
      today,
      earlyWeeks: [2, 4, 6, 8, 10],
    }),
  ];
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

function buildPrimarySeries(input: SeriesInput): CoreCareScheduleRecommendation[] {
  const firstDueDate = maxDate(input.today, addDays(input.birthDate, input.startAgeDays));
  const finalMinDate = addDays(input.birthDate, input.finalMinAgeDays);
  const recommendations: CoreCareScheduleRecommendation[] = [];
  let dueDate = firstDueDate;
  let doseNumber = 1;

  recommendations.push(buildDatedRecommendation(input, doseNumber, input.today, dueDate));
  while (dueDate.getTime() < finalMinDate.getTime()) {
    doseNumber += 1;
    dueDate = addDays(dueDate, input.intervalDays);
    recommendations.push(buildDatedRecommendation(input, doseNumber, input.today, dueDate));
  }

  if (input.boosterAgeDays) {
    const boosterDate = addDays(input.birthDate, input.boosterAgeDays);
    const lastDueDate = recommendations[recommendations.length - 1]?.dueDate;
    if (boosterDate.getTime() >= input.today.getTime() && formatCoreCareScheduleDate(boosterDate) !== lastDueDate) {
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
  return {
    id: `${family}-${doseNumber}-${formatCoreCareScheduleDate(dueDate)}`,
    family,
    kind,
    doseNumber,
    dueDate: formatCoreCareScheduleDate(dueDate),
    targetDate: formatCoreCareScheduleDate(targetDate),
    sourceLabel,
    sourceUrl,
    isCatchUp: dueDate.getTime() > targetDate.getTime(),
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
