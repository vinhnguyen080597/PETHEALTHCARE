"use client";

import { isChatVideoUrl } from "@/lib/messages";

export function ChatMessageMedia({ urls }: { urls: string[] }) {
  if (!urls.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {urls.map((url) =>
        isChatVideoUrl(url) ? (
          <video
            key={url}
            src={url}
            controls
            playsInline
            className="max-h-52 w-full max-w-[240px] rounded-xl bg-black"
          />
        ) : (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-xl bg-slate-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="max-h-52 w-full max-w-[240px] object-cover"
            />
          </a>
        ),
      )}
    </div>
  );
}
