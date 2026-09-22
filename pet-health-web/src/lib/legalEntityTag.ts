/** Public HKD / DN tag after admin-approved business_license pack. */

export const LEGAL_ENTITY_TAGS = ["household_business", "enterprise"] as const;

export type LegalEntityTag = (typeof LEGAL_ENTITY_TAGS)[number];

export const BUSINESS_LICENSE_VERIFY_CHECK_KEYS = [
  "mstPortalMatch",
  "documentReadable",
  "addressMatch",
  "subjectMatch",
] as const;

export type BusinessLicenseVerifyCheckKey =
  (typeof BUSINESS_LICENSE_VERIFY_CHECK_KEYS)[number];

export function normalizeLegalEntityTag(value: unknown): LegalEntityTag | null {
  const raw = String(value || "")
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
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 4) return digits ? "••••" : "";
  return `${digits.slice(0, 2)}${"•".repeat(Math.max(digits.length - 4, 2))}${digits.slice(-2)}`;
}

/** Digits-only tax / business registration id for registry lookups. */
export function normalizeTaxIdDigits(value: unknown): string {
  return String(value || "").replace(/\D/g, "");
}

/**
 * Quick third-party MST page (deep-linkable). Admin should still confirm on GDT.
 * Example: https://masothue.com/0312345678
 */
export function vietnamMasothueLookupHref(taxId: unknown): string | null {
  const digits = normalizeTaxIdDigits(taxId);
  if (digits.length < 8) return null;
  return `https://masothue.com/${encodeURIComponent(digits)}`;
}

/** Official General Department of Taxation taxpayer lookup (form-based). */
export function vietnamTaxPortalLookupHref(): string {
  return "https://tracuunnt.gdt.gov.vn/tcnnt/mstdn.jsp";
}

/** National business registration portal search. */
export function vietnamBusinessRegistryLookupHref(): string {
  return "https://dangkykinhdoanh.gov.vn/";
}

export type VietnamBusinessLookupLink = {
  id: "masothue" | "gdt" | "dkkd";
  href: string;
  labelKey: string;
};

/** Admin verify shortcuts for DN/HKD checklist. */
export function vietnamBusinessLookupLinks(
  taxId: unknown,
): VietnamBusinessLookupLink[] {
  const links: VietnamBusinessLookupLink[] = [];
  const masothue = vietnamMasothueLookupHref(taxId);
  if (masothue) {
    links.push({
      id: "masothue",
      href: masothue,
      labelKey: "admin.details.lookup.masothue",
    });
  }
  links.push({
    id: "gdt",
    href: vietnamTaxPortalLookupHref(),
    labelKey: "admin.details.lookup.gdt",
  });
  links.push({
    id: "dkkd",
    href: vietnamBusinessRegistryLookupHref(),
    labelKey: "admin.details.lookup.dkkd",
  });
  return links;
}

export function legalEntityI18nKey(
  tag: LegalEntityTag | null | undefined,
):
  | "farm.legalEntity.enterprise"
  | "farm.legalEntity.householdBusiness"
  | null {
  if (tag === "enterprise") return "farm.legalEntity.enterprise";
  if (tag === "household_business") return "farm.legalEntity.householdBusiness";
  return null;
}

/** Public GPKD fields after admin approve — never includes tax id. */
export type PublicLegalDisclosure = {
  tag: LegalEntityTag;
  legalName: string;
  registeredAddress: string;
};

function metaString(meta: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function publicLegalDisclosureFromMeta(
  meta: Record<string, unknown> | null | undefined,
): PublicLegalDisclosure | null {
  const record = meta && typeof meta === "object" ? meta : {};
  const tag = legalEntityTagFromMeta(record);
  if (!tag) return null;
  const identity =
    record.identity && typeof record.identity === "object" && !Array.isArray(record.identity)
      ? (record.identity as Record<string, unknown>)
      : {};
  const legalName =
    metaString(record, "legal_name", "legalName") ||
    metaString(identity, "legal_name", "legalName");
  const registeredAddress =
    metaString(record, "registered_address", "registeredAddress") ||
    metaString(identity, "registered_address", "registeredAddress");
  return { tag, legalName, registeredAddress };
}

export function publicLegalDisclosureHasContent(
  disclosure: PublicLegalDisclosure | null | undefined,
): boolean {
  if (!disclosure) return false;
  return Boolean(disclosure.legalName || disclosure.registeredAddress);
}
