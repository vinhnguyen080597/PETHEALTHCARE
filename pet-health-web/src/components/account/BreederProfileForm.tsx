"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ApiBreederProfile, Lang } from "@/lib/types";
import { t, type EnKey } from "@/i18n";

const BREEDER_TYPES = [
  "registered_kennel",
  "home_breeder",
  "rescue_foster",
  "rehoming",
  "other",
] as const;
const SPECIES_OPTIONS = ["dog", "cat"] as const;
const SCALE_OPTIONS = ["1_3", "4_10", "11_20", "20_plus"] as const;
const BREEDING_PET_OPTIONS = ["none", "1_3", "4_10", "10_plus"] as const;
const CARE_CHECKLIST = [
  "vaccination_schedule",
  "deworming_schedule",
  "vet_records",
  "environment_media",
  "in_person_meet",
] as const;
const COMMITMENTS = [
  "accurate_information",
  "app_only_verification",
] as const;

const inputCls =
  "w-full px-4 py-2.5 bg-white border border-[#F0E6D8] rounded-xl text-sm text-[#2B1E19] focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-[#D97706]";
/** Extra right padding so the native chevron isn’t flush with the border */
const selectCls =
  "appearance-none w-full pl-4 pr-11 py-2.5 bg-white border border-[#F0E6D8] rounded-xl text-sm text-[#2B1E19] focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-[#D97706]";
const labelCls = "block text-xs font-medium text-[#6E5A51] mb-1.5";

function metaString(meta: Record<string, unknown> | undefined, key: string) {
  const v = meta?.[key];
  return typeof v === "string" ? v : "";
}

function metaArray(meta: Record<string, unknown> | undefined, key: string) {
  const v = meta?.[key];
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : [];
}

function toggle(list: string[], value: string) {
  return list.includes(value)
    ? list.filter((x) => x !== value)
    : [...list, value];
}

function breederStatusLabel(status: string): EnKey {
  const known = [
    "unverified",
    "pending_review",
    "verified",
    "rejected",
    "suspended",
  ];
  const s = known.includes(status) ? status : "unverified";
  return `account.breederRequestStatus.${s}` as EnKey;
}

