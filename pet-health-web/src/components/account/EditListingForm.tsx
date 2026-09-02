"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Lang, Listing } from "@/lib/types";
import { t, type EnKey } from "@/i18n";
import { maskVndInput } from "@/lib/formatPrice";
import {
  buildListingEditPayload,
  listingEditFormDefaults,
} from "@/lib/listingEdit";
import {
  LISTING_AGE_MONTHS,
  LISTING_DEWORMING_KEYS,
  LISTING_GENDERS,
  LISTING_LOCATIONS,
  LISTING_PAPERWORK_KEYS,
  LISTING_PERSONALITY_KEYS,
  LISTING_VACCINE_KEYS,
  listingBreedKeysForSpecies,
} from "@/lib/listingFormOptions";
import {
  evaluateOwnerDeleteListing,
  listingDeleteClickAction,
  ownerDeleteBlockedMessage,
} from "@/lib/listingOwnerDelete";
import { ListingDeleteConfirmModal } from "@/components/marketplace/ListingDeleteConfirmModal";
import { LoadingPopup } from "@/components/ui/LoadingPopup";

const inputCls =
  "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D97706]/20 focus:border-[#D97706]";

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      {hint ? (
        <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>
      ) : null}
      <div className="mt-4 space-y-4">{children}</div>
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
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              on
                ? "border-[#D97706] bg-[#D97706] text-white"
                : "border-slate-200 bg-white text-[#5C4A3A] hover:border-[#D97706]/50"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function EditListingForm({
  listing,
  lang,
}: {
  listing: Listing;
  lang: Lang;
}) {
  const router = useRouter();
  const defaults = useMemo(
    () => listingEditFormDefaults(listing, lang, t),
    [listing, lang],
  );
  const detailHref = `/app/pet-feed/posts/${listing.id}?from=account`;

  const [title, setTitle] = useState(defaults.title);
  const [breedKey, setBreedKey] = useState(defaults.breedKey);
  const [customBreed, setCustomBreed] = useState(defaults.customBreed);
  const [gender, setGender] = useState(defaults.gender);
  const [ageMonths, setAgeMonths] = useState(defaults.ageMonths);
  const [location, setLocation] = useState(defaults.location);
  const [priceNote, setPriceNote] = useState(defaults.priceNote);
  const [description, setDescription] = useState(defaults.description);
  const [vaccineKey, setVaccineKey] = useState(defaults.vaccineKey);
  const [dewormingKey, setDewormingKey] = useState(defaults.dewormingKey);
  const [personality, setPersonality] = useState(defaults.personality);
  const [paperwork, setPaperwork] = useState(defaults.paperwork);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteModalMode, setDeleteModalMode] = useState<
    "confirm" | "blocked" | null
  >(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const breedKeys = listingBreedKeysForSpecies(defaults.species);
  const breedLabel =
    breedKey === "other"
      ? customBreed.trim() || t(lang, "listing.new.breed.other")
      : t(lang, `listing.new.breed.${breedKey}` as EnKey);
  const genderLabel = t(lang, `listing.new.gender.${gender}` as EnKey);
  const vaccineLabel =
    vaccineKey === "unknown"
      ? ""
      : t(lang, `listing.new.vaccineShort.${vaccineKey}` as EnKey);
  const dewormingLabel =
    dewormingKey === "unknown"
      ? ""
      : t(lang, `listing.new.dewormingShort.${dewormingKey}` as EnKey);

  const personalityOptions = LISTING_PERSONALITY_KEYS.map((id) => ({
    id,
    label: t(lang, `listing.new.personality.${id}` as EnKey),
  }));
  const paperworkOptions = LISTING_PAPERWORK_KEYS.map((id) => ({
    id,
    label: t(lang, `listing.new.paperwork.${id}` as EnKey),
  }));

  const deleteDecision = evaluateOwnerDeleteListing({
    isOwner: true,
    status: listing.status,
    metadataSold: listing.metadataSold,
    metadataCancelled: listing.metadataCancelled,
    ownerDeleted: listing.ownerDeleted,
    completedAt: listing.deal?.completedAt,
    senConfirmedCompleteAt: listing.deal?.senConfirmedCompleteAt,
  });
  const deleteClickAction = listingDeleteClickAction(deleteDecision);
  const showDeleteSection = deleteClickAction !== "hidden";
  const deleteBlockedHint = ownerDeleteBlockedMessage(deleteDecision, {
    deposit: t(lang, "detail.deleteBlockedDeposit"),
    cooldown: t(lang, "detail.deleteBlockedSoldCooldown"),
    generic: t(lang, "detail.deleteFailed"),
  });

  const previewUrls = (listing.mediaUrls?.length
    ? listing.mediaUrls
    : listing.mediaUrl
      ? [listing.mediaUrl]
      : []
  ).filter(Boolean);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const age = Number(ageMonths);
    if (!title.trim() || !breedLabel.trim() || !Number.isFinite(age) || age <= 0) {
      setError(t(lang, "listing.edit.validation"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = buildListingEditPayload({
        title,
        species: defaults.species,
        breed: breedLabel,
        gender: genderLabel,
        ageMonths: age,
        location,
        priceNote,
        description,
        vaccineStatus: vaccineLabel,
        dewormingStatus: dewormingLabel,
        personality,
        paperwork,
      });
      const res = await fetch(`/api/listings/${encodeURIComponent(listing.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || t(lang, "listing.edit.failed"));
      }
      router.push(`${detailHref}&saved=1`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "listing.edit.failed"));
      setLoading(false);
    }
  };

  const deleteOwnListing = async () => {
    if (!deleteDecision.allowed) return;
    setDeleteBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/listings/${listing.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          String((data as { error?: string }).error || t(lang, "detail.deleteFailed")),
        );
      }
      setDeleteModalMode(null);
      router.push("/app/account");
      router.refresh();
    } catch (err) {
      setDeleteModalMode(null);
      setError(err instanceof Error ? err.message : t(lang, "detail.deleteFailed"));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F4F8]">
      {loading ? <LoadingPopup label={t(lang, "listing.edit.saving")} /> : null}
      <div className="max-w-2xl mx-auto px-5 pt-6 pb-28">
        <Link
          href={detailHref}
          className="inline-flex items-center gap-2 text-slate-500 text-sm hover:text-slate-900 transition-colors mb-5"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              d="M10 12 6 8l4-4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t(lang, "detail.back")}
        </Link>

        <h1 className="text-xl font-bold text-slate-900 mb-6">
          {t(lang, "listing.edit.title")}
        </h1>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <SectionCard
            title={t(lang, "listing.new.section.basics")}
            hint={t(lang, "listing.edit.basicHint")}
          >
            <label className="block">
              <span className="text-xs font-semibold uppercase text-slate-500">
                {t(lang, "listing.new.field.title")}
              </span>
              <input
                className={`${inputCls} mt-1.5`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase text-slate-500">
                {t(lang, "listing.new.field.species")}
              </span>
              <input
                className={`${inputCls} mt-1.5 bg-slate-50 text-slate-600`}
                value={t(lang, `listing.new.species.${defaults.species}` as EnKey)}
                readOnly
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  {t(lang, "listing.new.field.breed")}
                </span>
                <select
                  className={`${inputCls} mt-1.5`}
                  value={breedKey}
                  onChange={(e) => setBreedKey(e.target.value)}
                  required
                >
                  {breedKeys.map((id) => (
                    <option key={id} value={id}>
                      {t(lang, `listing.new.breed.${id}` as EnKey)}
                    </option>
                  ))}
                </select>
              </label>
              {breedKey === "other" ? (
                <label className="block">
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    {t(lang, "listing.new.field.customBreed")}
                  </span>
                  <input
                    className={`${inputCls} mt-1.5`}
                    value={customBreed}
                    onChange={(e) => setCustomBreed(e.target.value)}
                    required
                  />
                </label>
              ) : null}
              <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  {t(lang, "listing.new.field.gender")}
                </span>
                <select
                  className={`${inputCls} mt-1.5`}
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  {LISTING_GENDERS.map((id) => (
                    <option key={id} value={id}>
                      {t(lang, `listing.new.gender.${id}` as EnKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  {t(lang, "listing.new.field.ageMonths")}
                </span>
                <select
                  className={`${inputCls} mt-1.5`}
                  value={ageMonths}
                  onChange={(e) => setAgeMonths(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    {t(lang, "listing.new.field.ageMonths")}
                  </option>
                  {LISTING_AGE_MONTHS.map((months) => (
                    <option key={months} value={months}>
                      {t(lang, `listing.new.age.${months}` as EnKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  {t(lang, "listing.new.field.location")}
                </span>
                <select
                  className={`${inputCls} mt-1.5`}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                >
                  <option value="" disabled>
                    {t(lang, "listing.new.field.location")}
                  </option>
                  {LISTING_LOCATIONS.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  {t(lang, "listing.new.field.priceNote")}
                </span>
                <input
                  className={`${inputCls} mt-1.5`}
                  value={priceNote}
                  onChange={(e) => setPriceNote(maskVndInput(e.target.value))}
                  inputMode="numeric"
                />
              </label>
            </div>

            {previewUrls.length > 0 || listing.videoUrl ? (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
                  {t(lang, "listing.edit.currentMedia")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {previewUrls.map((url) => (
                    <div
                      key={url}
                      className="h-20 w-20 overflow-hidden rounded-xl bg-slate-100"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                  {listing.videoUrl ? (
                    <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-900 text-[10px] font-bold uppercase tracking-wide text-white">
                      {t(lang, "detail.video")}
                    </div>
                  ) : null}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {t(lang, "listing.edit.mediaKept")}
                </p>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title={t(lang, "listing.new.section.health")}>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                {t(lang, "listing.new.field.personality")}
              </p>
              <ChipMultiSelect
                options={personalityOptions}
                selected={personality}
                onChange={setPersonality}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  {t(lang, "listing.new.field.vaccineStatus")}
                </span>
                <select
                  className={`${inputCls} mt-1.5`}
                  value={vaccineKey}
                  onChange={(e) => setVaccineKey(e.target.value)}
                >
                  {LISTING_VACCINE_KEYS.map((id) => (
                    <option key={id} value={id}>
                      {t(lang, `listing.new.vaccineShort.${id}` as EnKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  {t(lang, "listing.new.field.dewormingStatus")}
                </span>
                <select
                  className={`${inputCls} mt-1.5`}
                  value={dewormingKey}
                  onChange={(e) => setDewormingKey(e.target.value)}
                >
                  {LISTING_DEWORMING_KEYS.map((id) => (
                    <option key={id} value={id}>
                      {t(lang, `listing.new.dewormingShort.${id}` as EnKey)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                {t(lang, "listing.new.field.paperwork")}
              </p>
              <ChipMultiSelect
                options={paperworkOptions}
                selected={paperwork}
                onChange={setPaperwork}
              />
            </div>
          </SectionCard>

          <SectionCard title={t(lang, "listing.new.section.story")}>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-slate-500">
                {t(lang, "listing.new.field.description")}
              </span>
              <textarea
                className={`${inputCls} mt-1.5 min-h-[120px]`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <p className="text-xs leading-5 text-slate-500">
              {t(lang, "listing.edit.hint")}
            </p>
          </SectionCard>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Link
              href={detailHref}
              className="flex-1 py-2.5 text-center border border-slate-200 text-slate-700 text-sm font-medium rounded-full hover:bg-white transition-colors"
            >
              {t(lang, "common.cancel")}
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-[#D97706] text-white text-sm font-semibold rounded-full hover:bg-[#B45309] disabled:opacity-60"
            >
              {t(lang, "listing.edit.save")}
            </button>
          </div>
        </form>

        {showDeleteSection ? (
          <section className="mt-4 rounded-2xl border border-red-200 bg-white p-4">
            <h2 className="text-base font-bold text-slate-900">
              {t(lang, "listing.edit.deleteSectionTitle")}
            </h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {t(lang, "detail.deleteConfirmBody")}
            </p>
            {deleteClickAction === "blocked" ? (
              <p className="mt-3 text-xs leading-5 text-amber-800">
                {deleteBlockedHint}
              </p>
            ) : null}
            <button
              type="button"
              disabled={deleteClickAction !== "confirm" || deleteBusy || loading}
              onClick={() =>
                setDeleteModalMode(
                  deleteClickAction === "blocked" ? "blocked" : "confirm",
                )
              }
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-colors ${
                deleteClickAction === "confirm" && !deleteBusy && !loading
                  ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  : "border-slate-200 bg-slate-100 text-slate-400"
              }`}
            >
              {deleteBusy ? t(lang, "detail.deleting") : t(lang, "detail.delete")}
            </button>
          </section>
        ) : null}
      </div>

      <ListingDeleteConfirmModal
        lang={lang}
        open={deleteModalMode != null}
        mode={deleteModalMode === "blocked" ? "blocked" : "confirm"}
        blockedMessage={deleteBlockedHint}
        busy={deleteBusy}
        onCancel={() => {
          if (!deleteBusy) setDeleteModalMode(null);
        }}
        onConfirm={() => void deleteOwnListing()}
      />
    </div>
  );
}
