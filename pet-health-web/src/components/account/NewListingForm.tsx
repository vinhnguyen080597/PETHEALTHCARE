"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BreederProfile, Lang } from "@/lib/types";
import { t, type EnKey } from "@/i18n";
import { scrollFieldIntoView } from "@/lib/formFocus";
import { maskVndInput } from "@/lib/formatPrice";
import { LoadingPopup } from "@/components/ui/LoadingPopup";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { buildListingPreview } from "@/lib/listingPreview";
import {
  firstNewListingErrorField,
  LISTING_AGE_MONTHS,
  LISTING_CAT_BREED_KEYS,
  LISTING_DEWORMING_KEYS,
  LISTING_GENDERS,
  LISTING_LOCATIONS,
  LISTING_MAX_HEALTH_EVIDENCE,
  LISTING_MAX_PHOTOS,
  LISTING_MAX_VIDEO_BYTES,
  LISTING_PAPERWORK_KEYS,
  LISTING_PERSONALITY_KEYS,
  LISTING_SPECIES,
  LISTING_VACCINE_KEYS,
  mergeListingMediaFiles,
  moveListingMediaItem,
  validateNewListingForm,
  vaccineStatusRequiresHealthEvidence,
  type NewListingFieldErrors,
} from "@/lib/listingFormOptions";

const inputCls =
  "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D97706]/20 focus:border-[#D97706]";
const inputErrorCls =
  "border-red-400 focus:border-red-400 focus:ring-red-500/10";

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

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <header className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-[#FFF8F0] to-white">
        <h2 className="text-sm font-semibold tracking-wide text-[#5C4A3A]">
          {title}
        </h2>
      </header>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );
}

function ChipMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = selected.includes(opt.label);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() =>
              onChange(
                on
                  ? selected.filter((x) => x !== opt.label)
                  : [...selected, opt.label],
              )
            }
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              on
                ? "bg-[#D97706] text-white border-[#D97706]"
                : "bg-white text-[#5C4A3A] border-slate-200 hover:border-[#D97706]/50"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (next: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60"
    >
      {options.map((opt) => {
        const on = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(opt.id)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              on
                ? "bg-white text-[#B45309] shadow-sm ring-1 ring-[#D97706]/25"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

function MediaDropzone({
  accept,
  multiple,
  disabled,
  invalid,
  hint,
  browseLabel,
  onFiles,
  children,
}: {
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  hint: string;
  browseLabel: string;
  onFiles: (files: File[]) => void;
  children?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (list: FileList | null) => {
    if (!list?.length) return;
    onFiles(Array.from(list).filter((f) => f.size > 0));
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) pick(e.dataTransfer.files);
      }}
      className={`rounded-2xl border-2 border-dashed transition-colors ${
        invalid
          ? "border-red-400 bg-red-50/40"
          : dragging
            ? "border-[#D97706] bg-[#FFF8F0]"
            : "border-slate-200 bg-slate-50/60 hover:border-[#D97706]/50"
      }`}
    >
      <div className="px-4 py-5 text-center">
        <p className="text-sm text-slate-600">{hint}</p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-full text-xs font-semibold bg-white border border-slate-200 text-[#5C4A3A] hover:border-[#D97706] disabled:opacity-50"
        >
          {browseLabel}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => pick(e.target.files)}
        />
      </div>
      {children}
    </div>
  );
}

function PhotoThumb({
  file,
  index,
  total,
  coverLabel,
  removeLabel,
  moveLeftLabel,
  moveRightLabel,
  onRemove,
  onMove,
}: {
  file: File;
  index: number;
  total: number;
  coverLabel: string;
  removeLabel: string;
  moveLeftLabel: string;
  moveRightLabel: string;
  onRemove: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const url = useObjectUrl(file);
  return (
    <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : null}
      {index === 0 ? (
        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#D97706] text-white">
          {coverLabel}
        </span>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 flex justify-between gap-0.5 p-1 bg-gradient-to-t from-black/60 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          aria-label={moveLeftLabel}
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
          className="h-6 w-6 rounded bg-white/90 text-xs font-bold disabled:opacity-30"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          className="h-6 w-6 rounded bg-white/90 text-xs"
        >
          ⌫
        </button>
        <button
          type="button"
          aria-label={moveRightLabel}
          disabled={index >= total - 1}
          onClick={() => onMove(index, index + 1)}
          className="h-6 w-6 rounded bg-white/90 text-xs font-bold disabled:opacity-30"
        >
          ›
        </button>
      </div>
    </div>
  );
}

function EvidenceThumb({
  file,
  removeLabel,
  onRemove,
}: {
  file: File;
  removeLabel: string;
  onRemove: () => void;
}) {
  const url = useObjectUrl(file);
  return (
    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : null}
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onRemove}
        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white text-xs"
      >
        ×
      </button>
    </div>
  );
}

export function NewListingForm({
  lang,
  warrantyPolicies = [],
  breeder,
}: {
  lang: Lang;
  warrantyPolicies?: Array<{ id: string; title: string }>;
  breeder: BreederProfile;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [error, setError] = useState("");
  const [terms, setTerms] = useState(false);
  const [title, setTitle] = useState("");
  const [species, setSpecies] = useState<string>("cat");
  const [breed, setBreed] = useState<string>("meo_ta");
  const [customBreed, setCustomBreed] = useState("");
  const [gender, setGender] = useState<string>("male");
  const [ageMonths, setAgeMonths] = useState<string>("2");
  const [location, setLocation] = useState<string>(LISTING_LOCATIONS[0]);
  const [priceNote, setPriceNote] = useState("");
  const [description, setDescription] = useState("");
  const [facebook, setFacebook] = useState("");
  const [zalo, setZalo] = useState("");
  const [phone, setPhone] = useState("");
  const [warrantyPolicyId, setWarrantyPolicyId] = useState("");
  const [vaccineKey, setVaccineKey] =
    useState<(typeof LISTING_VACCINE_KEYS)[number]>("unknown");
  const [dewormingKey, setDewormingKey] =
    useState<(typeof LISTING_DEWORMING_KEYS)[number]>("unknown");
  const [personality, setPersonality] = useState<string[]>([]);
  const [paperwork, setPaperwork] = useState<string[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [healthEvidence, setHealthEvidence] = useState<File[]>([]);
  const [fieldErrors, setFieldErrors] = useState<NewListingFieldErrors>({});
  const videoPreviewUrl = useObjectUrl(video);
  const coverPreviewUrl = useObjectUrl(photos[0] ?? null);

  const vaccineLabel = useMemo(() => {
    if (vaccineKey === "unknown") return "";
    return t(lang, `listing.new.vaccine.${vaccineKey}` as EnKey);
  }, [lang, vaccineKey]);

  const dewormingLabel = useMemo(() => {
    if (dewormingKey === "unknown") return "";
    return t(lang, `listing.new.deworming.${dewormingKey}` as EnKey);
  }, [dewormingKey, lang]);

  const needsHealthEvidence = vaccineStatusRequiresHealthEvidence(vaccineLabel);

  const personalityOptions = LISTING_PERSONALITY_KEYS.map((id) => ({
    id,
    label: t(lang, `listing.new.personality.${id}` as EnKey),
  }));
  const paperworkOptions = LISTING_PAPERWORK_KEYS.map((id) => ({
    id,
    label: t(lang, `listing.new.paperwork.${id}` as EnKey),
  }));
  const vaccineOptions = LISTING_VACCINE_KEYS.map((id) => ({
    id,
    label: t(lang, `listing.new.vaccineShort.${id}` as EnKey),
  }));
  const dewormingOptions = LISTING_DEWORMING_KEYS.map((id) => ({
    id,
    label: t(lang, `listing.new.dewormingShort.${id}` as EnKey),
  }));

  const clearFieldError = (key: keyof NewListingFieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validationMessages = {
    title: t(lang, "listing.new.field.titleRequired"),
    species: t(lang, "listing.new.field.speciesRequired"),
    breed: t(lang, "listing.new.field.breedRequired"),
    gender: t(lang, "listing.new.field.genderRequired"),
    ageMonths: t(lang, "listing.new.field.ageRequired"),
    location: t(lang, "listing.new.field.locationRequired"),
    priceNote: t(lang, "listing.new.field.priceRequired"),
    photos: t(lang, "listing.new.field.photosRequired"),
    video: t(lang, "listing.new.field.videoRequired"),
    healthEvidence: t(lang, "listing.new.field.healthEvidenceRequired"),
    terms: t(lang, "listing.new.field.termsRequired"),
  };

  const breedLabel =
    breed === "other"
      ? customBreed.trim()
      : t(lang, `listing.new.breed.${breed}` as EnKey);
  const genderLabel = t(lang, `listing.new.gender.${gender}` as EnKey);
  const previewListing = buildListingPreview({
    title,
    untitledFallback: t(lang, "listing.new.previewUntitled"),
    species,
    breed: breedLabel,
    gender,
    ageMonths: Number(ageMonths) || 0,
    location,
    priceNote,
    description,
    personality,
    vaccineStatus: vaccineLabel,
    dewormingStatus: dewormingLabel,
    mediaUrl: coverPreviewUrl || "",
    breeder,
    warrantyPolicy: warrantyPolicyId
      ? {
          id: warrantyPolicyId,
          title:
            warrantyPolicies.find((p) => p.id === warrantyPolicyId)?.title || "",
        }
      : null,
  });

  const runFieldValidation = (requireTerms: boolean) =>
    validateNewListingForm(
      {
        title,
        species,
        breed,
        customBreed,
        gender,
        ageMonths,
        location,
        priceNote,
        vaccineKey,
        vaccineLabel,
        photoCount: photos.length,
        hasVideo: Boolean(video),
        videoSize: video?.size || 0,
        healthEvidenceCount: healthEvidence.length,
        termsAccepted: terms,
      },
      validationMessages,
      { requireTerms },
    );

  const openReview = () => {
    const nextErrors = runFieldValidation(false);
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("");
      const first = firstNewListingErrorField(nextErrors);
      if (first) {
        requestAnimationFrame(() => {
          scrollFieldIntoView(document.getElementById(`listing-field-${first}`));
        });
      }
      return;
    }
    setFieldErrors({});
    setError("");
    setReviewOpen(true);
  };

  const submitForReview = async () => {
    const nextErrors = runFieldValidation(true);
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    // Close review first so LoadingPopup is visible (mobile parity).
    setReviewOpen(false);
    setLoading(true);
    setError("");
    setFieldErrors({});

    const fd = new FormData();
    fd.set("title", title.trim());
    fd.set("species", species);
    fd.set("breed", breedLabel);
    fd.set("gender", genderLabel);
    fd.set("ageMonths", ageMonths);
    fd.set("location", location);
    fd.set("priceNote", priceNote.trim());
    fd.set("description", description.trim());
    fd.set("vaccineStatus", vaccineLabel);
    fd.set("dewormingStatus", dewormingLabel);
    fd.set("personality", JSON.stringify(personality));
    fd.set("paperwork", JSON.stringify(paperwork));
    fd.set(
      "contact",
      JSON.stringify({
        facebook: facebook.trim(),
        zalo: zalo.trim(),
        phone: phone.trim(),
      }),
    );
    if (warrantyPolicyId) fd.set("warranty_policy_id", warrantyPolicyId);
    fd.set("status", "pending_review");
    for (const photo of photos) fd.append("photos", photo);
    if (video) fd.append("video", video);
    for (const evidence of healthEvidence) fd.append("healthEvidence", evidence);

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create listing");
      router.push("/app/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-5 pt-8 pb-28">
      {loading ? (
        <LoadingPopup label={t(lang, "listing.new.submitting")} />
      ) : null}
      <h1 className="text-2xl font-bold text-slate-900 mb-6">
        {t(lang, "listing.new.title")}
      </h1>

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          openReview();
        }}
        noValidate
        className="space-y-5"
      >
        <SectionCard title={t(lang, "listing.new.section.basics")}>
          <div id="listing-field-title">
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {t(lang, "listing.new.field.title")}
              <RequiredMark />
            </label>
            <input
              value={title}
              type="text"
              maxLength={180}
              aria-invalid={Boolean(fieldErrors.title)}
              onChange={(e) => {
                setTitle(e.target.value);
                clearFieldError("title");
              }}
              className={`${inputCls} ${fieldErrors.title ? inputErrorCls : ""}`}
            />
            <FieldError message={fieldErrors.title} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div id="listing-field-species">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {t(lang, "listing.new.field.species")}
                <RequiredMark />
              </label>
              <select
                value={species}
                onChange={(e) => {
                  setSpecies(e.target.value);
                  clearFieldError("species");
                }}
                aria-invalid={Boolean(fieldErrors.species)}
                className={`${inputCls} ${fieldErrors.species ? inputErrorCls : ""}`}
              >
                {LISTING_SPECIES.map((id) => (
                  <option key={id} value={id}>
                    {t(lang, `listing.new.species.${id}` as EnKey)}
                  </option>
                ))}
              </select>
              <FieldError message={fieldErrors.species} />
            </div>

            <div id="listing-field-breed">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {t(lang, "listing.new.field.breed")}
                <RequiredMark />
              </label>
              <select
                value={breed}
                onChange={(e) => {
                  setBreed(e.target.value);
                  clearFieldError("breed");
                }}
                aria-invalid={Boolean(fieldErrors.breed)}
                className={`${inputCls} ${fieldErrors.breed ? inputErrorCls : ""}`}
              >
                {LISTING_CAT_BREED_KEYS.map((id) => (
                  <option key={id} value={id}>
                    {t(lang, `listing.new.breed.${id}` as EnKey)}
                  </option>
                ))}
              </select>
              {breed === "other" ? (
                <input
                  value={customBreed}
                  onChange={(e) => {
                    setCustomBreed(e.target.value);
                    clearFieldError("breed");
                  }}
                  placeholder={t(lang, "listing.new.field.customBreed")}
                  className={`${inputCls} mt-2 ${fieldErrors.breed ? inputErrorCls : ""}`}
                />
              ) : null}
              <FieldError message={fieldErrors.breed} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div id="listing-field-gender">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                {t(lang, "listing.new.field.gender")}
                <RequiredMark />
              </label>
              <SegmentedControl
                value={gender}
                ariaLabel={t(lang, "listing.new.field.gender")}
                options={LISTING_GENDERS.map((id) => ({
                  id,
                  label: t(lang, `listing.new.gender.${id}` as EnKey),
                }))}
                onChange={(next) => {
                  setGender(next);
                  clearFieldError("gender");
                }}
              />
              <FieldError message={fieldErrors.gender} />
            </div>

            <div id="listing-field-ageMonths">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {t(lang, "listing.new.field.ageMonths")}
                <RequiredMark />
              </label>
              <select
                value={ageMonths}
                onChange={(e) => {
                  setAgeMonths(e.target.value);
                  clearFieldError("ageMonths");
                }}
                aria-invalid={Boolean(fieldErrors.ageMonths)}
                className={`${inputCls} ${fieldErrors.ageMonths ? inputErrorCls : ""}`}
              >
                {LISTING_AGE_MONTHS.map((n) => (
                  <option key={n} value={String(n)}>
                    {t(lang, `listing.new.age.${n}` as EnKey)}
                  </option>
                ))}
              </select>
              <FieldError message={fieldErrors.ageMonths} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div id="listing-field-location">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {t(lang, "listing.new.field.location")}
                <RequiredMark />
              </label>
              <select
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  clearFieldError("location");
                }}
                aria-invalid={Boolean(fieldErrors.location)}
                className={`${inputCls} ${fieldErrors.location ? inputErrorCls : ""}`}
              >
                {LISTING_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <FieldError message={fieldErrors.location} />
            </div>

            <div id="listing-field-priceNote">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {t(lang, "listing.new.field.priceNote")}
                <RequiredMark />
              </label>
              <div className="relative">
                <input
                  value={priceNote}
                  type="text"
                  inputMode="numeric"
                  aria-invalid={Boolean(fieldErrors.priceNote)}
                  onChange={(e) => {
                    setPriceNote(maskVndInput(e.target.value));
                    clearFieldError("priceNote");
                  }}
                  className={`${inputCls} pr-14 ${fieldErrors.priceNote ? inputErrorCls : ""}`}
                  placeholder="3.500.000"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">
                  VNĐ
                </span>
              </div>
              <FieldError message={fieldErrors.priceNote} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title={t(lang, "listing.new.section.health")}>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              {t(lang, "listing.new.field.vaccineStatus")}
            </label>
            <SegmentedControl
              value={vaccineKey}
              ariaLabel={t(lang, "listing.new.field.vaccineStatus")}
              options={vaccineOptions}
              onChange={(next) => {
                setVaccineKey(next);
                clearFieldError("healthEvidence");
              }}
            />
          </div>

          {needsHealthEvidence ? (
            <div id="listing-field-healthEvidence">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                {t(lang, "listing.new.healthEvidence")}
                <RequiredMark />
              </label>
              <MediaDropzone
                accept="image/jpeg,image/png,image/webp"
                multiple
                invalid={Boolean(fieldErrors.healthEvidence)}
                hint={t(lang, "listing.new.evidenceDrop")}
                browseLabel={t(lang, "listing.new.photosBrowse")}
                disabled={healthEvidence.length >= LISTING_MAX_HEALTH_EVIDENCE}
                onFiles={(incoming) => {
                  setHealthEvidence((prev) =>
                    mergeListingMediaFiles(
                      prev,
                      incoming,
                      LISTING_MAX_HEALTH_EVIDENCE,
                    ),
                  );
                  clearFieldError("healthEvidence");
                }}
              >
                {healthEvidence.length > 0 ? (
                  <div className="flex flex-wrap gap-2 px-4 pb-4">
                    {healthEvidence.map((file, index) => (
                      <EvidenceThumb
                        key={`${file.name}-${file.lastModified}-${index}`}
                        file={file}
                        removeLabel={t(lang, "listing.new.mediaRemove")}
                        onRemove={() =>
                          setHealthEvidence((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                      />
                    ))}
                  </div>
                ) : null}
              </MediaDropzone>
              <p className="mt-1.5 text-xs text-slate-500">
                {t(lang, "listing.new.healthEvidenceHint")}
              </p>
              <FieldError message={fieldErrors.healthEvidence} />
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              {t(lang, "listing.new.field.dewormingStatus")}
            </label>
            <SegmentedControl
              value={dewormingKey}
              ariaLabel={t(lang, "listing.new.field.dewormingStatus")}
              options={dewormingOptions}
              onChange={setDewormingKey}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              {t(lang, "listing.new.field.paperwork")}
            </label>
            <ChipMultiSelect
              options={paperworkOptions}
              selected={paperwork}
              onChange={setPaperwork}
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-1">
              <label className="block text-xs font-medium text-slate-500">
                {t(lang, "listing.new.warranty")}
              </label>
              <Link
                href="/app/account/warranty"
                className="text-xs font-semibold text-[#B45309] hover:underline shrink-0"
              >
                + {t(lang, "listing.new.warrantyCreate")}
              </Link>
            </div>
            <select
              value={warrantyPolicyId}
              onChange={(e) => setWarrantyPolicyId(e.target.value)}
              className={inputCls}
            >
              <option value="">{t(lang, "listing.new.warrantyNone")}</option>
              {warrantyPolicies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            {warrantyPolicies.length === 0 ? (
              <p className="mt-1.5 text-xs text-amber-700">
                {t(lang, "listing.new.warrantyHint")}{" "}
                <Link
                  href="/app/account/warranty"
                  className="underline font-medium"
                >
                  {t(lang, "listing.new.warrantyManage")}
                </Link>
              </p>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title={t(lang, "listing.new.section.story")}>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              {t(lang, "listing.new.field.personality")}
            </label>
            <ChipMultiSelect
              options={personalityOptions}
              selected={personality}
              onChange={setPersonality}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {t(lang, "listing.new.field.description")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={inputCls}
            />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">
              {t(lang, "listing.new.field.contact")}
            </p>
            <div className="space-y-2">
              <input
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                type="text"
                placeholder={t(lang, "listing.new.field.facebook")}
                className={inputCls}
              />
              <input
                value={zalo}
                onChange={(e) => setZalo(e.target.value)}
                type="text"
                placeholder={t(lang, "listing.new.field.zalo")}
                className={inputCls}
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                placeholder={t(lang, "listing.new.field.phone")}
                className={inputCls}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title={t(lang, "listing.new.section.media")}>
          <div id="listing-field-photos">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              {t(lang, "listing.new.photos")}
              <RequiredMark />
            </label>
            <MediaDropzone
              accept="image/jpeg,image/png,image/webp"
              multiple
              invalid={Boolean(fieldErrors.photos)}
              hint={t(lang, "listing.new.photosDrop")}
              browseLabel={t(lang, "listing.new.photosBrowse")}
              disabled={photos.length >= LISTING_MAX_PHOTOS}
              onFiles={(incoming) => {
                setPhotos((prev) =>
                  mergeListingMediaFiles(prev, incoming, LISTING_MAX_PHOTOS),
                );
                clearFieldError("photos");
              }}
            >
              {photos.length > 0 ? (
                <div className="flex flex-wrap gap-2 px-4 pb-4">
                  {photos.map((file, index) => (
                    <PhotoThumb
                      key={`${file.name}-${file.lastModified}-${index}`}
                      file={file}
                      index={index}
                      total={photos.length}
                      coverLabel={t(lang, "listing.new.photosCover")}
                      removeLabel={t(lang, "listing.new.mediaRemove")}
                      moveLeftLabel={t(lang, "listing.new.mediaMoveLeft")}
                      moveRightLabel={t(lang, "listing.new.mediaMoveRight")}
                      onRemove={() =>
                        setPhotos((prev) => prev.filter((_, i) => i !== index))
                      }
                      onMove={(from, to) =>
                        setPhotos((prev) => moveListingMediaItem(prev, from, to))
                      }
                    />
                  ))}
                </div>
              ) : null}
            </MediaDropzone>
            <p className="mt-1.5 text-xs text-slate-500">
              {t(lang, "listing.new.photosHint")}
            </p>
            <FieldError message={fieldErrors.photos} />
          </div>

          <div id="listing-field-video">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              {t(lang, "listing.new.video")}
              <RequiredMark />
            </label>
            <MediaDropzone
              accept="video/mp4,video/quicktime,video/webm,video/3gpp"
              invalid={Boolean(fieldErrors.video)}
              hint={t(lang, "listing.new.videoDrop")}
              browseLabel={t(lang, "listing.new.videoBrowse")}
              onFiles={(incoming) => {
                const next = incoming[0];
                if (!next) return;
                if (next.size > LISTING_MAX_VIDEO_BYTES) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    video: validationMessages.video,
                  }));
                  return;
                }
                setVideo(next);
                clearFieldError("video");
              }}
            >
              {video ? (
                <div className="px-4 pb-4 flex items-center gap-3">
                  {videoPreviewUrl ? (
                    <video
                      src={videoPreviewUrl}
                      className="h-20 w-32 rounded-xl object-cover bg-black"
                      muted
                      playsInline
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {video.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(video.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVideo(null)}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    {t(lang, "listing.new.mediaRemove")}
                  </button>
                </div>
              ) : null}
            </MediaDropzone>
            <p className="mt-1.5 text-xs text-slate-500">
              {t(lang, "listing.new.videoHint")}
            </p>
            <FieldError message={fieldErrors.video} />
          </div>
        </SectionCard>

        {error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        ) : null}
      </form>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md shadow-[0_-8px_30px_rgba(15,23,42,0.08)]">
        <div className="max-w-2xl mx-auto px-5 py-3">
          <button
            type="button"
            disabled={loading}
            onClick={openReview}
            className="w-full py-3 bg-[#D97706] text-white text-sm font-semibold rounded-full hover:bg-[#B45309] disabled:opacity-50 shadow-sm"
          >
            {t(lang, "listing.new.review")}
          </button>
        </div>
      </div>

      {reviewOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-[#2B1E19]/45 backdrop-blur-[2px] p-0 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="listing-review-title"
        >
          <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-[#F0E6D8] bg-[#FDFBF7] shadow-[0_24px_60px_-20px_rgba(43,30,25,0.5)] overflow-hidden">
            <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200/80 bg-white shrink-0">
              <h2
                id="listing-review-title"
                className="text-base font-bold text-slate-900"
              >
                {t(lang, "listing.new.review")}
              </h2>
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 text-lg leading-none"
                aria-label={t(lang, "listing.new.edit")}
              >
                ×
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                {t(lang, "listing.new.reviewNote")}
              </p>

              <ListingCard
                listing={previewListing}
                lang={lang}
                interactive={false}
              />
            </div>

            <footer className="shrink-0 border-t border-slate-200/80 bg-white px-5 py-4 space-y-3">
              <div id="listing-field-terms">
                <label className="flex items-start gap-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => {
                      setTerms(e.target.checked);
                      clearFieldError("terms");
                    }}
                    className="mt-1 accent-[#D97706]"
                  />
                  <span>
                    {t(lang, "listing.new.terms")}
                    <RequiredMark />
                  </span>
                </label>
                <FieldError message={fieldErrors.terms} />
              </div>
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                className="w-full py-2.5 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t(lang, "listing.new.edit")}
              </button>
              <button
                type="button"
                disabled={!terms || loading}
                onClick={() => void submitForReview()}
                className={`w-full py-3 rounded-full text-sm font-semibold text-white shadow-sm ${
                  terms && !loading
                    ? "bg-[#D97706] hover:bg-[#B45309]"
                    : "bg-slate-300 cursor-not-allowed"
                }`}
              >
                {t(lang, "listing.new.submit")}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
