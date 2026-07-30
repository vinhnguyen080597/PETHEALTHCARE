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
 * Throws 400 when status is pending_review/published and vaccinated without evidence.
 */
export function assertHealthEvidenceForReview(payload) {
  const status = String(payload?.status ?? '').trim().toLowerCase();
  if (status !== 'pending_review' && status !== 'published') return;

  const vaccine = payload?.vaccineStatus ?? payload?.vaccine_status ?? '';
  if (!vaccineStatusRequiresHealthEvidence(vaccine)) return;

  const urls = healthEvidenceUrlsFromMetadata(payload?.metadata);
  if (urls.length > 0) return;

  const err = new Error(
    'Vaccine evidence photo is required when listing claims vaccination. Upload a vaccine book or stamp photo.',
  );
  err.status = 400;
  err.code = 'PET_FEED_HEALTH_EVIDENCE_REQUIRED';
  throw err;
}
