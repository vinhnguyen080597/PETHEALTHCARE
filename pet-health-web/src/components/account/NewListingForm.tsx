"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";

export function NewListingForm({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [terms, setTerms] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!terms) {
      setError(
        lang === "VI"
          ? "Vui lòng đồng ý Nội quy Marketplace"
          : "Please accept Marketplace Guidelines",
      );
      return;
    }
    setLoading(true);
    setError("");
    const form = e.currentTarget;
    const fd = new FormData(form);
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
      <form onSubmit={onSubmit} className="space-y-4">
        {(
          [
            ["title", lang === "VI" ? "Tiêu đề" : "Title", "text"],
            ["species", lang === "VI" ? "Loài (cat/dog)" : "Species", "text"],
            ["breed", lang === "VI" ? "Giống" : "Breed", "text"],
            ["gender", lang === "VI" ? "Giới tính (male/female)" : "Gender", "text"],
            ["ageMonths", lang === "VI" ? "Tuổi (tháng)" : "Age (months)", "number"],
            ["location", lang === "VI" ? "Khu vực" : "Location", "text"],
            ["priceNote", lang === "VI" ? "Giá" : "Price", "text"],
            ["vaccineStatus", "Vaccine", "text"],
            ["dewormingStatus", lang === "VI" ? "Tẩy giun" : "Deworming", "text"],
          ] as const
        ).map(([name, label, type]) => (
          <div key={name}>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {label}
            </label>
            <input
              name={name}
              type={type}
              required={name === "title" || name === "species"}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20 focus:border-[#1E6FE8]"
            />
          </div>
        ))}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            {lang === "VI" ? "Mô tả" : "Description"}
          </label>
          <textarea
            name="description"
            rows={4}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20 focus:border-[#1E6FE8]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            {t(lang, "listing.new.photos")}
          </label>
          <input
            name="photos"
            type="file"
            accept="image/*"
            multiple
            className="w-full text-sm"
          />
        </div>
        <label className="flex items-start gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-1 accent-[#1E6FE8]"
          />
          <span>{t(lang, "listing.new.terms")}</span>
        </label>
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
