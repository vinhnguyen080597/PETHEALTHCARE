/** Public HKD / DN tag after admin-approved business_license pack. */

export const LEGAL_ENTITY_TAGS = ['household_business', 'enterprise'] as const;

export type LegalEntityTag = (typeof LEGAL_ENTITY_TAGS)[number];

export function normalizeLegalEntityTag(value: unknown): LegalEntityTag | null {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  return LEGAL_ENTITY_TAGS.includes(raw as LegalEntityTag)
    ? (raw as LegalEntityTag)
    : null;
}

export function legalEntityTagFromMeta(
  meta: Record<string, unknown> | null | undefined,
): LegalEntityTag | null {
  return normalizeLegalEntityTag(meta?.legal_entity_tag ?? meta?.legalEntityTag);
}

export function hasApprovedLegalEntityTag(
  meta: Record<string, unknown> | null | undefined,
): boolean {
  return legalEntityTagFromMeta(meta) != null;
}

export function maskTaxId(value: unknown): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 4) return digits ? '••••' : '';
  return `${digits.slice(0, 2)}${'•'.repeat(Math.max(digits.length - 4, 2))}${digits.slice(-2)}`;
}

export function legalEntityI18nKey(tag: LegalEntityTag | null | undefined): string | null {
  if (tag === 'enterprise') return 'farm.legalEntity.enterprise';
  if (tag === 'household_business') return 'farm.legalEntity.householdBusiness';
  return null;
}
