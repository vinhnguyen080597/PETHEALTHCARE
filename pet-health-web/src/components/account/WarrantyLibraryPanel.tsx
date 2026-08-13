"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Lang, WarrantyPolicy } from "@/lib/types";
import { t, type EnKey } from "@/i18n";
import { WarrantyPolicyViewer } from "@/components/marketplace/WarrantyPolicyViewer";
import { mapWarrantyPolicy } from "@/lib/mappers";
import { farmDetailHref, warrantySaveNextHref } from "@/lib/farmTabs";
import { DialogActions } from "@/components/ui/DialogActions";
import { scrollFieldIntoView } from "@/lib/formFocus";
import {
  BUYER_GUIDELINE_OPTIONS,
  CARE_PARVO_DAY_OPTIONS,
  CONGENITAL_DAY_OPTIONS,
  defaultWarrantyFormValues,
  EVIDENCE_OPTIONS,
  EXCLUSION_OPTIONS,
  MEDICAL_FEE_OPTIONS,
  REPORT_HOUR_OPTIONS,
  RESPIRATORY_DAY_OPTIONS,
  RESPONSE_HOUR_OPTIONS,
  toggleIdInList,
  VACCINE_SHOT_OPTIONS,
  warrantyFormToApiBody,
  warrantyPolicyToFormValues,
  todayDateInputValue,
  type WarrantyPolicyFormValues,
} from "@/lib/warrantyPolicyForm";
import {
  appendWarrantyVaccinePreset,
  resolveWarrantyFarmSpecies,
  warrantyInfectiousFieldKey,
  warrantyRapidTestEvidenceKey,
  warrantyRespiratoryFieldKey,
  warrantyVaccinePlaceholderKey,
  warrantyVaccinePresetIds,
  warrantyVaccinePresetLabelKey,
} from "@/lib/warrantySpeciesCopy";

const WARRANTY_TITLE_FIELD_ID = "warranty-policy-title";

const inputCls =
  "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D97706]/20 focus:border-[#D97706]";
const inputErrorCls =
  "border-red-400 focus:border-red-400 focus:ring-red-500/10";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-[#6E5A51] space-y-1">
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
      {message}
    </p>
  );
}

function RequiredMark() {
  return (
    <span className="text-red-500 font-semibold" aria-hidden>
      {" "}
      *
    </span>
  );
}

