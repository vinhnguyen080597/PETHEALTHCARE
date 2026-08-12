/** Breeder profile: one primary species only. */

export function selectPrimarySpecies(_currentPrimary: string, value: string): string {
  return value;
}

export function breederSpeciesForSave(primary: string) {
  const main = String(primary || "").trim();
  return {
    primarySpecies: main ? [main] : [],
  };
}

export function splitBreederSpeciesForForm(primary: string[] = []): string {
  return primary.filter(Boolean)[0] || "";
}

export function breederDisplaySpecies(primary: string | string[]): string[] {
  const list = Array.isArray(primary) ? primary : primary ? [primary] : [];
  return list.filter(Boolean);
}
