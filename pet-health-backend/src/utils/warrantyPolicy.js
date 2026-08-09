/** Pure helpers for structured pet warranty policies (6 pillars, no file upload). */

export function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export const VACCINE_SHOT_OPTIONS = [1, 2, 3];
export const CARE_PARVO_DAY_OPTIONS = [7, 14, 30];
export const RESPIRATORY_DAY_OPTIONS = [3, 7];
export const CONGENITAL_DAY_OPTIONS = [30, 60, 90];
export const REPORT_HOUR_OPTIONS = [12, 24];
export const MEDICAL_FEE_OPTIONS = [0, 30, 50, 100];
export const RESPONSE_HOUR_OPTIONS = [12, 24];

export const BUYER_GUIDELINE_OPTIONS = [
  'keep_farm_diet_3_5_days',
  'no_bath_7_days',
  'no_contact_unvaccinated_pets',
  'follow_vaccine_booster_schedule',
];

export const EXCLUSION_OPTIONS = [
  'accident_trauma',
  'poisoning_wrong_food',
  'self_treatment_no_notice',
  'missed_booster_vaccine',
  'other_animal_attack',
];

export const EVIDENCE_OPTIONS = [
  'symptom_video',
  'rapid_test_photo',
  'vet_diagnosis_or_pcr',
];

export const VET_REQUIREMENT_OPTIONS = ['licensed', 'farm_designated', 'either'];
export const SHIPPING_PARTY_OPTIONS = ['buyer', 'breeder', 'split'];

function pickNumber(value, allowed, fallback) {
  const n = Number(value);
  return allowed.includes(n) ? n : fallback;
}

function pickEnum(value, allowed, fallback) {
  const v = String(value ?? '').trim();
  return allowed.includes(v) ? v : fallback;
}

function pickStringArray(value, allowed, limit = 12) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? '').trim())
    .filter((item) => allowed.includes(item))
    .slice(0, limit);
}

function trimText(value, max = 300) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Normalize / validate structured warranty policy. Returns null if invalid. */
export function normalizeWarrantyPolicy(raw) {
  const row = asObject(raw);
  const id = String(row.id ?? '').trim();
  const title = trimText(row.title, 160);
  if (!id || !title) return null;

  const vaccineShots = pickNumber(
    row.vaccine_shots_count ?? row.vaccineShotsCount,
    VACCINE_SHOT_OPTIONS,
    2,
  );
  const careDays = pickNumber(
    row.care_parvo_coverage_days ?? row.careParvoCoverageDays,
    CARE_PARVO_DAY_OPTIONS,
    14,
  );
  const respiratoryDays = pickNumber(
    row.respiratory_skin_coverage_days ?? row.respiratorySkinCoverageDays,
    RESPIRATORY_DAY_OPTIONS,
    3,
  );
  const congenitalDays = pickNumber(
    row.congenital_coverage_days ?? row.congenitalCoverageDays,
    CONGENITAL_DAY_OPTIONS,
    30,
  );
  const reportHours = pickNumber(
    row.report_within_hours ?? row.reportWithinHours,
    REPORT_HOUR_OPTIONS,
    24,
  );
  const feePercent = pickNumber(
    row.medical_fee_support_percent ?? row.medicalFeeSupportPercent,
    MEDICAL_FEE_OPTIONS,
    50,
  );
  const responseHours = pickNumber(
    row.breeder_response_hours ?? row.breederResponseHours,
    RESPONSE_HOUR_OPTIONS,
    24,
  );

  return {
    id,
    title,
    created_at: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
    // 1. Handover condition
    vaccine_shots_count: vaccineShots,
    vaccine_types: trimText(row.vaccine_types ?? row.vaccineTypes, 200),
    deworming_note: trimText(row.deworming_note ?? row.dewormingNote, 200),
    has_health_book: Boolean(row.has_health_book ?? row.hasHealthBook),
    // 2. Coverage
    care_parvo_coverage_days: careDays,
    respiratory_skin_coverage_days: respiratoryDays,
    congenital_coverage_days: congenitalDays,
    // 3. Buyer responsibilities
    report_within_hours: reportHours,
    vet_requirement: pickEnum(
      row.vet_requirement ?? row.vetRequirement,
      VET_REQUIREMENT_OPTIONS,
      'licensed',
    ),
    buyer_guidelines: pickStringArray(
      row.buyer_guidelines ?? row.buyerGuidelines,
      BUYER_GUIDELINE_OPTIONS,
    ),
    // 4. Exclusions
    exclusions: pickStringArray(row.exclusions, EXCLUSION_OPTIONS),
    // 5. Remedies
    medical_fee_support_percent: feePercent,
    allow_equivalent_swap: Boolean(
      row.allow_equivalent_swap ?? row.allowEquivalentSwap ?? true,
    ),
    shipping_party: pickEnum(
      row.shipping_party ?? row.shippingParty,
      SHIPPING_PARTY_OPTIONS,
      'split',
    ),
    // 6. Claim process
    evidence_required: pickStringArray(
      row.evidence_required ?? row.evidenceRequired,
      EVIDENCE_OPTIONS,
    ),
    breeder_response_hours: responseHours,
  };
}