function ChecklistGroup<T extends string>({
  lang,
  titleKey,
  options,
  selected,
  onToggle,
  prefix,
  labelForId,
}: {
  lang: Lang;
  titleKey: EnKey;
  options: readonly T[];
  selected: T[];
  onToggle: (id: T) => void;
  prefix: string;
  labelForId?: (id: T) => string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[#2B1E19]">{t(lang, titleKey)}</p>
      <div className="space-y-1.5">
        {options.map((id) => (
          <label
            key={id}
            className="flex items-start gap-2 text-sm text-[#5C4A3A]"
          >
            <input
              type="checkbox"
              className="mt-1 accent-[#D97706]"
              checked={selected.includes(id)}
              onChange={() => onToggle(id)}
            />
            <span>
              {labelForId
                ? labelForId(id)
                : t(lang, `${prefix}.${id}` as EnKey)}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function WarrantyLibraryPanel({
  lang,
  initialPolicies,
  trustAwarded,
  profileId,
  primarySpecies = [],
  editPolicyId = null,
}: {
  lang: Lang;
  initialPolicies: WarrantyPolicy[];
  trustAwarded: boolean;
  profileId: string;
  primarySpecies?: string[];
  editPolicyId?: string | null;
}) {
  const router = useRouter();
  const farmSpecies = resolveWarrantyFarmSpecies({ primarySpecies });
  const vaccinePresets = warrantyVaccinePresetIds(farmSpecies);
  const [policies, setPolicies] = useState(initialPolicies);
  const [editingId, setEditingId] = useState<string | null>(editPolicyId);
  const [form, setForm] = useState<WarrantyPolicyFormValues>(() => {
    if (!editPolicyId) return defaultWarrantyFormValues();
    const found = initialPolicies.find((p) => p.id === editPolicyId);
    return found
      ? warrantyPolicyToFormValues(found)
      : defaultWarrantyFormValues();
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [viewing, setViewing] = useState<WarrantyPolicy | null>(null);
  const [askCreateAnother, setAskCreateAnother] = useState(false);
  const [trustAwardedOnSave, setTrustAwardedOnSave] = useState(false);

  useEffect(() => {
    setPolicies(initialPolicies);
  }, [initialPolicies]);

  useEffect(() => {
    if (!editPolicyId) return;
    const found = initialPolicies.find((p) => p.id === editPolicyId);
    if (!found) return;
    setEditingId(editPolicyId);
    setForm(warrantyPolicyToFormValues(found));
  }, [editPolicyId, initialPolicies]);

  const setField = <K extends keyof WarrantyPolicyFormValues>(
    key: K,
    value: WarrantyPolicyFormValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "title") setTitleError("");
  };

  const clearEdit = () => {
    setEditingId(null);
    setForm(defaultWarrantyFormValues());
    setTitleError("");
    setError("");
    router.replace("/app/account/warranty");
  };

  const startEdit = (policy: WarrantyPolicy) => {
    setEditingId(policy.id);
    setForm(warrantyPolicyToFormValues(policy));
    setTitleError("");
    setError("");
    router.replace(`/app/account/warranty?edit=${encodeURIComponent(policy.id)}`);
    requestAnimationFrame(() => {
      scrollFieldIntoView(document.getElementById(WARRANTY_TITLE_FIELD_ID));
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setTitleError(t(lang, "warranty.library.formRequired"));
      setError("");
      requestAnimationFrame(() => {
        scrollFieldIntoView(document.getElementById(WARRANTY_TITLE_FIELD_ID));
      });
      return;
    }
    setBusy(true);
    setError("");
    setTitleError("");
    try {
      if (editingId) {
        const res = await fetch(
          `/api/warranty-policies/${encodeURIComponent(editingId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(warrantyFormToApiBody(form)),
          },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed");
        const updated = mapWarrantyPolicy(data.data);
        if (updated) {
          setPolicies((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p)),
          );
        }
        setEditingId(null);
        setForm(defaultWarrantyFormValues());
        router.push(farmDetailHref(profileId, "warranty"));
        router.refresh();
        return;
      }

      const res = await fetch("/api/warranty-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(warrantyFormToApiBody(form)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      const created = mapWarrantyPolicy(data.data);
      if (created) setPolicies((prev) => [...prev, created]);
      setForm(defaultWarrantyFormValues());
      setTrustAwardedOnSave(Boolean(data.trust_awarded));
      setAskCreateAnother(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const onCreateAnotherChoice = (createAnother: boolean) => {
    setAskCreateAnother(false);
    setTrustAwardedOnSave(false);
    const next = warrantySaveNextHref(createAnother, profileId);
    if (next) {
      router.push(next);
      router.refresh();
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm(t(lang, "warranty.library.deleteConfirm"))) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/warranty-policies/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      setPolicies((prev) => prev.filter((p) => p.id !== id));
      if (editingId === id) clearEdit();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#F3E2C8] rounded-2xl p-5">
        <h1 className="text-lg font-bold text-[#2B1E19]">
          {t(lang, "warranty.library.title")}
        </h1>
        <p className="text-sm text-[#6E5A51] mt-1 leading-relaxed">
          {t(lang, "warranty.library.subtitle")}
        </p>
        {!trustAwarded ? (
          <p className="mt-3 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            {t(lang, "warranty.library.trustHint")}
          </p>
        ) : (
          <p className="mt-3 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            {t(lang, "warranty.library.trustDone")}
          </p>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="bg-white border border-[#F3E2C8] rounded-2xl p-5 space-y-5"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[#2B1E19]">
            {editingId
              ? t(lang, "warranty.library.edit")
              : t(lang, "warranty.library.add")}
          </h2>
          {editingId ? (
            <button
              type="button"
              onClick={clearEdit}
              className="text-xs font-medium text-[#6E5A51] hover:underline"
            >
              {t(lang, "warranty.library.cancelEdit")}
            </button>
          ) : null}
        </div>

        <FieldLabel>
          <span>
            {t(lang, "warranty.library.name")}
            <RequiredMark />
          </span>
          <input
            id={WARRANTY_TITLE_FIELD_ID}
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            className={`${inputCls} ${titleError ? inputErrorCls : ""}`}
            maxLength={160}
            aria-invalid={Boolean(titleError)}
            aria-describedby={titleError ? "warranty-title-error" : undefined}
          />
          <span id="warranty-title-error">
            <FieldError message={titleError} />
          </span>
        </FieldLabel>

        <div className="rounded-xl border border-[#F3E2C8] p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[#B45309]">
            1. {t(lang, "warranty.pillar.handover")}
          </p>
          <FieldLabel>
            {t(lang, "warranty.field.vaccineShots")}
            <div className="flex gap-3 pt-1">
              {VACCINE_SHOT_OPTIONS.map((n) => (
                <label key={n} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="vaccineShots"
                    checked={form.vaccineShotsCount === n}
                    onChange={() => setField("vaccineShotsCount", n)}
                    className="accent-[#D97706]"
                  />
                  {t(lang, "warranty.value.shots").replace("{n}", String(n))}
                </label>
              ))}
            </div>
          </FieldLabel>
          <FieldLabel>
            {t(lang, "warranty.field.vaccineTypes")}
            <input
              value={form.vaccineTypes}
              onChange={(e) => setField("vaccineTypes", e.target.value)}
              className={inputCls}
              placeholder={t(
                lang,
                warrantyVaccinePlaceholderKey(farmSpecies) as EnKey,
              )}
            />
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {vaccinePresets.map((id) => {
                const label = t(
                  lang,
                  warrantyVaccinePresetLabelKey(id) as EnKey,
                );
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setField(
                        "vaccineTypes",
                        appendWarrantyVaccinePreset(form.vaccineTypes, label),
                      )
                    }
                    className="rounded-full border border-[#E8DFD0] bg-[#FDF8F0] px-2.5 py-1 text-[11px] font-medium text-[#5C4A3A] hover:border-[#D97706] hover:text-[#B45309]"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </FieldLabel>
          <FieldLabel>
            {t(lang, "warranty.field.deworming")}
            <input
              type="date"
              value={form.dewormingNote}
              max={todayDateInputValue()}
              onChange={(e) => setField("dewormingNote", e.target.value)}
              className={inputCls}
            />
          </FieldLabel>
          <label className="flex items-center gap-2 text-sm text-[#5C4A3A]">
            <input
              type="checkbox"
              className="accent-[#D97706]"
              checked={form.hasHealthBook}
              onChange={(e) => setField("hasHealthBook", e.target.checked)}
            />
            {t(lang, "warranty.field.healthBook")}
          </label>
        </div>

        <div className="rounded-xl border border-[#F3E2C8] p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[#B45309]">
            2. {t(lang, "warranty.pillar.coverage")}
          </p>
          <FieldLabel>
            {t(lang, warrantyInfectiousFieldKey(farmSpecies) as EnKey)}
            <select
              className={inputCls}
              value={form.careParvoCoverageDays}
              onChange={(e) =>
                setField(
                  "careParvoCoverageDays",
                  Number(e.target.value) as 7 | 14 | 30,
                )
              }
            >
              {CARE_PARVO_DAY_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {t(lang, "warranty.value.days").replace("{n}", String(n))}
                </option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel>
            {t(lang, warrantyRespiratoryFieldKey(farmSpecies) as EnKey)}
            <select
              className={inputCls}
              value={form.respiratorySkinCoverageDays}
              onChange={(e) =>
                setField(
                  "respiratorySkinCoverageDays",
                  Number(e.target.value) as 3 | 7,
                )
              }
            >
              {RESPIRATORY_DAY_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {t(lang, "warranty.value.days").replace("{n}", String(n))}
                </option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel>
            {t(lang, "warranty.field.congenital")}
            <select
              className={inputCls}
              value={form.congenitalCoverageDays}
              onChange={(e) =>
                setField(
                  "congenitalCoverageDays",
                  Number(e.target.value) as 30 | 60 | 90,
                )
              }
            >
              {CONGENITAL_DAY_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {t(lang, "warranty.value.days").replace("{n}", String(n))}
                </option>
              ))}
            </select>
          </FieldLabel>
        </div>

        <div className="rounded-xl border border-[#F3E2C8] p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[#B45309]">
            3. {t(lang, "warranty.pillar.buyer")}
          </p>
          <FieldLabel>
            {t(lang, "warranty.field.reportHours")}
            <select
              className={inputCls}
              value={form.reportWithinHours}
              onChange={(e) =>
                setField("reportWithinHours", Number(e.target.value) as 12 | 24)
              }
            >
              {REPORT_HOUR_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {t(lang, "warranty.value.hours").replace("{n}", String(n))}
                </option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel>
            {t(lang, "warranty.field.vet")}
            <select
              className={inputCls}
              value={form.vetRequirement}
              onChange={(e) =>
                setField(
                  "vetRequirement",
                  e.target.value as WarrantyPolicyFormValues["vetRequirement"],
                )
              }
            >
              <option value="licensed">{t(lang, "warranty.vet.licensed")}</option>
              <option value="farm_designated">
                {t(lang, "warranty.vet.farm_designated")}
              </option>
              <option value="either">{t(lang, "warranty.vet.either")}</option>
            </select>
          </FieldLabel>
          <ChecklistGroup
            lang={lang}
            titleKey="warranty.field.guidelines"
            options={BUYER_GUIDELINE_OPTIONS}
            selected={form.buyerGuidelines}
            prefix="warranty.guideline"
            onToggle={(id) =>
              setField(
                "buyerGuidelines",
                toggleIdInList(form.buyerGuidelines, id),
              )
            }
          />
        </div>

        <div className="rounded-xl border border-[#F3E2C8] p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[#B45309]">
            4. {t(lang, "warranty.pillar.exclusions")}
          </p>
          <ChecklistGroup
            lang={lang}
            titleKey="warranty.field.exclusions"
            options={EXCLUSION_OPTIONS}
            selected={form.exclusions}
            prefix="warranty.exclusion"
            onToggle={(id) =>
              setField("exclusions", toggleIdInList(form.exclusions, id))
            }
          />
        </div>

        <div className="rounded-xl border border-[#F3E2C8] p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[#B45309]">
            5. {t(lang, "warranty.pillar.remedies")}
          </p>
          <FieldLabel>
            {t(lang, "warranty.field.medicalFee")}
            <select
              className={inputCls}
              value={form.medicalFeeSupportPercent}
              onChange={(e) =>
                setField(
                  "medicalFeeSupportPercent",
                  Number(e.target.value) as 0 | 30 | 50 | 100,
                )
              }
            >
              {MEDICAL_FEE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}%
                </option>
              ))}
            </select>
          </FieldLabel>
          <label className="flex items-center gap-2 text-sm text-[#5C4A3A]">
            <input
              type="checkbox"
              className="accent-[#D97706]"
              checked={form.allowEquivalentSwap}
              onChange={(e) => setField("allowEquivalentSwap", e.target.checked)}
            />
            {t(lang, "warranty.field.swap")}
          </label>
          <FieldLabel>
            {t(lang, "warranty.field.shipping")}
            <select
              className={inputCls}
              value={form.shippingParty}
              onChange={(e) =>
                setField(
                  "shippingParty",
                  e.target.value as WarrantyPolicyFormValues["shippingParty"],
                )
              }
            >
              <option value="buyer">{t(lang, "warranty.shipping.buyer")}</option>
              <option value="breeder">
                {t(lang, "warranty.shipping.breeder")}
              </option>
              <option value="split">{t(lang, "warranty.shipping.split")}</option>
            </select>
          </FieldLabel>
        </div>

        <div className="rounded-xl border border-[#F3E2C8] p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[#B45309]">
            6. {t(lang, "warranty.pillar.claim")}
          </p>
          <ChecklistGroup
            lang={lang}
            titleKey="warranty.field.evidence"
            options={EVIDENCE_OPTIONS}
            selected={form.evidenceRequired}
            prefix="warranty.evidence"
            labelForId={(id) =>
              t(
                lang,
                id === "rapid_test_photo"
                  ? (warrantyRapidTestEvidenceKey(farmSpecies) as EnKey)
                  : (`warranty.evidence.${id}` as EnKey),
              )
            }
            onToggle={(id) =>
              setField(
                "evidenceRequired",
                toggleIdInList(form.evidenceRequired, id),
              )
            }
          />
          <FieldLabel>
            {t(lang, "warranty.field.responseHours")}
            <select
              className={inputCls}
              value={form.breederResponseHours}
              onChange={(e) =>
                setField(
                  "breederResponseHours",
                  Number(e.target.value) as 12 | 24,
                )
              }
            >
              {RESPONSE_HOUR_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {t(lang, "warranty.value.hours").replace("{n}", String(n))}
                </option>
              ))}
            </select>
          </FieldLabel>
        </div>

        {error ? (
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2.5 bg-[#D97706] text-white text-sm font-semibold rounded-xl hover:bg-[#B45309] disabled:opacity-60"
        >
          {busy
            ? "…"
            : editingId
              ? t(lang, "warranty.library.update")
              : t(lang, "warranty.library.save")}
        </button>
      </form>

      <div className="bg-white border border-[#F3E2C8] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-[#2B1E19] mb-3">
          {t(lang, "warranty.library.list")}
        </h2>
        {policies.length === 0 ? (
          <p className="text-sm text-[#6E5A51]">{t(lang, "warranty.library.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {policies.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5"
              >
                <button
                  type="button"
                  onClick={() => setViewing(p)}
                  className="text-left min-w-0"
                >
                  <p className="text-sm font-medium text-[#2B1E19] truncate">
                    {p.title}
                  </p>
                  <p className="text-xs text-[#6E5A51]">
                    {p.careParvoCoverageDays
                      ? t(lang, warrantyInfectiousFieldKey(farmSpecies) as EnKey) +
                        `: ${p.careParvoCoverageDays}d · `
                      : ""}
                    {t(lang, "warranty.library.view")}
                  </p>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => startEdit(p)}
                  className="text-xs font-medium text-[#D97706] hover:underline disabled:opacity-50"
                >
                  {t(lang, "farm.warranty.update")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onDelete(p.id)}
                  className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                >
                  {t(lang, "warranty.library.delete")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <WarrantyPolicyViewer
        lang={lang}
        policy={viewing}
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        farmSpecies={farmSpecies}
      />

      {askCreateAnother ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="warranty-save-success-title"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 sm:p-7 w-full max-w-md border border-[#F3E2C8] text-center">
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 text-2xl"
              aria-hidden
            >
              🎉
            </div>
            <h2
              id="warranty-save-success-title"
              className="text-lg font-bold text-[#2B1E19]"
            >
              {t(lang, "warranty.library.createAnotherTitle")}
            </h2>
            <p className="mt-2 text-sm text-[#6E5A51] leading-relaxed" role="status">
              {t(lang, "warranty.library.createAnotherBody")}
            </p>
            {trustAwardedOnSave ? (
              <p className="mt-2 text-xs font-semibold text-emerald-700">
                {t(lang, "warranty.library.trustAwarded")}
              </p>
            ) : null}
            <DialogActions>
              <button
                type="button"
                onClick={() => onCreateAnotherChoice(false)}
                className="flex-1 py-2.5 border border-[#F3E2C8] bg-[#FDFBF7] text-[#6E5A51] text-sm font-semibold rounded-full hover:bg-[#FFF8EF]"
              >
                {t(lang, "warranty.library.createAnotherDone")}
              </button>
              <button
                type="button"
                onClick={() => onCreateAnotherChoice(true)}
                className="flex-1 py-2.5 bg-[#D97706] text-white text-sm font-semibold rounded-full hover:bg-[#B45309]"
              >
                {t(lang, "warranty.library.createAnotherCreate")}
              </button>
            </DialogActions>
          </div>
        </div>
      ) : null}
    </div>
  );
}
