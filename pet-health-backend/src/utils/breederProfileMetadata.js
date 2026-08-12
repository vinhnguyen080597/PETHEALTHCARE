/** Strip deprecated breeder profile metadata keys no longer collected in UI. */
export function sanitizeBreederProfileMetadata(metadata) {
  const next = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? { ...metadata }
    : {};
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