export function listWarrantyPoliciesFromMetadata(metadata) {
  const meta = asObject(metadata);
  const raw = Array.isArray(meta.warranty_policies) ? meta.warranty_policies : [];
  return raw.map(normalizeWarrantyPolicy).filter(Boolean);
}

export function findWarrantyPolicy(metadata, policyId) {
  const safeId = String(policyId ?? '').trim();
  if (!safeId) return null;
  return listWarrantyPoliciesFromMetadata(metadata).find((p) => p.id === safeId) ?? null;
}

export function isWarrantyPolicyFrozen(post) {
  const status = String(post?.status ?? '').toLowerCase();
  if (status === 'deposit_hold' || status === 'sold') return true;
  const meta = asObject(post?.metadata);
  const snap = asObject(meta.warranty_policy_snapshot);
  return Boolean(snap.id && snap.title);
}

export function resolveListingWarrantyPolicy(post, breederMetadata) {
  const meta = asObject(post?.metadata);
  const snapshot = normalizeWarrantyPolicy(meta.warranty_policy_snapshot);
  if (snapshot) {
    return { ...snapshot, frozen: true };
  }
  const policyId = String(meta.warranty_policy_id ?? '').trim();
  const fromLibrary = findWarrantyPolicy(breederMetadata, policyId);
  if (!fromLibrary) return null;
  return {
    ...fromLibrary,
    frozen: isWarrantyPolicyFrozen(post),
  };
}

export function buildWarrantySnapshot(policy) {
  const normalized = normalizeWarrantyPolicy(policy);
  if (!normalized) return null;
  return {
    ...normalized,
    frozen_at: new Date().toISOString(),
  };
}

/** Build a create payload from request body (without id). */
export function parseWarrantyPolicyInput(body) {
  const draft = {
    id: 'pending',
    title: body?.title,
    vaccine_shots_count: body?.vaccine_shots_count ?? body?.vaccineShotsCount,
    vaccine_types: body?.vaccine_types ?? body?.vaccineTypes,
    deworming_note: body?.deworming_note ?? body?.dewormingNote,
    has_health_book: body?.has_health_book ?? body?.hasHealthBook,
    care_parvo_coverage_days: body?.care_parvo_coverage_days ?? body?.careParvoCoverageDays,
    respiratory_skin_coverage_days:
      body?.respiratory_skin_coverage_days ?? body?.respiratorySkinCoverageDays,
    congenital_coverage_days: body?.congenital_coverage_days ?? body?.congenitalCoverageDays,
    report_within_hours: body?.report_within_hours ?? body?.reportWithinHours,
    vet_requirement: body?.vet_requirement ?? body?.vetRequirement,
    buyer_guidelines: body?.buyer_guidelines ?? body?.buyerGuidelines,
    exclusions: body?.exclusions,
    medical_fee_support_percent:
      body?.medical_fee_support_percent ?? body?.medicalFeeSupportPercent,
    allow_equivalent_swap: body?.allow_equivalent_swap ?? body?.allowEquivalentSwap,
    shipping_party: body?.shipping_party ?? body?.shippingParty,
    evidence_required: body?.evidence_required ?? body?.evidenceRequired,
    breeder_response_hours: body?.breeder_response_hours ?? body?.breederResponseHours,
    created_at: new Date().toISOString(),
  };
  const normalized = normalizeWarrantyPolicy(draft);
  if (!normalized) return null;
  const { id: _id, ...rest } = normalized;
  return rest;
}
