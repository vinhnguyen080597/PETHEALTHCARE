"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatNotificationBadge, HEADER_UNREAD_BADGE_CLASS } from "@/lib/notifications/badge";
import {
  countUnreadConversations,
  MESSAGES_UNREAD_POLL_MS,
  normalizeConversations,
} from "@/lib/messages";

/** Chat icon — polls conversation unread every 30s (parity with notification bell). */
export function MessagesUnreadBadge({
  label,
  initialCount = 0,
}: {
  label: string;
  initialCount?: number;
}) {
  const [count, setCount] = useState(Math.max(0, initialCount));

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/messages", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { data?: unknown };
      const next = countUnreadConversations(normalizeConversations(data.data));
      setCount(Math.max(0, next));
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
    }, MESSAGES_UNREAD_POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh]);

  return (
    <Link
      href="/app/messages"
      className="relative w-9 h-9 rounded-lg flex items-center justify-center text-stone-500 hover:bg-amber-50 hover:text-stone-900 transition-colors"
      aria-label={count > 0 ? `${label}, ${count}` : label}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M15.5 11.5c0 .83-.67 1.5-1.5 1.5H5.5L2.5 15.5v-12C2.5 2.67 3.17 2 4 2h10c.83 0 1.5.67 1.5 1.5v8Z" />
      </svg>
      {count > 0 ? (
        <span className={HEADER_UNREAD_BADGE_CLASS}>
          {formatNotificationBadge(count)}
        </span>
      ) : null}
    </Link>
  );
}
