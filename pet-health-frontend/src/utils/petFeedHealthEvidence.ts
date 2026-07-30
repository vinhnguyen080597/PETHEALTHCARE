/**
 * Vaccine statuses that claim the pet has received vaccination (not unknown / not yet).
 * Evidence photo of vaccine book is required before pending_review.
 */
export function vaccineStatusRequiresHealthEvidence(vaccineStatus: string | null | undefined): boolean {
  const value = String(vaccineStatus ?? '').trim().toLowerCase();
  if (!value || value === 'unknown') return false;
  // Match EN/VI "not yet" options and common variants.
  if (
    value.includes('not yet')
    || value.includes('not vaccinated')
    || value.includes('chưa tiêm')
    || value.includes('chua tiem')
    || value === 'not_yet'
  ) {
    return false;
  }
  return true;
}

export function healthEvidenceUrlsFromMetadata(metadata: Record<string, unknown> | undefined): string[] {
  const raw = metadata?.health_evidence_urls;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}
