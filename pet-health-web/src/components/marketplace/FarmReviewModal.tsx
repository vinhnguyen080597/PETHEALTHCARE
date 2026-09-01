"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import { LISTING_ACTION_MODAL_Z_CLASS } from "@/lib/listingModalLayers";
import { DialogActions } from "@/components/ui/DialogActions";
import {
  FARM_REVIEW_MAX_PHOTOS,
  canAddFarmReviewPhoto,
  validateFarmReviewInput,
} from "@/lib/breederFarmReviews";

function StarRow({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          className={`text-2xl leading-none ${value >= n ? "text-amber-500" : "text-slate-300"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function FarmReviewModal({
  lang,
  open,
  busy = false,
  error = "",
  onClose,
  onSubmit,
}: {
  lang: Lang;
  open: boolean;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (payload: { rating: number; body: string; photoUrls: string[] }) => void | Promise<void>;
}) {
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [localError, setLocalError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setRating(0);
    setBody("");
    setPhotoFiles([]);
    setPhotoPreviewUrls([]);
    setLocalError("");
    setUploading(false);
  }, [open]);

  useEffect(() => {
    return () => {
      for (const url of photoPreviewUrls) URL.revokeObjectURL(url);
    };
  }, [photoPreviewUrls]);

  if (!open) return null;

  const photosHint = t(lang, "farm.review.photosHint").replace(
    "{{count}}",
    String(FARM_REVIEW_MAX_PHOTOS),
  );

  const addPhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = FARM_REVIEW_MAX_PHOTOS - photoFiles.length;
    const next = Array.from(files).slice(0, remaining);
    if (!next.length) {
      setLocalError(
        t(lang, "farm.review.photosLimit").replace("{{count}}", String(FARM_REVIEW_MAX_PHOTOS)),
      );
      return;
    }
    setPhotoFiles((current) => [...current, ...next].slice(0, FARM_REVIEW_MAX_PHOTOS));
    setPhotoPreviewUrls((current) => [
      ...current,
      ...next.map((file) => URL.createObjectURL(file)),
    ].slice(0, FARM_REVIEW_MAX_PHOTOS));
    setLocalError("");
  };

  const removePhoto = (index: number) => {
    setPhotoFiles((current) => current.filter((_, i) => i !== index));
    setPhotoPreviewUrls((current) => {
      const removed = current[index];
      if (removed) URL.revokeObjectURL(removed);
      return current.filter((_, i) => i !== index);
    });
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of photoFiles) {
      const fd = new FormData();
      fd.append("file", file, file.name || "farm-review.jpg");
      const res = await fetch("/api/uploads/farm-review-photo", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.data?.publicUrl) {
        throw new Error(data.error || t(lang, "farm.review.photoUploadFailed"));
      }
      urls.push(String(data.data.publicUrl));
    }
    return urls;
  };

  const submit = async () => {
    const err = validateFarmReviewInput({ rating, body, photoUrls: [] });
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError("");
    setUploading(true);
    try {
      const photoUrls = await uploadPhotos();
      const photoErr = validateFarmReviewInput({ rating, body, photoUrls });
      if (photoErr) {
        setLocalError(photoErr);
        return;
      }
      await onSubmit({ rating, body: body.trim(), photoUrls });
    } catch (uploadErr) {
      setLocalError(
        uploadErr instanceof Error ? uploadErr.message : t(lang, "farm.review.photoUploadFailed"),
      );
    } finally {
      setUploading(false);
    }
  };

  const disabled = busy || uploading;

  return (
    <div
      className={`fixed inset-0 ${LISTING_ACTION_MODAL_Z_CLASS} flex items-center justify-center p-4`}
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (!disabled) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-slate-900">{t(lang, "farm.review.modalTitle")}</h2>
        <p className="mt-1 text-sm text-slate-600">{t(lang, "farm.review.modalHint")}</p>
        <div className="mt-4">
          <StarRow value={rating} onChange={setRating} />
        </div>
        <textarea
          className="mt-4 w-full min-h-[96px] rounded-xl border border-slate-200 p-3 text-sm"
          placeholder={t(lang, "farm.review.bodyPlaceholder")}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
        />
        <p className="mt-1 text-right text-xs text-slate-400">{body.length}/500</p>

        <p className="mt-3 text-sm font-medium text-slate-700">{photosHint}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {photoPreviewUrls.map((url, index) => (
            <div key={url} className="relative h-20 w-20 overflow-hidden rounded-xl bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label={t(lang, "farm.review.photosRemove")}
                onClick={() => removePhoto(index)}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
          {canAddFarmReviewPhoto(photoFiles.length) ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  addPhotos(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
                className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs font-medium text-slate-500 disabled:opacity-60"
              >
                <span className="text-lg leading-none">+</span>
                {t(lang, "farm.review.photosAdd")}
              </button>
            </>
          ) : null}
        </div>

        {localError || error ? (
          <p className="mt-2 text-sm text-red-600">{localError || error}</p>
        ) : null}
        {uploading ? (
          <p className="mt-2 text-sm text-slate-500">{t(lang, "farm.review.photosUploading")}</p>
        ) : null}
        <DialogActions>
          <button
            type="button"
            disabled={disabled}
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-full disabled:opacity-60"
          >
            {t(lang, "common.cancel")}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => void submit()}
            className="flex-1 py-2.5 bg-[#D97706] text-white text-sm font-medium rounded-full hover:bg-[#B45309] disabled:opacity-60"
          >
            {busy || uploading
              ? t(lang, "farm.review.submitting")
              : t(lang, "farm.review.submit")}
          </button>
        </DialogActions>
      </div>
    </div>
  );
}
