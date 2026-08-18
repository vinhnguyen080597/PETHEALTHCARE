"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import { brandUi } from "@/lib/brand";
import {
  appendChatMediaFiles,
  CHAT_MEDIA_ACCEPT,
  CHAT_MEDIA_MAX,
  chatMediaKindFromFile,
  MESSAGE_MAX_LEN,
  messageHasSendableContent,
  type ChatMediaPickError,
} from "@/lib/messages";

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

function AttachmentThumb({
  file,
  onRemove,
  disabled,
  removeLabel,
}: {
  file: File;
  onRemove: () => void;
  disabled?: boolean;
  removeLabel: string;
}) {
  const url = useObjectUrl(file);
  const kind = chatMediaKindFromFile(file);
  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#F0E6D8] bg-slate-100">
      {kind === "video" ? (
        url ? (
          <video src={url} className="h-full w-full object-cover" muted />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
            ▶
          </div>
        )
      ) : url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : null}
      <button
        type="button"
        disabled={disabled}
        aria-label={removeLabel}
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/65 text-white text-xs leading-none disabled:opacity-50"
      >
        ×
      </button>
    </div>
  );
}

function pickErrorMessage(lang: Lang, error: ChatMediaPickError): string {
  if (error === "too_many") return t(lang, "messages.mediaTooMany");
  if (error === "video_too_large") return t(lang, "messages.videoTooLarge");
  return t(lang, "messages.mediaUnsupported");
}

export function ChatComposer({
  lang,
  draft,
  onDraftChange,
  files,
  onFilesChange,
  sending,
  sendError,
  compact = false,
  onSend,
}: {
  lang: Lang;
  draft: string;
  onDraftChange: (value: string) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  sending: boolean;
  sendError: string;
  compact?: boolean;
  onSend: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickError, setPickError] = useState("");
  const canSend = messageHasSendableContent(draft, files.length) && !sending;
  const pad = compact ? "p-2.5" : "p-3";
  const inputPad = compact ? "px-3.5 py-2" : "px-4 py-2.5";
  const sendPad = compact ? "px-3.5 py-2" : "px-4 py-2.5";

  return (
    <div className={`border-t border-[#F0E6D8] ${pad} space-y-2`}>
      {files.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {files.map((file, index) => (
            <AttachmentThumb
              key={`${file.name}-${file.size}-${index}`}
              file={file}
              disabled={sending}
              removeLabel={t(lang, "messages.removeAttachment")}
              onRemove={() =>
                onFilesChange(files.filter((_, i) => i !== index))
              }
            />
          ))}
        </div>
      ) : null}
      {sendError || pickError ? (
        <p className="text-xs text-red-600">{sendError || pickError}</p>
      ) : null}
      <div className="flex items-end gap-1.5">
        <button
          type="button"
          disabled={sending || files.length >= CHAT_MEDIA_MAX}
          onClick={() => inputRef.current?.click()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-40"
          aria-label={t(lang, "messages.attach")}
          title={t(lang, "messages.attach")}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="8.5" cy="10" r="1.5" />
            <path d="M21 16l-5-5-4 4-2-2-5 5" />
          </svg>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={CHAT_MEDIA_ACCEPT}
          multiple
          className="sr-only"
          disabled={sending}
          onChange={(e) => {
            const picked = appendChatMediaFiles(files, e.target.files);
            onFilesChange(picked.files);
            setPickError(picked.error ? pickErrorMessage(lang, picked.error) : "");
            e.target.value = "";
          }}
        />
        <input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value.slice(0, MESSAGE_MAX_LEN))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
          placeholder={t(lang, "messages.placeholder")}
          disabled={sending}
          className={`flex-1 ${inputPad} bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 ${brandUi.primaryFocusRing} disabled:opacity-60`}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className={`${sendPad} ${brandUi.primaryBg} ${brandUi.primaryBgHover} text-white text-sm font-semibold rounded-full disabled:opacity-50`}
        >
          {t(lang, "detail.send")}
        </button>
      </div>
    </div>
  );
}
