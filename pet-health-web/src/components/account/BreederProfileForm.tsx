"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ApiBreederProfile, Lang } from "@/lib/types";
import { t, type EnKey } from "@/i18n";
import {
  coverUrlFromMetadata,
  DEFAULT_BREEDER_AVATAR_PATH,
  DEFAULT_BREEDER_COVER_PATH,
  resolveBreederAvatarUrl,
  resolveBreederCoverUrl,
} from "@/lib/breederProfileImages";
import { LISTING_SPECIES } from "@/lib/listingFormOptions";
import {
  hasAllBreederCommitments,
  setBreederCommitmentsAccepted,
} from "@/lib/breederCommitments";

const BREEDER_TYPES = [
  "registered_kennel",
  "home_breeder",
  "rescue_foster",
  "rehoming",
  "other",
] as const;
const SPECIES_OPTIONS = LISTING_SPECIES;
const SCALE_OPTIONS = ["1_3", "4_10", "11_20", "20_plus"] as const;
const BREEDING_PET_OPTIONS = ["none", "1_3", "4_10", "10_plus"] as const;
const CARE_CHECKLIST = [
  "vaccination_schedule",
  "deworming_schedule",
  "vet_records",
  "environment_media",
  "in_person_meet",
] as const;

const inputCls =
  "w-full px-4 py-2.5 bg-white border border-[#F0E6D8] rounded-xl text-sm text-[#2B1E19] focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-[#D97706]";
/** Extra right padding so the native chevron isn’t flush with the border */
const selectCls =
  "appearance-none w-full pl-4 pr-11 py-2.5 bg-white border border-[#F0E6D8] rounded-xl text-sm text-[#2B1E19] focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-[#D97706]";
const inputErrorCls =
  "border-red-400 focus:border-red-400 focus:ring-red-500/10";
