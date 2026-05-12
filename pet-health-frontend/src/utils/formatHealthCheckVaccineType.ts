import i18n from '../i18n';
import { vaccineIdsForPetSpecies } from '../constants/petVaccineOptions';

/** Human-readable string for analyze API from multi-select + optional free text (other species). */
export function formatHealthCheckVaccineTypeForApi(species: string, selectedIds: string[], otherFreeText: string): string {
  const allowed = vaccineIdsForPetSpecies(species);
  if (allowed) {
    const allow = new Set(allowed);
    return selectedIds
      .filter((id) => allow.has(id))
      .map((id) => {
        const label = i18n.t(`healthCheck.vaccines.${id}.label`);
        const detail = String(i18n.t(`healthCheck.vaccines.${id}.detail`) ?? '').trim();
        return detail ? `${label} — ${detail}` : label;
      })
      .join('; ');
  }
  return otherFreeText.trim();
}
