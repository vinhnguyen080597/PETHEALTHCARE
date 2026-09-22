/** Strip deprecated breeder profile metadata keys no longer collected in UI. */
export function sanitizeBreederProfileMetadata(metadata) {
  const next = asMetadataObject(metadata);
  for (const key of [
    'scaleRange',
    'scale_range',
    'breedingPetRange',
    'breeding_pet_range',
    'careChecklist',
    'care_checklist',
    'registrationUnit',
    'registration_unit',
    'registrationUnitOther',
    'registration_unit_other',
  ]) {
    delete next[key];
  }
  return next;
}

/**
 * Public farm/listing responses: keep legal_entity_tag + trust flags,
 * never expose identity numbers or license document URLs.
 */
export function toPublicBreederMetadata(metadata) {
  const next = sanitizeBreederProfileMetadata(metadata);
  delete next.identity;
  delete next.business_license_url;
  delete next.business_license_pending_url;
  const tag = String(next.legal_entity_tag || '').trim().toLowerCase();
  if (tag === 'household_business' || tag === 'enterprise') {
    next.legal_entity_tag = tag;
  } else {
    delete next.legal_entity_tag;
  }
  return next;
}

export function hasApprovedLegalEntityTag(metadata) {
  const tag = String(asMetadataObject(metadata).legal_entity_tag || '')
    .trim()
    .toLowerCase();
  return tag === 'household_business' || tag === 'enterprise';
}

function asMetadataObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
}

/**
 * Profile edits must not unpublish a live kennel or unlock a suspended account.
 * First submit / re-apply after reject still goes to admin review.
 */
export function verificationStatusAfterProfileSave(existingStatus) {
  const status = String(existingStatus || '').trim().toLowerCase();
  if (status === 'verified' || status === 'suspended') return status;
  return 'pending_review';
}

/** Incoming form metadata overlays existing so trust awards and cover are not wiped. */
export function mergeBreederProfileMetadata(existing, incoming) {
  return sanitizeBreederProfileMetadata({
    ...asMetadataObject(existing),
    ...asMetadataObject(incoming),
  });
}
