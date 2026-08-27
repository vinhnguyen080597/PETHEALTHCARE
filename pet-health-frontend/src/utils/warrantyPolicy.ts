export type WarrantyPolicy = {
  id: string;
  title: string;
  createdAt?: string;
  frozen?: boolean;
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
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean);
}

export function mapWarrantyPolicy(raw: unknown): WarrantyPolicy | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = String(row.id ?? '').trim();
  const title = String(row.title ?? '').trim();
  if (!id || !title) return null;
  const numOrUndef = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    id,
    title,
    createdAt: String(row.created_at ?? row.createdAt ?? ''),
    frozen: Boolean(row.frozen),
    vaccineShotsCount: numOrUndef(row.vaccine_shots_count ?? row.vaccineShotsCount),
    vaccineTypes: String(row.vaccine_types ?? row.vaccineTypes ?? ''),
    dewormingNote: String(row.deworming_note ?? row.dewormingNote ?? ''),
    hasHealthBook: Boolean(row.has_health_book ?? row.hasHealthBook),
    careParvoCoverageDays: numOrUndef(row.care_parvo_coverage_days ?? row.careParvoCoverageDays),
    respiratorySkinCoverageDays: numOrUndef(
      row.respiratory_skin_coverage_days ?? row.respiratorySkinCoverageDays,
    ),
    congenitalCoverageDays: numOrUndef(row.congenital_coverage_days ?? row.congenitalCoverageDays),
    reportWithinHours: numOrUndef(row.report_within_hours ?? row.reportWithinHours),
    vetRequirement: String(row.vet_requirement ?? row.vetRequirement ?? ''),
    buyerGuidelines: asStringArray(row.buyer_guidelines ?? row.buyerGuidelines),
    exclusions: asStringArray(row.exclusions),
    medicalFeeSupportPercent: numOrUndef(
      row.medical_fee_support_percent ?? row.medicalFeeSupportPercent,
    ),
    allowEquivalentSwap: Boolean(row.allow_equivalent_swap ?? row.allowEquivalentSwap),
    shippingParty: String(row.shipping_party ?? row.shippingParty ?? ''),
    evidenceRequired: asStringArray(row.evidence_required ?? row.evidenceRequired),
    breederResponseHours: numOrUndef(row.breeder_response_hours ?? row.breederResponseHours),
  };
}

export function mapWarrantyPolicies(raw: unknown): WarrantyPolicy[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(mapWarrantyPolicy).filter((p): p is WarrantyPolicy => Boolean(p));
}
