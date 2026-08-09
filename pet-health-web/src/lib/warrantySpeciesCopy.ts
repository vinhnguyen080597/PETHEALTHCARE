/** Species-aware copy for warranty library (farm dog/cat). */

export type WarrantyFarmSpecies = "dog" | "cat" | "mixed";

const DOG_PRESET_IDS = [
  "dog_5in1",
  "dog_7in1",
  "dog_rabies",
] as const;

const CAT_PRESET_IDS = [
  "cat_3in1",
  "cat_4in1",
  "cat_rabies",
  "cat_felv",
] as const;

export type WarrantyVaccinePresetId =
  | (typeof DOG_PRESET_IDS)[number]
  | (typeof CAT_PRESET_IDS)[number];

function normalizeSpeciesToken(value: string): string {
  return value.trim().toLowerCase();
}

/** Resolve farm/listing species for warranty labels and vaccine presets. */
export function resolveWarrantyFarmSpecies(input: {
  primarySpecies?: string[] | null;
  listingSpecies?: string | null;
}): WarrantyFarmSpecies {
  const listing = normalizeSpeciesToken(String(input.listingSpecies || ""));
  if (listing === "dog" || listing === "cat") return listing;

  const tokens = (input.primarySpecies || [])
    .map((s) => normalizeSpeciesToken(String(s || "")))
    .filter(Boolean);
  const hasDog = tokens.includes("dog");
  const hasCat = tokens.includes("cat");
  if (hasDog && hasCat) return "mixed";
  if (hasDog) return "dog";
  if (hasCat) return "cat";
  return "mixed";
}

export function warrantyInfectiousFieldKey(
  species: WarrantyFarmSpecies,
): `warranty.field.careParvo.${WarrantyFarmSpecies}` | "warranty.field.careParvo" {
  if (species === "dog") return "warranty.field.careParvo.dog";
  if (species === "cat") return "warranty.field.careParvo.cat";
  return "warranty.field.careParvo";
}

export function warrantyRespiratoryFieldKey(
  species: WarrantyFarmSpecies,
): `warranty.field.respiratory.${"dog" | "cat"}` | "warranty.field.respiratory" {
  if (species === "dog") return "warranty.field.respiratory.dog";
  if (species === "cat") return "warranty.field.respiratory.cat";
  return "warranty.field.respiratory";
}

export function warrantyInfectiousSummaryKey(
  species: WarrantyFarmSpecies,
):
  | `warranty.viewer.summaryCareParvo.${"dog" | "cat"}`
  | "warranty.viewer.summaryCareParvo" {
  if (species === "dog") return "warranty.viewer.summaryCareParvo.dog";
  if (species === "cat") return "warranty.viewer.summaryCareParvo.cat";
  return "warranty.viewer.summaryCareParvo";
}

export function warrantyRapidTestEvidenceKey(
  species: WarrantyFarmSpecies,
):
  | `warranty.evidence.rapid_test_photo.${"dog" | "cat"}`
  | "warranty.evidence.rapid_test_photo" {
  if (species === "dog") return "warranty.evidence.rapid_test_photo.dog";
  if (species === "cat") return "warranty.evidence.rapid_test_photo.cat";
  return "warranty.evidence.rapid_test_photo";
}

export function warrantyVaccinePlaceholderKey(
  species: WarrantyFarmSpecies,
): `warranty.vaccine.placeholder.${WarrantyFarmSpecies}` {
  return `warranty.vaccine.placeholder.${species}`;
}

export function warrantyVaccinePresetIds(
  species: WarrantyFarmSpecies,
): readonly WarrantyVaccinePresetId[] {
  if (species === "dog") return DOG_PRESET_IDS;
  if (species === "cat") return CAT_PRESET_IDS;
  return [...DOG_PRESET_IDS, ...CAT_PRESET_IDS];
}

export function warrantyVaccinePresetLabelKey(
  id: WarrantyVaccinePresetId,
): `warranty.vaccine.preset.${WarrantyVaccinePresetId}` {
  return `warranty.vaccine.preset.${id}`;
}

/** Append a preset label to free-text vaccineTypes without duplicates. */
export function appendWarrantyVaccinePreset(
  current: string,
  presetLabel: string,
): string {
  const label = presetLabel.trim();
  if (!label) return current;
  const existing = current
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const lower = new Set(existing.map((part) => part.toLowerCase()));
  if (lower.has(label.toLowerCase())) return existing.join(", ");
  return [...existing, label].join(", ");
}
