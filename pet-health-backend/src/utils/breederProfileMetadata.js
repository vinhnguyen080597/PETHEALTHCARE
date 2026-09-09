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
