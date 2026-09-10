import type { WarrantyPolicy } from "@/lib/types";
import {
  warrantyInfectiousFieldKey,
  warrantyRespiratoryFieldKey,
  type WarrantyFarmSpecies,
} from "./warrantySpeciesCopy";

export type WarrantySummaryChip =
  | { id: "vaccine"; icon: "💉"; shots: number; vaccineTypes: string }
  | { id: "careParvo"; icon: "🦠"; days: number }
  | { id: "medicalFee"; icon: "🏥"; percent: number };

export type WarrantyHandoverCardId = "vaccine" | "deworming" | "healthBook";

export type WarrantyHandoverCard = {
  id: WarrantyHandoverCardId;
  icon: string;
};

export type WarrantyCoverageTone = "amber" | "sky" | "violet";

export type WarrantyCoverageRow = {
  id: "careParvo" | "respiratory" | "congenital";
  fieldKey: string;
  days: number;
  tone: WarrantyCoverageTone;
};

/** Top summary chips for quick scan (vaccine / Care-Parvo / medical fee). */
export function warrantySummaryChips(
  policy: Pick<
    WarrantyPolicy,
    | "vaccineShotsCount"
    | "vaccineTypes"
    | "careParvoCoverageDays"
    | "medicalFeeSupportPercent"
  >,
): WarrantySummaryChip[] {
  const chips: WarrantySummaryChip[] = [];
  const shots = Number(policy.vaccineShotsCount) || 0;
  if (shots > 0) {
    chips.push({
      id: "vaccine",
      icon: "💉",
      shots,
      vaccineTypes: String(policy.vaccineTypes || "").trim(),
    });
  }
  const careDays = Number(policy.careParvoCoverageDays) || 0;
  if (careDays > 0) {
    chips.push({ id: "careParvo", icon: "🦠", days: careDays });
  }
  if (
    policy.medicalFeeSupportPercent != null &&
    Number.isFinite(Number(policy.medicalFeeSupportPercent))
  ) {
    chips.push({
      id: "medicalFee",
      icon: "🏥",
      percent: Number(policy.medicalFeeSupportPercent),
    });
  }
  return chips;
}

/** Handover 2×2 cards from structured fields. */
export function warrantyHandoverCards(
  policy: Pick<
    WarrantyPolicy,
    "vaccineShotsCount" | "vaccineTypes" | "dewormingNote" | "hasHealthBook"
  >,
): WarrantyHandoverCard[] {
  const cards: WarrantyHandoverCard[] = [];
  if (Number(policy.vaccineShotsCount) > 0) {
    cards.push({ id: "vaccine", icon: "💉" });
  }
  if (String(policy.dewormingNote || "").trim()) {
    cards.push({ id: "deworming", icon: "🪱" });
  }
  cards.push({ id: "healthBook", icon: "📘" });
  return cards;
}

/** Coverage rows with tone for badge styling. */
export function warrantyCoverageRows(
  policy: Pick<
    WarrantyPolicy,
    | "careParvoCoverageDays"
    | "respiratorySkinCoverageDays"
    | "congenitalCoverageDays"
  >,
  species: WarrantyFarmSpecies = "mixed",
): WarrantyCoverageRow[] {
  const rows: WarrantyCoverageRow[] = [];
  const care = Number(policy.careParvoCoverageDays) || 0;
  if (care > 0) {
    rows.push({
      id: "careParvo",
      fieldKey: warrantyInfectiousFieldKey(species),
      days: care,
      tone: "amber",
    });
  }
  const resp = Number(policy.respiratorySkinCoverageDays) || 0;
  if (resp > 0) {
    rows.push({
      id: "respiratory",
      fieldKey: warrantyRespiratoryFieldKey(species),
      days: resp,
      tone: "sky",
    });
  }
  const cong = Number(policy.congenitalCoverageDays) || 0;
  if (cong > 0) {
    rows.push({
      id: "congenital",
      fieldKey: "warranty.field.congenital",
      days: cong,
      tone: "violet",
    });
  }
  return rows;
}

/** Display "2 Mũi (Zoetis)" style vaccine line. */
export function formatVaccineShotLabel(
  shotsTemplate: string,
  shots: number,
  vaccineTypes?: string,
): string {
  const base = shotsTemplate.replace("{n}", String(shots));
  const types = String(vaccineTypes || "").trim();
  return types ? `${base} (${types})` : base;
}

/** http(s) file URL for uploaded warranty documents; otherwise null. */
export function warrantyUploadedFileHref(url: unknown): string | null {
  const trimmed = String(url ?? "").trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

type WarrantyFileSource = {
  id?: string;
  title?: string;
  fileUrl?: string;
  file_url?: string;
} | null | undefined;

/** Restore the uploaded file URL when the listing DTO only has form defaults. */
export function fillListingWarrantyFileUrl(
  policy: WarrantyFileSource,
  sources: {
    boundFileUrl?: unknown;
    library?: WarrantyFileSource[];
  } = {},
): string {
  const fromPolicy = warrantyUploadedFileHref(policy?.fileUrl ?? policy?.file_url);
  if (fromPolicy) return fromPolicy;
  const fromBound = warrantyUploadedFileHref(sources.boundFileUrl);
  if (fromBound) return fromBound;
  const library = Array.isArray(sources.library) ? sources.library.filter(Boolean) : [];
  const fileOf = (row: WarrantyFileSource) =>
    warrantyUploadedFileHref(row?.fileUrl ?? row?.file_url);
  const id = String(policy?.id ?? "").trim();
  const title = String(policy?.title ?? "")
    .trim()
    .toLowerCase();
  const byId = library.find((row) => String(row?.id ?? "").trim() === id);
  const fromId = fileOf(byId);
  if (fromId) return fromId;
  if (title) {
    const byTitle = library.find(
      (row) => fileOf(row) && String(row?.title ?? "").trim().toLowerCase() === title,
    );
    const fromTitle = fileOf(byTitle);
    if (fromTitle) return fromTitle;
  }
  const files = library.map(fileOf).filter((href): href is string => Boolean(href));
  return files.length === 1 ? files[0] : "";
}
