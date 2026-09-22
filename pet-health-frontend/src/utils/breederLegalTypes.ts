/** Breeder profile “Loại hình”: enterprise | household_business | individual. */

export const BREEDER_LEGAL_TYPES = [
  'enterprise',
  'household_business',
  'individual',
] as const;

export type BreederLegalType = (typeof BREEDER_LEGAL_TYPES)[number];

const LEGACY_TYPE_MAP: Record<string, BreederLegalType> = {
  registered_kennel: 'enterprise',
  home_breeder: 'individual',
  rescue_foster: 'individual',
  rehoming: 'individual',
  other: 'individual',
  enterprise: 'enterprise',
  household_business: 'household_business',
  individual: 'individual',
};

export function normalizeBreederLegalType(value: unknown): BreederLegalType {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  return LEGACY_TYPE_MAP[raw] || 'individual';
}

export function isBusinessEntityBreederType(type: unknown): boolean {
  const normalized = normalizeBreederLegalType(type);
  return normalized === 'enterprise' || normalized === 'household_business';
}

export type BusinessEntityFieldErrors = {
  legalName?: string;
  registeredAddress?: string;
  taxId?: string;
  licenseFile?: string;
};

export function validateBusinessEntityFields(
  input: {
    breederType: string;
    legalName: string;
    registeredAddress: string;
    taxId: string;
    hasLicenseFile: boolean;
  },
  messages: {
    legalNameRequired: string;
    addressRequired: string;
    taxIdInvalid: string;
    licenseFileRequired: string;
  },
): BusinessEntityFieldErrors {
  if (!isBusinessEntityBreederType(input.breederType)) return {};
  const errors: BusinessEntityFieldErrors = {};
  if (!String(input.legalName || '').trim()) {
    errors.legalName = messages.legalNameRequired;
  }
  if (!String(input.registeredAddress || '').trim()) {
    errors.registeredAddress = messages.addressRequired;
  }
  const digits = String(input.taxId || '').replace(/\D/g, '');
  if (!/^\d{8,14}$/.test(digits)) {
    errors.taxId = messages.taxIdInvalid;
  }
  if (!input.hasLicenseFile) {
    errors.licenseFile = messages.licenseFileRequired;
  }
  return errors;
}
