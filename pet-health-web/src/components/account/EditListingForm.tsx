"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Lang, Listing } from "@/lib/types";
import { t } from "@/i18n";
import { maskVndInput } from "@/lib/formatPrice";
import {
  buildListingEditPayload,
  listingEditFormDefaults,
} from "@/lib/listingEdit";
import { LoadingPopup } from "@/components/ui/LoadingPopup";

const inputCls =
  "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D97706]/20 focus:border-[#D97706]";

export function EditListingForm({
  listing,
  lang,
}: {
  listing: Listing;
  lang: Lang;
}) {
  const router = useRouter();
  const defaults = listingEditFormDefaults(listing, lang);
  const [title, setTitle] = useState(defaults.title);
  const [breed, setBreed] = useState(defaults.breed);
  const [gender, setGender] = useState(defaults.gender);
  const [ageMonths, setAgeMonths] = useState(defaults.ageMonths);
  const [location, setLocation] = useState(defaults.location);
  const [priceNote, setPriceNote] = useState(defaults.priceNote);
  const [description, setDescription] = useState(defaults.description);
  const [vaccineStatus, setVaccineStatus] = useState(defaults.vaccineStatus);
  const [dewormingStatus, setDewormingStatus] = useState(
    defaults.dewormingStatus,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const detailHref = `/app/pet-feed/posts/${listing.id}`;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const age = Number(ageMonths);
    if (!title.trim() || !breed.trim() || !Number.isFinite(age) || age <= 0) {
      setError(t(lang, "listing.edit.validation"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = buildListingEditPayload({
        title,
        species: defaults.species,
        breed,
        gender,
        ageMonths: age,
        location,
        priceNote,
        description,
        vaccineStatus,
        dewormingStatus,
        personality: defaults.personality,
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
      router.push("/app/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "listing.edit.failed"));
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-5 pt-8 pb-28">
      {loading ? <LoadingPopup label={t(lang, "listing.edit.saving")} /> : null}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">
          {t(lang, "detail.updateDetails")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t(lang, "listing.edit.hint")}</p>
      </div>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">
            {t(lang, "listing.new.field.title")}
          </span>
          <input
            className={`${inputCls} mt-1.5`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">
              {t(lang, "listing.new.field.breed")}
            </span>
            <input
              className={`${inputCls} mt-1.5`}
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">
              {t(lang, "listing.new.field.ageMonths")}
            </span>
            <input
              className={`${inputCls} mt-1.5`}
              type="number"
              min={1}
              value={ageMonths}
              onChange={(e) => setAgeMonths(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">
              {t(lang, "listing.new.field.gender")}
            </span>
            <input
              className={`${inputCls} mt-1.5`}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">
              {t(lang, "listing.new.field.location")}
            </span>
            <input
              className={`${inputCls} mt-1.5`}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">
            {t(lang, "listing.new.field.priceNote")}
          </span>
          <input
            className={`${inputCls} mt-1.5`}
            value={priceNote}
            onChange={(e) => setPriceNote(maskVndInput(e.target.value))}
            inputMode="numeric"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">
            {t(lang, "listing.new.field.description")}
          </span>
          <textarea
            className={`${inputCls} mt-1.5 min-h-[120px]`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">
              {t(lang, "listing.new.field.vaccineStatus")}
            </span>
            <input
              className={`${inputCls} mt-1.5`}
              value={vaccineStatus}
              onChange={(e) => setVaccineStatus(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">
              {t(lang, "listing.new.field.dewormingStatus")}
            </span>
            <input
              className={`${inputCls} mt-1.5`}
              value={dewormingStatus}
              onChange={(e) => setDewormingStatus(e.target.value)}
            />
          </label>
        </div>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2 pt-2">
          <Link
            href={detailHref}
            className="flex-1 py-2.5 text-center border border-slate-200 text-slate-700 text-sm font-medium rounded-full hover:bg-slate-50"
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
    </div>
  );
}
