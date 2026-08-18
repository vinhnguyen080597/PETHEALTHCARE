"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { formatNotificationBadge, HEADER_UNREAD_BADGE_CLASS } from "@/lib/notifications/badge";
import { MESSAGES_PAGE_HREF } from "@/lib/messages";
import { useOptionalChatDock } from "@/components/messages/ChatDockProvider";
import { MessagesInboxPopover } from "@/components/messages/MessagesInboxPopover";

function ChatIcon() {
  return (
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
  );
}

/** Chat icon — opens an inbox dropdown instead of navigating to /app/messages. */
export function MessagesUnreadBadge({
  label,
}: {
  label: string;
  initialCount?: number;
}) {
  const dock = useOptionalChatDock();
  const enableInboxPolling = dock?.enableInboxPolling;
  const inboxOpen = dock?.inboxOpen;
  const setInboxOpen = dock?.setInboxOpen;
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    enableInboxPolling?.();
  }, [enableInboxPolling]);

  useEffect(() => {
    if (!inboxOpen || !setInboxOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setInboxOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInboxOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [inboxOpen, setInboxOpen]);

  if (!dock) {
    return (
      <Link
        href={MESSAGES_PAGE_HREF}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-stone-500 hover:bg-amber-50 hover:text-stone-900 transition-colors"
        aria-label={label}
      >
        <ChatIcon />
      </Link>
    );
  }

  const count = Math.max(0, dock.unreadCount);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={dock.toggleInbox}
        className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
          inboxOpen
            ? "bg-amber-100 text-amber-900"
            : "text-stone-500 hover:bg-amber-50 hover:text-stone-900"
        }`}
        aria-label={count > 0 ? `${label}, ${count}` : label}
        aria-haspopup="dialog"
        aria-expanded={inboxOpen}
        aria-controls="messages-inbox-popover"
      >
        <ChatIcon />
        {count > 0 ? (
          <span className={HEADER_UNREAD_BADGE_CLASS}>
            {formatNotificationBadge(count)}
          </span>
        ) : null}
      </button>
      {inboxOpen ? <MessagesInboxPopover /> : null}
    </div>
  );
}
