"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatNotificationBadge, HEADER_UNREAD_BADGE_CLASS } from "@/lib/notifications/badge";
import { fetchWithSession } from "@/lib/fetchWithSession";

const POLL_MS = 30_000;

/** Bell next to chat — polls unread count every 30s like mobile. */
export function NotificationBell({
  initialCount = 0,
  label,
}: {
  initialCount?: number;
  label: string;
}) {
  const [count, setCount] = useState(Math.max(0, initialCount));

  const refresh = useCallback(async () => {
    try {
      const res = await fetchWithSession("/api/notifications/unread-count", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { data?: { unread_count?: number } };
      setCount(Math.max(0, Number(data?.data?.unread_count) || 0));
    } catch {
      // Ignore transient poll errors.
    }
  }, []);

  useEffect(() => {
    setCount(Math.max(0, initialCount));
  }, [initialCount]);

  useEffect(() => {
    void refresh();

    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onFocus = () => void refresh();
    const onMarkedRead = (event: Event) => {
      const detail = (event as CustomEvent<{ count?: number }>).detail;
      const delta = Number(detail?.count) || 0;
      if (delta > 0) {
        setCount((current) => Math.max(0, current - delta));
      } else {
        void refresh();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("phc:notifications-read", onMarkedRead);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("phc:notifications-read", onMarkedRead);
    };
  }, [refresh]);

  return (
    <Link
      href="/app/notifications"
      className="relative w-9 h-9 rounded-lg flex items-center justify-center text-stone-500 hover:bg-amber-50 hover:text-stone-900 transition-colors"
      aria-label={count > 0 ? `${label}, ${count}` : label}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {count > 0 ? (
        <span className={HEADER_UNREAD_BADGE_CLASS}>
          {formatNotificationBadge(count)}
        </span>
      ) : null}
    </Link>
  );
}
