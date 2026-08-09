"use client";

import type { Lang, WarrantyPolicy } from "@/lib/types";
import { t, type EnKey } from "@/i18n";
import {
  formatVaccineShotLabel,
  warrantyCoverageRows,
  warrantyHandoverCards,
  warrantySummaryChips,
  type WarrantyCoverageTone,
  type WarrantyHandoverCardId,
} from "@/lib/warrantyPolicyView";
import { formatDewormingDateLabel } from "@/lib/warrantyPolicyForm";
import {
  resolveWarrantyFarmSpecies,
  warrantyInfectiousSummaryKey,
  warrantyRapidTestEvidenceKey,
  type WarrantyFarmSpecies,
} from "@/lib/warrantySpeciesCopy";

function labelKey(prefix: string, id: string): EnKey {
  return `${prefix}.${id}` as EnKey;
}

const COVERAGE_TONE: Record<
  WarrantyCoverageTone,
  { row: string; badge: string }
> = {
  amber: {
    row: "bg-amber-50/80 border-amber-100",
    badge: "bg-amber-100 text-amber-950 border-amber-200",
  },
  sky: {
    row: "bg-sky-50/70 border-sky-100",
    badge: "bg-sky-100 text-sky-950 border-sky-200",
  },
  violet: {
    row: "bg-violet-50/70 border-violet-100",
    badge: "bg-violet-100 text-violet-950 border-violet-200",
  },
};