const labelCls = "block text-xs font-medium text-[#6E5A51] mb-1.5";

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
    initial?.primary_species?.length ? initial.primary_species : [],
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
  const [avatarUrl, setAvatarUrl] = useState(
    resolveBreederAvatarUrl(initial?.avatar_url),
  );
  const [coverUrl, setCoverUrl] = useState(
    resolveBreederCoverUrl(coverUrlFromMetadata(meta)),
  );
  const [uploadBusy, setUploadBusy] = useState<"avatar" | "cover" | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const pendingPhotoRef = useRef<{ kind: "avatar" | "cover"; url: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    displayName?: string;
    location?: string;
    phone?: string;
    facebook?: string;
    zalo?: string;
    species?: string;
  }>({});

  const status = initial?.verification_status || "unverified";
  const isEdit = Boolean(initial?.id);
  const rejectionReason = metaString(meta, "rejection_reason");
  const rejectionAction = metaString(meta, "admin_action");
  const rejectionNote = metaString(meta, "admin_note");

  const clearFieldError = (key: keyof typeof fieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const title = useMemo(() => {
    if (isEdit) return t(lang, "breederForm.editTitle");
    return t(lang, "breederForm.createTitle");
  }, [isEdit, lang]);

  const finishPhotoLoad = (kind: "avatar" | "cover") => {
    if (pendingPhotoRef.current?.kind !== kind) return;
    pendingPhotoRef.current = null;
    setUploadBusy(null);
  };

  const uploadPhoto = async (kind: "avatar" | "cover", file: File) => {
    setError("");
    setUploadBusy(kind);
    pendingPhotoRef.current = null;
    try {
      const fd = new FormData();
      fd.append("kind", kind);
      // Form saves URLs on submit — don't persist mid-edit unless editing existing.
      fd.append("persist", isEdit ? "1" : "0");
      fd.append("file", file, file.name || `${kind}.jpg`);
      const res = await fetch("/api/breeder/upload", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        data?: { publicUrl?: string };
      };
      if (!res.ok || !data.data?.publicUrl) {
        throw new Error(data.error || t(lang, "breederForm.uploadFailed"));
      }
      const publicUrl = data.data.publicUrl;
      if (
        publicUrl.startsWith("memory://") ||
        publicUrl.startsWith("storage://")
      ) {
        throw new Error(t(lang, "breederForm.uploadFailed"));
      }
      pendingPhotoRef.current = { kind, url: publicUrl };
      if (kind === "avatar") setAvatarUrl(publicUrl);
      else setCoverUrl(publicUrl);
      // Keep uploadBusy until the preview <img> finishes loading.
    } catch (err) {
      pendingPhotoRef.current = null;
      setUploadBusy(null);
      setError(
        err instanceof Error ? err.message : t(lang, "breederForm.uploadFailed"),
      );
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOk("");
    const nextErrors: typeof fieldErrors = {};
    if (!displayName.trim()) {
      nextErrors.displayName = t(lang, "breederForm.field.displayNameRequired");
    }
    if (!location.trim()) {
      nextErrors.location = t(lang, "breederForm.field.locationRequired");
    }
    if (!phone.trim()) {
      nextErrors.phone = t(lang, "breederForm.field.phoneRequired");
    }
    if (!facebook.trim()) {
      nextErrors.facebook = t(lang, "breederForm.field.facebookRequired");
    }
    if (!zalo.trim()) {
      nextErrors.zalo = t(lang, "breederForm.field.zaloRequired");
    }
    if (primarySpecies.length === 0) {
      nextErrors.species = t(lang, "breederForm.field.speciesRequired");
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});
    if (!hasAllBreederCommitments(commitments)) {
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
          avatarUrl:
            avatarUrl && avatarUrl !== DEFAULT_BREEDER_AVATAR_PATH
              ? avatarUrl
              : undefined,
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
            ...(coverUrl && coverUrl !== DEFAULT_BREEDER_COVER_PATH
              ? {
                  cover_url: coverUrl,
                  coverUrl,
                  coverImageUrl: coverUrl,
                }
              : {}),
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
      {status === "rejected" && (rejectionReason || rejectionAction || rejectionNote) ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-900">
          <p className="font-semibold">{t(lang, "breederForm.rejectionBannerTitle")}</p>
          {rejectionReason ? (
            <p className="mt-2">
              <span className="font-medium">{t(lang, "breederForm.rejectionReason")}: </span>
              {rejectionReason}
            </p>
          ) : null}
          {rejectionAction ? (
            <p className="mt-1.5">
              <span className="font-medium">{t(lang, "breederForm.rejectionAction")}: </span>
              {rejectionAction}
            </p>
          ) : null}
          {rejectionNote ? (
            <p className="mt-1.5">
              <span className="font-medium">{t(lang, "breederForm.rejectionNote")}: </span>
              {rejectionNote}
            </p>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        <div className="rounded-2xl border border-[#F0E6D8] bg-[#FDFBF7] p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-[#2B1E19]">
              {t(lang, "breederForm.photos")}
            </p>
            <p className="text-xs text-[#6E5A51] mt-1">
              {t(lang, "breederForm.photosHint")}
            </p>
          </div>

          <div>
            <label className={labelCls}>{t(lang, "breederForm.cover")}</label>
            <div className="relative h-36 sm:h-44 overflow-hidden rounded-xl border border-[#F0E6D8] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={coverUrl || DEFAULT_BREEDER_COVER_PATH}
                src={coverUrl || DEFAULT_BREEDER_COVER_PATH}
                alt=""
                className="w-full h-full object-cover"
                onLoad={() => finishPhotoLoad("cover")}
                onError={() => {
                  if (pendingPhotoRef.current?.kind === "cover") {
                    pendingPhotoRef.current = null;
                    setUploadBusy(null);
                    setError(t(lang, "breederForm.uploadFailed"));
                  }
                }}
              />
              {uploadBusy === "cover" ? (
                <div
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/45"
                  role="status"
                  aria-live="polite"
                >
                  <span className="inline-block w-8 h-8 rounded-full border-[3px] border-white/35 border-t-white animate-spin" />
                  <span className="text-white text-xs font-medium">
                    {t(lang, "breederForm.uploadingPhoto")}
                  </span>
                </div>
              ) : null}
              <button
                type="button"
                disabled={busy || uploadBusy !== null}
                onClick={() => coverInputRef.current?.click()}
                className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-white/95 text-[#B45309] text-xs font-semibold border border-amber-200 disabled:opacity-60"
              >
                {t(lang, "breederForm.changePhoto")}
              </button>
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadPhoto("cover", file);
              }}
            />
          </div>

          <div className="flex items-end gap-4">
            <div>
              <label className={labelCls}>{t(lang, "breederForm.avatar")}</label>
              <div className="relative w-24 h-24">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={avatarUrl || DEFAULT_BREEDER_AVATAR_PATH}
                  src={avatarUrl || DEFAULT_BREEDER_AVATAR_PATH}
                  alt=""
                  className="w-24 h-24 rounded-full object-cover border-[3px] border-white shadow-md bg-white"
                  onLoad={() => finishPhotoLoad("avatar")}
                  onError={() => {
                    if (pendingPhotoRef.current?.kind === "avatar") {
                      pendingPhotoRef.current = null;
                      setUploadBusy(null);
                      setError(t(lang, "breederForm.uploadFailed"));
                    }
                  }}
                />
                {uploadBusy === "avatar" ? (
                  <div
                    className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center"
                    role="status"
                    aria-live="polite"
                  >
                    <span className="inline-block w-7 h-7 rounded-full border-[3px] border-white/35 border-t-white animate-spin" />
                  </div>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              disabled={busy || uploadBusy !== null}
              onClick={() => avatarInputRef.current?.click()}
              className="px-3 py-1.5 rounded-full bg-white text-[#B45309] text-xs font-semibold border border-amber-200 disabled:opacity-60"
            >
              {t(lang, "breederForm.changePhoto")}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadPhoto("avatar", file);
              }}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>
            {t(lang, "breederForm.displayName")}
            <RequiredMark />
          </label>
          <input
            className={`${inputCls} ${fieldErrors.displayName ? inputErrorCls : ""}`}
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              clearFieldError("displayName");
            }}
            aria-invalid={Boolean(fieldErrors.displayName)}
          />
          <FieldError message={fieldErrors.displayName} />
        </div>
        <div>
          <label className={labelCls}>
            {t(lang, "breederForm.location")}
            <RequiredMark />
          </label>
          <input
            className={`${inputCls} ${fieldErrors.location ? inputErrorCls : ""}`}
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              clearFieldError("location");
            }}
            aria-invalid={Boolean(fieldErrors.location)}
          />
          <FieldError message={fieldErrors.location} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>
              {t(lang, "breederForm.phone")}
              <RequiredMark />
            </label>
            <input
              className={`${inputCls} ${fieldErrors.phone ? inputErrorCls : ""}`}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                clearFieldError("phone");
              }}
              aria-invalid={Boolean(fieldErrors.phone)}
            />
            <FieldError message={fieldErrors.phone} />
          </div>
          <div>
            <label className={labelCls}>
              {t(lang, "breederForm.facebook")}
              <RequiredMark />
            </label>
            <input
              className={`${inputCls} ${fieldErrors.facebook ? inputErrorCls : ""}`}
              value={facebook}
              onChange={(e) => {
                setFacebook(e.target.value);
                clearFieldError("facebook");
              }}
              aria-invalid={Boolean(fieldErrors.facebook)}
            />
            <FieldError message={fieldErrors.facebook} />
          </div>
          <div>
            <label className={labelCls}>
              {t(lang, "breederForm.zalo")}
              <RequiredMark />
            </label>
            <input
              className={`${inputCls} ${fieldErrors.zalo ? inputErrorCls : ""}`}
              value={zalo}
              onChange={(e) => {
                setZalo(e.target.value);
                clearFieldError("zalo");
              }}
              aria-invalid={Boolean(fieldErrors.zalo)}
            />
            <FieldError message={fieldErrors.zalo} />
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
          <p className={labelCls}>
            {t(lang, "breederForm.species")}
            <RequiredMark />
          </p>
          <div className="flex flex-wrap gap-2">
            {SPECIES_OPTIONS.map((sp) => {
              const on = primarySpecies.includes(sp);
              return (
                <button
                  key={sp}
                  type="button"
                  onClick={() => {
                    setPrimarySpecies(toggle(primarySpecies, sp));
                    clearFieldError("species");
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    on
                      ? "bg-[#D97706] text-white border-[#D97706]"
                      : "bg-white text-[#5C4A3A] border-[#F0E6D8]"
                  }`}
                >
                  {t(lang, `breederForm.speciesOptions.${sp}` as EnKey)}
                </button>
              );
            })}
          </div>
          <FieldError message={fieldErrors.species} />
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
          <label className="flex items-start gap-2 text-sm text-[#2B1E19]">
            <input
              type="checkbox"
              className="mt-1 accent-[#D97706]"
              checked={hasAllBreederCommitments(commitments)}
              onChange={(e) =>
                setCommitments(
                  setBreederCommitmentsAccepted(commitments, e.target.checked),
                )
              }
            />
            <span>
              {t(lang, "breederForm.commitment.combinedBefore")}
              <Link
                href="/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#D97706] underline underline-offset-2"
              >
                {t(lang, "breederForm.commitment.termsLink")}
              </Link>
              {t(lang, "breederForm.commitment.and")}
              <Link
                href="/marketplace-guidelines"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#D97706] underline underline-offset-2"
              >
                {t(lang, "breederForm.commitment.guidelinesLink")}
              </Link>
              {t(lang, "breederForm.commitment.combinedAfter")}
            </span>
          </label>
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
          disabled={busy || uploadBusy !== null}
          className="w-full py-3 rounded-full bg-[#D97706] text-white text-sm font-semibold hover:bg-[#B45309] disabled:opacity-60 shadow-sm shadow-amber-200/60"
        >
          {busy ? t(lang, "common.loading") : t(lang, "breederForm.submit")}
        </button>
      </form>
    </div>
  );
}
