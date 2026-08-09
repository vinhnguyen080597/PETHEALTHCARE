/** Structured pet warranty policy (6 pillars) — shared web helpers. */

export const VACCINE_SHOT_OPTIONS = [1, 2, 3] as const;
export const CARE_PARVO_DAY_OPTIONS = [7, 14, 30] as const;
export const RESPIRATORY_DAY_OPTIONS = [3, 7] as const;
export const CONGENITAL_DAY_OPTIONS = [30, 60, 90] as const;
export const REPORT_HOUR_OPTIONS = [12, 24] as const;
export const MEDICAL_FEE_OPTIONS = [0, 30, 50, 100] as const;
export const RESPONSE_HOUR_OPTIONS = [12, 24] as const;

export const BUYER_GUIDELINE_OPTIONS = [
  "keep_farm_diet_3_5_days",
  "no_bath_7_days",
  "no_contact_unvaccinated_pets",
  "follow_vaccine_booster_schedule",
] as const;

export const EXCLUSION_OPTIONS = [
  "accident_trauma",
  "poisoning_wrong_food",
  "self_treatment_no_notice",
  "missed_booster_vaccine",
  "other_animal_attack",
] as const;

export const EVIDENCE_OPTIONS = [
  "symptom_video",
  "rapid_test_photo",
  "vet_diagnosis_or_pcr",
] as const;

export type BuyerGuidelineId = (typeof BUYER_GUIDELINE_OPTIONS)[number];
export type ExclusionId = (typeof EXCLUSION_OPTIONS)[number];
export type EvidenceId = (typeof EVIDENCE_OPTIONS)[number];
export type VetRequirement = "licensed" | "farm_designated" | "either";
export type ShippingParty = "buyer" | "breeder" | "split";

export type WarrantyPolicyFormValues = {
  title: string;
  vaccineShotsCount: 1 | 2 | 3;
  vaccineTypes: string;
  dewormingNote: string;
  hasHealthBook: boolean;
  careParvoCoverageDays: 7 | 14 | 30;
  respiratorySkinCoverageDays: 3 | 7;
  congenitalCoverageDays: 30 | 60 | 90;
  reportWithinHours: 12 | 24;
  vetRequirement: VetRequirement;
  buyerGuidelines: BuyerGuidelineId[];
  exclusions: ExclusionId[];
  medicalFeeSupportPercent: 0 | 30 | 50 | 100;
  allowEquivalentSwap: boolean;
  shippingParty: ShippingParty;
  evidenceRequired: EvidenceId[];
  breederResponseHours: 12 | 24;
};

export function defaultWarrantyFormValues(): WarrantyPolicyFormValues {
  return {
    title: "",
    vaccineShotsCount: 2,
    vaccineTypes: "",
    dewormingNote: "",
    hasHealthBook: true,
    careParvoCoverageDays: 14,
    respiratorySkinCoverageDays: 3,
    congenitalCoverageDays: 30,
    reportWithinHours: 24,
    vetRequirement: "licensed",
    buyerGuidelines: ["keep_farm_diet_3_5_days", "no_bath_7_days"],
    exclusions: ["accident_trauma", "poisoning_wrong_food", "self_treatment_no_notice"],
    medicalFeeSupportPercent: 50,
    allowEquivalentSwap: true,
    shippingParty: "split",
    evidenceRequired: ["symptom_video", "rapid_test_photo", "vet_diagnosis_or_pcr"],
    breederResponseHours: 24,
  };
}

export function warrantyFormToApiBody(values: WarrantyPolicyFormValues) {
  return {
    title: values.title.trim(),
    vaccine_shots_count: values.vaccineShotsCount,
    vaccine_types: values.vaccineTypes.trim(),
    deworming_note: values.dewormingNote.trim(),
    has_health_book: values.hasHealthBook,
    care_parvo_coverage_days: values.careParvoCoverageDays,
    respiratory_skin_coverage_days: values.respiratorySkinCoverageDays,
    congenital_coverage_days: values.congenitalCoverageDays,
    report_within_hours: values.reportWithinHours,
    vet_requirement: values.vetRequirement,
    buyer_guidelines: values.buyerGuidelines,
    exclusions: values.exclusions,
    medical_fee_support_percent: values.medicalFeeSupportPercent,
    allow_equivalent_swap: values.allowEquivalentSwap,
    shipping_party: values.shippingParty,
    evidence_required: values.evidenceRequired,
    breeder_response_hours: values.breederResponseHours,
  };
}