export function BreederProfileForm({
  lang,
  initial,
}: {
  lang: Lang;
  initial: ApiBreederProfile | null;
}) {
  const router = useRouter();
  const meta = (initial?.metadata || {}) as Record<string, unknown>;

  const [displayName, setDisplayName] = useState(initial?.display_name || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [bio, setBio] = useState(initial?.bio || "");
  const [phone, setPhone] = useState(initial?.contact?.phone || "");
  const [facebook, setFacebook] = useState(initial?.contact?.facebook || "");
  const [zalo, setZalo] = useState(initial?.contact?.zalo || "");
  const [breederType, setBreederType] = useState(
    metaString(meta, "breederType") ||
      metaString(meta, "breeder_type") ||
      "home_breeder",
  );
  const [registeredKennelName, setRegisteredKennelName] = useState(
    metaString(meta, "registeredKennelName") ||
      metaString(meta, "registered_kennel_name"),
  );
  const [registeredAt, setRegisteredAt] = useState(
    metaString(meta, "registeredAt") || metaString(meta, "registered_at"),
  );
  const [scaleRange, setScaleRange] = useState(
    metaString(meta, "scaleRange") ||
      metaString(meta, "scale_range") ||
      "1_3",
  );
  const [breedingPetRange, setBreedingPetRange] = useState(
    metaString(meta, "breedingPetRange") ||
      metaString(meta, "breeding_pet_range") ||
      "none",
  );
  const [primarySpecies, setPrimarySpecies] = useState<string[]>(
    initial?.primary_species?.length
      ? initial.primary_species
      : ["dog", "cat"],
  );
  const [mainBreeds, setMainBreeds] = useState(
    (initial?.main_breeds || []).join(", "),
  );
  const [careChecklist, setCareChecklist] = useState<string[]>(
    metaArray(meta, "careChecklist").length
      ? metaArray(meta, "careChecklist")
      : metaArray(meta, "care_checklist"),
  );
  const [commitments, setCommitments] = useState<string[]>(
    metaArray(meta, "transparencyCommitments").length
      ? metaArray(meta, "transparencyCommitments")
      : metaArray(meta, "transparency_commitments"),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const status = initial?.verification_status || "unverified";
  const isEdit = Boolean(initial?.id);

  const title = useMemo(() => {
    if (isEdit) return t(lang, "breederForm.editTitle");
    return t(lang, "breederForm.createTitle");
  }, [isEdit, lang]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOk("");
    if (
      !commitments.includes("accurate_information") ||
      !commitments.includes("app_only_verification")
    ) {
      setError(t(lang, "breederForm.commitmentsRequired"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/breeder/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          location: location.trim(),
          bio: bio.trim(),
          contact: {
            phone: phone.trim(),
            facebook: facebook.trim(),
            zalo: zalo.trim(),
          },
          primarySpecies,
          mainBreeds: mainBreeds
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          careEnvironment: String(initial?.care_environment || ""),
          metadata: {
            ...meta,
            breederType,
            registeredKennelName:
              breederType === "registered_kennel" ? registeredKennelName : "",
            registeredAt:
              breederType === "registered_kennel" ? registeredAt : "",
            scaleRange,
            breedingPetRange,
            careChecklist,
            transparencyCommitments: commitments,
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || t(lang, "breederForm.saveFailed"));
      }
      setOk(t(lang, "breederForm.saved"));
      router.push("/app/account");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t(lang, "breederForm.saveFailed"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-5 py-10">
      <Link
        href="/app/account"
        className="text-sm text-[#D97706] font-medium hover:text-[#B45309]"
      >
        ← {t(lang, "account.title")}
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[#2B1E19]">{title}</h1>
      <p className="mt-1 text-sm text-[#5C4A3A]">
        {t(lang, "breederForm.subtitle")}
      </p>
      {status !== "unverified" ? (
        <p className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
          {t(lang, breederStatusLabel(status))}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div>
          <label className={labelCls}>{t(lang, "breederForm.displayName")}</label>
          <input
            className={inputCls}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelCls}>{t(lang, "breederForm.location")}</label>
          <input
            className={inputCls}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>{t(lang, "breederForm.phone")}</label>
            <input
              className={inputCls}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelCls}>{t(lang, "breederForm.facebook")}</label>
            <input
              className={inputCls}
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelCls}>{t(lang, "breederForm.zalo")}</label>
            <input
              className={inputCls}
              value={zalo}
              onChange={(e) => setZalo(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>{t(lang, "breederForm.breederType")}</label>
          <select
            className={selectCls}
            value={breederType}
            onChange={(e) => setBreederType(e.target.value)}
          >
            {BREEDER_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(lang, `breederForm.types.${type}`)}
              </option>
            ))}
          </select>
        </div>

        {breederType === "registered_kennel" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                {t(lang, "breederForm.kennelName")}
              </label>
              <input
                className={inputCls}
                value={registeredKennelName}
                onChange={(e) => setRegisteredKennelName(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>
                {t(lang, "breederForm.registeredAt")}
              </label>
              <input
                className={inputCls}
                value={registeredAt}
                onChange={(e) => setRegisteredAt(e.target.value)}
                placeholder="YYYY"
              />
            </div>
          </div>
        ) : null}

        <div>
          <p className={labelCls}>{t(lang, "breederForm.species")}</p>
          <div className="flex flex-wrap gap-2">
            {SPECIES_OPTIONS.map((sp) => {
              const on = primarySpecies.includes(sp);
              return (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setPrimarySpecies(toggle(primarySpecies, sp))}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    on
                      ? "bg-[#D97706] text-white border-[#D97706]"
                      : "bg-white text-[#5C4A3A] border-[#F0E6D8]"
                  }`}
                >
                  {t(lang, `breederForm.speciesOptions.${sp}`)}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={labelCls}>{t(lang, "breederForm.mainBreeds")}</label>
          <input
            className={inputCls}
            value={mainBreeds}
            onChange={(e) => setMainBreeds(e.target.value)}
            placeholder={t(lang, "breederForm.mainBreedsHint")}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t(lang, "breederForm.scale")}</label>
            <select
              className={selectCls}
              value={scaleRange}
              onChange={(e) => setScaleRange(e.target.value)}
            >
              {SCALE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(lang, `breederForm.scaleOptions.${opt}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>
              {t(lang, "breederForm.breedingPets")}
            </label>
            <select
              className={selectCls}
              value={breedingPetRange}
              onChange={(e) => setBreedingPetRange(e.target.value)}
            >
              {BREEDING_PET_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(lang, `breederForm.breedingOptions.${opt}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>{t(lang, "breederForm.bio")}</label>
          <textarea
            className={`${inputCls} min-h-[88px]`}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        <div>
          <p className={labelCls}>{t(lang, "breederForm.careChecklist")}</p>
          <div className="space-y-2">
            {CARE_CHECKLIST.map((item) => (
              <label
                key={item}
                className="flex items-start gap-2 text-sm text-[#2B1E19]"
              >
                <input
                  type="checkbox"
                  className="mt-1 accent-[#D97706]"
                  checked={careChecklist.includes(item)}
                  onChange={() =>
                    setCareChecklist(toggle(careChecklist, item))
                  }
                />
                <span>{t(lang, `breederForm.care.${item}`)}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className={labelCls}>{t(lang, "breederForm.commitments")}</p>
          <div className="space-y-2">
            {COMMITMENTS.map((item) => (
              <label
                key={item}
                className="flex items-start gap-2 text-sm text-[#2B1E19]"
              >
                <input
                  type="checkbox"
                  className="mt-1 accent-[#D97706]"
                  checked={commitments.includes(item)}
                  onChange={() => setCommitments(toggle(commitments, item))}
                />
                <span>{t(lang, `breederForm.commitment.${item}`)}</span>
              </label>
            ))}
          </div>
        </div>

        {error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        ) : null}
        {ok ? (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            {ok}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 rounded-full bg-[#D97706] text-white text-sm font-semibold hover:bg-[#B45309] disabled:opacity-60 shadow-sm shadow-amber-200/60"
        >
          {busy ? t(lang, "common.loading") : t(lang, "breederForm.submit")}
        </button>
      </form>
    </div>
  );
}