function SectionTitle({
  icon,
  children,
}: {
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-[#2B1E19]">
      <span className="text-base" aria-hidden>
        {icon}
      </span>
      <span className="leading-snug">{children}</span>
    </h3>
  );
}

function IconList({
  items,
  variant,
}: {
  items: string[];
  variant: "check" | "cross";
}) {
  if (!items.length) return null;
  const mark = variant === "check" ? "✓" : "✕";
  const markCls =
    variant === "check" ? "text-emerald-600" : "text-rose-600";
  return (
    <ul className="space-y-2">
      {items.map((text, i) => (
        <li key={`${text}-${i}`} className="flex gap-2 text-sm text-[#5C4A3A]">
          <span className={`mt-0.5 shrink-0 font-bold ${markCls}`} aria-hidden>
            {mark}
          </span>
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

function handoverValue(
  lang: Lang,
  policy: WarrantyPolicy,
  id: WarrantyHandoverCardId,
): { label: string; value: string } {
  switch (id) {
    case "vaccine":
      return {
        label: t(lang, "warranty.field.vaccineShots"),
        value: formatVaccineShotLabel(
          t(lang, "warranty.value.shots"),
          Number(policy.vaccineShotsCount) || 0,
          policy.vaccineTypes,
        ),
      };
    case "deworming":
      return {
        label: t(lang, "warranty.field.deworming"),
        value: formatDewormingDateLabel(String(policy.dewormingNote || "")),
      };
    case "healthBook":
      return {
        label: t(lang, "warranty.viewer.healthBookLabel"),
        value: policy.hasHealthBook
          ? t(lang, "warranty.viewer.healthBookYes")
          : t(lang, "warranty.viewer.healthBookNo"),
      };
  }
}

export function WarrantyPolicyViewer({
  lang,
  policy,
  open,
  onClose,
  farmSpecies,
  primarySpecies,
  listingSpecies,
}: {
  lang: Lang;
  policy: WarrantyPolicy | null;
  open: boolean;
  onClose: () => void;
  farmSpecies?: WarrantyFarmSpecies;
  primarySpecies?: string[] | null;
  listingSpecies?: string | null;
}) {
  if (!open || !policy) return null;

  const species =
    farmSpecies ||
    resolveWarrantyFarmSpecies({ primarySpecies, listingSpecies });
  const summary = warrantySummaryChips(policy);
  const handover = warrantyHandoverCards(policy);
  const coverage = warrantyCoverageRows(policy, species);
  const guidelines = (policy.buyerGuidelines || []).map((id) =>
    t(lang, labelKey("warranty.guideline", id)),
  );
  const exclusions = (policy.exclusions || []).map((id) =>
    t(lang, labelKey("warranty.exclusion", id)),
  );
  const evidence = (policy.evidenceRequired || []).map((id) =>
    t(
      lang,
      id === "rapid_test_photo"
        ? (warrantyRapidTestEvidenceKey(species) as EnKey)
        : labelKey("warranty.evidence", id),
    ),
  );

  const remedyItems: string[] = [];
  if (policy.medicalFeeSupportPercent != null) {
    remedyItems.push(
      `${t(lang, "warranty.field.medicalFee")}: ${policy.medicalFeeSupportPercent}%`,
    );
  }
  if (policy.allowEquivalentSwap) {
    remedyItems.push(t(lang, "warranty.field.swap"));
  }
  if (policy.shippingParty) {
    remedyItems.push(
      `${t(lang, "warranty.field.shipping")}: ${t(
        lang,
        labelKey("warranty.shipping", policy.shippingParty),
      )}`,
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={policy.title}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {policy.title}
            </p>
            {policy.frozen ? (
              <p className="text-xs text-amber-700 mt-0.5">
                {t(lang, "warranty.frozenHint")}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            {t(lang, "warranty.close")}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-base font-extrabold uppercase tracking-[0.06em] text-[#D97706]">
              <span className="text-lg" aria-hidden>
                🛡️
              </span>
              {t(lang, "warranty.viewer.healthTitle")}
            </p>
            {summary.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {summary.map((chip) => (
                  <div
                    key={chip.id}
                    className="rounded-xl border border-[#F3E2C8] bg-gradient-to-br from-[#FFFBF5] to-[#FFF7ED] px-3 py-2.5"
                  >
                    <p className="text-sm font-semibold text-[#2B1E19] leading-snug">
                      <span className="mr-1.5" aria-hidden>
                        {chip.icon}
                      </span>
                      {chip.id === "vaccine"
                        ? formatVaccineShotLabel(
                            t(lang, "warranty.value.shots"),
                            chip.shots,
                            chip.vaccineTypes,
                          )
                        : null}
                      {chip.id === "careParvo"
                        ? t(
                            lang,
                            warrantyInfectiousSummaryKey(species) as EnKey,
                          ).replace("{n}", String(chip.days))
                        : null}
                      {chip.id === "medicalFee"
                        ? t(lang, "warranty.viewer.summaryMedicalFee").replace(
                            "{n}",
                            String(chip.percent),
                          )
                        : null}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <section className="space-y-2.5">
            <SectionTitle icon="📌">
              1. {t(lang, "warranty.pillar.handover")}
            </SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {handover.map((card) => {
                const { label, value } = handoverValue(lang, policy, card.id);
                if (!value) return null;
                return (
                  <div
                    key={card.id}
                    className="rounded-xl border border-[#F3E2C8] bg-white px-3 py-2.5"
                  >
                    <p className="text-[11px] font-medium text-[#8A7466] flex items-center gap-1">
                      <span aria-hidden>{card.icon}</span>
                      {label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#2B1E19]">
                      {value}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {coverage.length > 0 ? (
            <section className="space-y-2.5">
              <SectionTitle icon="📌">
                2. {t(lang, "warranty.pillar.coverage")}
              </SectionTitle>
              <div className="space-y-2">
                {coverage.map((row) => {
                  const tone = COVERAGE_TONE[row.tone];
                  return (
                    <div
                      key={row.id}
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border px-3 py-2.5 ${tone.row}`}
                    >
                      <p className="text-sm text-[#5C4A3A]">
                        {t(lang, row.fieldKey as EnKey)}
                      </p>
                      <span
                        className={`inline-flex self-start sm:self-auto items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${tone.badge}`}
                      >
                        ⏱️{" "}
                        {t(lang, "warranty.viewer.coverageBadge").replace(
                          "{n}",
                          String(row.days),
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="space-y-2.5">
            <SectionTitle icon="📌">
              3. {t(lang, "warranty.pillar.buyer")}
            </SectionTitle>
            <div className="rounded-xl border border-[#F3E2C8] bg-[#FFFBF5] p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {policy.reportWithinHours ? (
                  <div className="rounded-lg bg-white border border-[#F3E2C8] px-3 py-2">
                    <p className="text-[11px] font-medium text-[#8A7466]">
                      ⏱️ {t(lang, "warranty.field.reportHours")}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[#2B1E19]">
                      {t(lang, "warranty.viewer.withinHours").replace(
                        "{n}",
                        String(policy.reportWithinHours),
                      )}
                    </p>
                  </div>
                ) : null}
                {policy.vetRequirement ? (
                  <div className="rounded-lg bg-white border border-[#F3E2C8] px-3 py-2">
                    <p className="text-[11px] font-medium text-[#8A7466]">
                      🏥 {t(lang, "warranty.field.vet")}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[#2B1E19]">
                      {t(lang, labelKey("warranty.vet", policy.vetRequirement))}
                    </p>
                  </div>
                ) : null}
              </div>
              {guidelines.length > 0 ? (
                <>
                  <div className="border-t border-[#F3E2C8]" />
                  <IconList items={guidelines} variant="check" />
                </>
              ) : null}
            </div>
          </section>

          {exclusions.length > 0 ? (
            <section className="space-y-2.5">
              <SectionTitle icon="❌">
                4. {t(lang, "warranty.pillar.exclusions")}
              </SectionTitle>
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
                <IconList items={exclusions} variant="cross" />
              </div>
            </section>
          ) : null}

          {remedyItems.length > 0 ? (
            <section className="space-y-2.5">
              <SectionTitle icon="🤝">
                5. {t(lang, "warranty.pillar.remedies")}
              </SectionTitle>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                <IconList items={remedyItems} variant="check" />
              </div>
            </section>
          ) : null}

          {evidence.length > 0 || policy.breederResponseHours ? (
            <section className="space-y-2.5">
              <SectionTitle icon="📋">
                6. {t(lang, "warranty.pillar.claim")}
              </SectionTitle>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-3">
                {policy.breederResponseHours ? (
                  <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                    <p className="text-[11px] font-medium text-[#8A7466]">
                      ⏱️ {t(lang, "warranty.field.responseHours")}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[#2B1E19]">
                      {t(lang, "warranty.value.hours").replace(
                        "{n}",
                        String(policy.breederResponseHours),
                      )}
                    </p>
                  </div>
                ) : null}
                <IconList items={evidence} variant="check" />
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
