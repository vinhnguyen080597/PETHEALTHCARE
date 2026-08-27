/**
 * Vaccine statuses that claim vaccination (not unknown / not yet).
 * Require at least one health evidence photo in metadata.health_evidence_urls.
 */
export function vaccineStatusRequiresHealthEvidence(vaccineStatus) {
  const value = String(vaccineStatus ?? '').trim().toLowerCase();
  if (!value || value === 'unknown') return false;
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

export function healthEvidenceUrlsFromMetadata(metadata) {
  const raw = metadata && typeof metadata === 'object' ? metadata.health_evidence_urls : null;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => typeof item === 'string' && item.trim().length > 0);
}

/**
 * Formerly required vaccine book/stamp photos for vaccinated listings.
 * Evidence upload was removed from create/edit listing UI; keep the helper
 * as a no-op so older clients and call sites stay compatible.
 */
export function assertHealthEvidenceForReview(_payload) {
  return;
}