function pickOption<T extends number>(
  value: number | undefined,
  options: readonly T[],
  fallback: T,
): T {
  return (options as readonly number[]).includes(Number(value))
    ? (Number(value) as T)
    : fallback;
}

function filterKnownIds<T extends string>(
  ids: string[] | undefined,
  options: readonly T[],
): T[] {
  const allowed = new Set<string>(options);
  return (ids || []).filter((id): id is T => allowed.has(id));
}

/** Prefill create/edit form from an existing structured policy. */
export function warrantyPolicyToFormValues(
  policy: {
    title?: string;
    vaccineShotsCount?: number;
    vaccineTypes?: string;
    dewormingNote?: string;
    hasHealthBook?: boolean;
    careParvoCoverageDays?: number;
    respiratorySkinCoverageDays?: number;
    congenitalCoverageDays?: number;
    reportWithinHours?: number;
    vetRequirement?: string;
    buyerGuidelines?: string[];
    exclusions?: string[];
    medicalFeeSupportPercent?: number;
    allowEquivalentSwap?: boolean;
    shippingParty?: string;
    evidenceRequired?: string[];
    breederResponseHours?: number;
  },
): WarrantyPolicyFormValues {
  const defaults = defaultWarrantyFormValues();
  const vet = policy.vetRequirement;
  const shipping = policy.shippingParty;
  return {
    title: String(policy.title || "").trim(),
    vaccineShotsCount: pickOption(
      policy.vaccineShotsCount,
      VACCINE_SHOT_OPTIONS,
      defaults.vaccineShotsCount,
    ),
    vaccineTypes: String(policy.vaccineTypes || ""),
    dewormingNote: String(policy.dewormingNote || ""),
    hasHealthBook: Boolean(policy.hasHealthBook),
    careParvoCoverageDays: pickOption(
      policy.careParvoCoverageDays,
      CARE_PARVO_DAY_OPTIONS,
      defaults.careParvoCoverageDays,
    ),
    respiratorySkinCoverageDays: pickOption(
      policy.respiratorySkinCoverageDays,
      RESPIRATORY_DAY_OPTIONS,
      defaults.respiratorySkinCoverageDays,
    ),
    congenitalCoverageDays: pickOption(
      policy.congenitalCoverageDays,
      CONGENITAL_DAY_OPTIONS,
      defaults.congenitalCoverageDays,
    ),
    reportWithinHours: pickOption(
      policy.reportWithinHours,
      REPORT_HOUR_OPTIONS,
      defaults.reportWithinHours,
    ),
    vetRequirement:
      vet === "licensed" || vet === "farm_designated" || vet === "either"
        ? vet
        : defaults.vetRequirement,
    buyerGuidelines: filterKnownIds(policy.buyerGuidelines, BUYER_GUIDELINE_OPTIONS),
    exclusions: filterKnownIds(policy.exclusions, EXCLUSION_OPTIONS),
    medicalFeeSupportPercent: pickOption(
      policy.medicalFeeSupportPercent,
      MEDICAL_FEE_OPTIONS,
      defaults.medicalFeeSupportPercent,
    ),
    allowEquivalentSwap: Boolean(policy.allowEquivalentSwap),
    shippingParty:
      shipping === "buyer" || shipping === "breeder" || shipping === "split"
        ? shipping
        : defaults.shippingParty,
    evidenceRequired: filterKnownIds(policy.evidenceRequired, EVIDENCE_OPTIONS),
    breederResponseHours: pickOption(
      policy.breederResponseHours,
      RESPONSE_HOUR_OPTIONS,
      defaults.breederResponseHours,
    ),
  };
}

export function toggleIdInList<T extends string>(list: T[], id: T): T[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

/** Calendar field stores YYYY-MM-DD; legacy free-text notes are kept as-is. */
export function isDewormingDateValue(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

/** Local calendar day as YYYY-MM-DD (for date input max). */
export function todayDateInputValue(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Display deworming date as D-M-YYYY (or pass through legacy text). */
export function formatDewormingDateLabel(value: string): string {
  const raw = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return raw;
  return `${Number(match[3])}-${Number(match[2])}-${match[1]}`;
}
