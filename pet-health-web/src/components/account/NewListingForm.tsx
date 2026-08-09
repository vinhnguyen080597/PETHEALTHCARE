"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";

const inputCls =
  "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20 focus:border-[#1E6FE8]";
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

export function NewListingForm({
  lang,
  warrantyPolicies = [],
}: {
  lang: Lang;
  warrantyPolicies?: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [terms, setTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    species?: string;
    photos?: string;
    video?: string;
    terms?: string;
  }>({});

  const clearFieldError = (key: keyof typeof fieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const nextErrors: typeof fieldErrors = {};
    if (!String(fd.get("title") || "").trim()) {
      nextErrors.title = t(lang, "listing.new.field.titleRequired");
    }
    if (!String(fd.get("species") || "").trim()) {
      nextErrors.species = t(lang, "listing.new.field.speciesRequired");
    }
    const photos = fd.getAll("photos").filter((f) => f instanceof File && f.size > 0);
    if (photos.length === 0) {
      nextErrors.photos = t(lang, "listing.new.field.photosRequired");
    }
    const video = fd.get("video");
    if (!(video instanceof File) || video.size === 0) {
      nextErrors.video = t(lang, "listing.new.field.videoRequired");
    }
    if (!terms) {
      nextErrors.terms = t(lang, "listing.new.field.termsRequired");
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    setFieldErrors({});
    fd.set("status", "pending_review");
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-5 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">
        {t(lang, "listing.new.title")}
      </h1>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {(
          [
            ["title", lang === "VI" ? "Tiêu đề" : "Title", "text", true],
            ["species", lang === "VI" ? "Loài (cat/dog)" : "Species", "text", true],
            ["breed", lang === "VI" ? "Giống" : "Breed", "text", false],
            ["gender", lang === "VI" ? "Giới tính (male/female)" : "Gender", "text", false],
            ["ageMonths", lang === "VI" ? "Tuổi (tháng)" : "Age (months)", "number", false],
            ["location", lang === "VI" ? "Khu vực" : "Location", "text", false],
            ["priceNote", lang === "VI" ? "Giá" : "Price", "text", false],
            ["vaccineStatus", "Vaccine", "text", false],
            ["dewormingStatus", lang === "VI" ? "Tẩy giun" : "Deworming", "text", false],
          ] as const
        ).map(([name, label, type, required]) => {
          const errKey = name === "title" || name === "species" ? name : null;
          const errMsg = errKey ? fieldErrors[errKey] : undefined;
          return (
            <div key={name}>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {label}
                {required ? <RequiredMark /> : null}
              </label>
              <input
                name={name}
                type={type}
                aria-invalid={Boolean(errMsg)}
                onChange={() => {
                  if (errKey) clearFieldError(errKey);
                }}
                className={`${inputCls} ${errMsg ? inputErrorCls : ""}`}
              />
              <FieldError message={errMsg} />
            </div>
          );
        })}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            {lang === "VI" ? "Mô tả" : "Description"}
          </label>
          <textarea
            name="description"
            rows={4}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            {t(lang, "listing.new.warranty")}
          </label>
          <select name="warranty_policy_id" className={inputCls} defaultValue="">
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
              <a href="/app/account/warranty" className="underline font-medium">
                {t(lang, "listing.new.warrantyManage")}
              </a>
            </p>
          ) : null}
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            {t(lang, "listing.new.photos")}
            <RequiredMark />
          </label>
          <input
            name="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            aria-invalid={Boolean(fieldErrors.photos)}
            onChange={() => clearFieldError("photos")}
            className="w-full text-sm"
          />
          <FieldError message={fieldErrors.photos} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            {t(lang, "listing.new.video")}
            <RequiredMark />
          </label>
          <input
            name="video"
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/3gpp"
            aria-invalid={Boolean(fieldErrors.video)}
            onChange={() => clearFieldError("video")}
            className="w-full text-sm"
          />
          <FieldError message={fieldErrors.video} />
        </div>
        <div>
          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => {
                setTerms(e.target.checked);
                clearFieldError("terms");
              }}
              className="mt-1 accent-[#1E6FE8]"
            />
            <span>
              {t(lang, "listing.new.terms")}
              <RequiredMark />
            </span>
          </label>
          <FieldError message={fieldErrors.terms} />
        </div>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#1E6FE8] text-white text-sm font-semibold rounded-full hover:bg-[#1D4ED8] disabled:opacity-50"
        >
          {loading ? t(lang, "common.loading") : t(lang, "listing.new.submit")}
        </button>
      </form>
    </div>
  );
}
