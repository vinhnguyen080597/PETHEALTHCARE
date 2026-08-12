/** Known registration authorities in Vietnam by primary species (slug ids). */
export const REGISTRATION_UNIT_OTHER = 'other';

export const REGISTRATION_UNITS_BY_SPECIES = {
  cat: ['wcf_vca', 'vca', 'tica', 'cfa', 'avf', REGISTRATION_UNIT_OTHER],
  dog: ['vka', REGISTRATION_UNIT_OTHER],
  bird: ['vocas', 'cites_local', REGISTRATION_UNIT_OTHER],
  fish: ['vocas', REGISTRATION_UNIT_OTHER],
  rabbit: ['vocas', REGISTRATION_UNIT_OTHER],
  hamster: ['vocas', REGISTRATION_UNIT_OTHER],
  reptile: ['vocas', 'cites_local', REGISTRATION_UNIT_OTHER],
};

function trimText(value, max = 200) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

export function registrationUnitsForSpecies(species) {
  const key = trimText(species, 32).toLowerCase();
  return REGISTRATION_UNITS_BY_SPECIES[key] || [REGISTRATION_UNIT_OTHER];
}

export function normalizeRegistrationUnitPayload(primarySpecies, unit, other) {
  const species = Array.isArray(primarySpecies) ? primarySpecies[0] : primarySpecies;
  const options = registrationUnitsForSpecies(species);
  const rawUnit = trimText(unit, 120);
  const rawOther = trimText(other, 200);

  if (options.includes(rawUnit)) {
    return {
      registration_unit: rawUnit,
      registration_unit_other: rawUnit === REGISTRATION_UNIT_OTHER ? rawOther : '',
    };
  }

  if (rawUnit) {
    return {
      registration_unit: REGISTRATION_UNIT_OTHER,
      registration_unit_other: rawUnit,
    };
  }

  return {
    registration_unit: '',
    registration_unit_other: '',
  };
}
