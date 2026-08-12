/** Known registration authorities in Vietnam by primary species (slug ids). */
export const REGISTRATION_UNIT_OTHER = 'other' as const;

export const REGISTRATION_UNITS_BY_SPECIES = {
  cat: ['wcf_vca', 'vca', 'tica', 'cfa', 'avf', REGISTRATION_UNIT_OTHER],
  dog: ['vka', REGISTRATION_UNIT_OTHER],
  bird: ['vocas', 'cites_local', REGISTRATION_UNIT_OTHER],
  fish: ['vocas', REGISTRATION_UNIT_OTHER],
  rabbit: ['vocas', REGISTRATION_UNIT_OTHER],
  hamster: ['vocas', REGISTRATION_UNIT_OTHER],
  reptile: ['vocas', 'cites_local', REGISTRATION_UNIT_OTHER],
} as const;

export type BreederRegistrationSpecies = keyof typeof REGISTRATION_UNITS_BY_SPECIES;
export type RegistrationUnitId =
  (typeof REGISTRATION_UNITS_BY_SPECIES)[BreederRegistrationSpecies][number];

export function registrationUnitsForSpecies(
  species: string | null | undefined,
): readonly RegistrationUnitId[] {
  const key = String(species || '')
    .trim()
    .toLowerCase();
  if (key in REGISTRATION_UNITS_BY_SPECIES) {
    return REGISTRATION_UNITS_BY_SPECIES[key as BreederRegistrationSpecies];
  }
  return [REGISTRATION_UNIT_OTHER];
}

export function normalizeRegistrationUnitSelection(input: {
  species: string;
  unit: string;
  other?: string;
}): { registrationUnit: string; registrationUnitOther: string } {
  const options = registrationUnitsForSpecies(input.species);
  const unit = String(input.unit || '').trim();
  const picked = options.includes(unit as RegistrationUnitId)
    ? unit
    : REGISTRATION_UNIT_OTHER;
  const other = String(input.other || '').trim();
  return {
    registrationUnit: picked,
    registrationUnitOther: picked === REGISTRATION_UNIT_OTHER ? other : '',
  };
}

export function displayRegistrationUnit(
  unit: string,
  other: string,
  translate: (key: string) => string,
): string {
  if (!unit) return '';
  if (unit === REGISTRATION_UNIT_OTHER) return other.trim();
  const key = `breederProfile.registrationUnits.${unit}`;
  return translate(key);
}

export function splitRegistrationUnitForForm(input: {
  unit?: string | null;
  other?: string | null;
  species?: string | null;
  legacyMetadataUnit?: string;
}): { registrationUnit: string; registrationUnitOther: string } {
  const options = registrationUnitsForSpecies(input.species);
  let unit = String(input.unit || '').trim();
  let other = String(input.other || '').trim();
  const legacy = String(input.legacyMetadataUnit || '').trim();

  if (!unit && legacy) {
    if (options.includes(legacy as RegistrationUnitId)) {
      unit = legacy;
    } else {
      unit = REGISTRATION_UNIT_OTHER;
      other = legacy;
    }
  } else if (unit && !options.includes(unit as RegistrationUnitId)) {
    other = unit;
    unit = REGISTRATION_UNIT_OTHER;
  }

  return { registrationUnit: unit, registrationUnitOther: other };
}
