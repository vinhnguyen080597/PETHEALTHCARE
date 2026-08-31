"use client";

import { useEffect, useRef, useState } from "react";
import { mergeDealPhotoFiles } from "@/lib/dealPhotoUpload";

const ACCEPT = "image/jpeg,image/png,image/webp";

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

function Thumb({
  file,
  removeLabel,
  onRemove,
  disabled,
}: {
  file: File;
  removeLabel: string;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const url = useObjectUrl(file);
  return (
    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : null}
      <button
        type="button"
        disabled={disabled}
        aria-label={removeLabel}
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/65 text-white text-xs leading-none disabled:opacity-50"
      >
        ×
      </button>
    </div>
  );
}

/** Visible dashed photo picker for deal modals (handoff / cancel / dispute). */
export function DealPhotoPicker({
  files,
  max,
  disabled,
  invalid,
  dropHint,
  browseLabel,
  removeLabel,
  onChange,
}: {
  files: File[];
  max: number;
  disabled?: boolean;
  invalid?: boolean;
  dropHint: string;
  browseLabel: string;
  removeLabel: string;
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const atCap = files.length >= max;

  const pick = (list: FileList | File[] | null) => {
    if (disabled || atCap) return;
    onChange(mergeDealPhotoFiles(files, list, max));
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        if (!disabled && !atCap) setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled && !atCap) setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files);
      }}
      className={`rounded-xl border-2 border-dashed transition-colors ${
        invalid
          ? "border-red-400 bg-red-50/40"
          : dragging
            ? "border-[#D97706] bg-[#FFF8F0]"
            : "border-slate-200 bg-slate-50/70 hover:border-[#D97706]/50"
      }`}
    >
      <div className="px-3 py-4 text-center">
        <p className="text-sm text-slate-600">{dropHint}</p>
        <button
          type="button"
          disabled={disabled || atCap}
          onClick={() => inputRef.current?.click()}
          className="mt-2.5 inline-flex items-center justify-center px-4 py-2 rounded-full text-xs font-semibold bg-white border border-slate-200 text-[#5C4A3A] hover:border-[#D97706] disabled:opacity-50"
        >
          {browseLabel}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          disabled={disabled || atCap}
          className="sr-only"
          onChange={(e) => pick(e.target.files)}
        />
        {files.length > 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            {files.length}/{max}
          </p>
        ) : null}
      </div>
      {files.length > 0 ? (
        <div className="flex flex-wrap gap-2 px-3 pb-3">
          {files.map((file, index) => (
            <Thumb
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              file={file}
              removeLabel={removeLabel}
              disabled={disabled}
              onRemove={() =>
                onChange(files.filter((_, i) => i !== index))
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
