"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import type { PetFeedNotification } from "@/lib/api/petFeed";
import { formatNotificationBadge, HEADER_UNREAD_BADGE_CLASS } from "@/lib/notifications/badge";
import {
  dispatchNotificationsRead,
  NOTIFICATIONS_PREVIEW_LIMIT,
  subscribeToggleNotifications,
} from "@/lib/notifications/inbox";
import { isNotificationUnread, notificationType } from "@/lib/notifications/deepLinks";
import { openPetFeedNotification } from "@/lib/notifications/open";
import { resolveRejectionNotice } from "@/lib/notifications/rejectionNotice";
import { fetchWithSession } from "@/lib/fetchWithSession";
import { useOptionalChatDock } from "@/components/messages/ChatDockProvider";
import { NotificationsInboxPopover } from "@/components/notifications/NotificationsInboxPopover";
import { DialogActions } from "@/components/ui/DialogActions";

const POLL_MS = 30_000;

function BellIcon() {
  return (
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
  );
}

/** Bell — opens a notifications dropdown (like chat), polls unread count every 30s. */
export function NotificationBell({
  lang,
  initialCount = 0,
  label,
}: {
  lang: Lang;
  initialCount?: number;
  label: string;
}) {
  const router = useRouter();
  const dock = useOptionalChatDock();
  const rootRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(Math.max(0, initialCount));
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PetFeedNotification[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [reasonItem, setReasonItem] = useState<PetFeedNotification | null>(null);

  const refreshCount = useCallback(async () => {
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

  const loadPreview = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const res = await fetchWithSession(
        `/api/notifications?limit=${NOTIFICATIONS_PREVIEW_LIMIT}`,
        { cache: "no-store" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : t(lang, "common.error"),
        );
      }
      setItems(Array.isArray(data.data) ? data.data : []);
      if (typeof data.unread_count === "number") {
        setCount(Math.max(0, data.unread_count));
      }
      setLoadedOnce(true);
    } catch (err) {
      setListError(err instanceof Error ? err.message : t(lang, "common.error"));
    } finally {
      setListLoading(false);
    }
  }, [lang]);

  const setOpenSafe = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setOpen((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        if (value) {
          dock?.setInboxOpen?.(false);
          void loadPreview();
        }
        return value;
      });
    },
    [dock, loadPreview],
  );

  const toggleOpen = useCallback(() => {
    setOpenSafe((prev) => !prev);
  }, [setOpenSafe]);

  useEffect(() => {
    setCount(Math.max(0, initialCount));
  }, [initialCount]);

  useEffect(() => {
    void refreshCount();

    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshCount();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshCount();
    };
    const onFocus = () => void refreshCount();
    const onMarkedRead = (event: Event) => {
      const detail = (event as CustomEvent<{ count?: number }>).detail;
      const delta = Number(detail?.count) || 0;
      if (delta > 0) {
        setCount((current) => Math.max(0, current - delta));
      } else {
        void refreshCount();
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
  }, [refreshCount]);

  useEffect(() => subscribeToggleNotifications(() => setOpenSafe((v) => !v)), [setOpenSafe]);

  useEffect(() => {
    if (dock?.inboxOpen) setOpen(false);
  }, [dock?.inboxOpen]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markIdsRead = async (ids: string[]) => {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    if (!uniqueIds.length) return;
    const idSet = new Set(uniqueIds);
    const readAt = new Date().toISOString();
    const marked = items.filter(
      (n) => idSet.has(n.id) && isNotificationUnread(n),
    ).length;
    setItems((cur) =>
      cur.map((n) =>
        idSet.has(n.id) && isNotificationUnread(n)
          ? { ...n, is_unread: false, read_at: n.read_at || readAt }
          : n,
      ),
    );
    if (marked > 0) {
      // Badge count updates via phc:notifications-read listener (avoid double-decrement).
      dispatchNotificationsRead(marked);
    }
    try {
      const res = await fetchWithSession("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: uniqueIds }),
      });
      if (!res.ok) {
        console.warn("mark notifications read failed", res.status);
      }
    } catch (err) {
      console.warn("mark notifications read failed", err);
    }
  };

  const onSelect = async (item: PetFeedNotification) => {
    await openPetFeedNotification({
      item,
      allItems: items,
      markIdsRead,
      navigate: (href) => {
        setOpen(false);
        router.push(href);
      },
      onRejection: (rejected) => {
        setOpen(false);
        setReasonItem(rejected);
      },
    });
  };

  const rejectionNotice = resolveRejectionNotice(reasonItem);
  const reason = rejectionNotice.reason;
  const adminAction = rejectionNotice.adminAction;
  const adminNote = rejectionNotice.adminNote;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
          open
            ? "bg-amber-100 text-amber-900"
            : "text-stone-500 hover:bg-amber-50 hover:text-stone-900"
        }`}
        aria-label={count > 0 ? `${label}, ${count}` : label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="notifications-inbox-popover"
      >
        <BellIcon />
        {count > 0 ? (
          <span className={HEADER_UNREAD_BADGE_CLASS}>
            {formatNotificationBadge(count)}
          </span>
        ) : null}
      </button>
      {open ? (
        <NotificationsInboxPopover
          lang={lang}
          items={items}
          loading={listLoading || !loadedOnce}
          error={listError}
          onSelect={(item) => void onSelect(item)}
          onClose={() => setOpen(false)}
        />
      ) : null}

      {reasonItem ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#2B1E19]/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#F0E6D8] bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-[#2B1E19]">
              {notificationType(reasonItem) === "listing_rejected"
                ? t(lang, "notifications.listingRejectedTitle")
                : notificationType(reasonItem) === "breeder_detail_rejected"
                  ? t(lang, "notifications.detailRejectedTitle")
                  : notificationType(reasonItem) === "farm_review_rejected"
                    ? t(lang, "notifications.farmReviewRejectedTitle")
                    : t(lang, "notifications.rejectedTitle")}
            </h3>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8B7355]">
                  {t(lang, "notifications.rejectionReason")}
                </p>
                <p className="mt-1 text-sm text-[#2B1E19] leading-relaxed">
                  {reason ||
                    (notificationType(reasonItem) === "listing_rejected"
                      ? t(lang, "notifications.listingRejectedReasonMissing")
                      : notificationType(reasonItem) === "breeder_detail_rejected"
                        ? t(lang, "notifications.detailRejectedBody")
                        : notificationType(reasonItem) === "farm_review_rejected"
                          ? t(lang, "notifications.farmReviewRejectedBody")
                          : t(lang, "notifications.rejectedBody"))}
                </p>
              </div>
              {adminAction ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8B7355]">
                    {t(lang, "notifications.adminAction")}
                  </p>
                  <p className="mt-1 text-sm text-[#2B1E19]">{adminAction}</p>
                </div>
              ) : null}
              {adminNote ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8B7355]">
                    {t(lang, "notifications.adminNote")}
                  </p>
                  <p className="mt-1 text-sm text-[#2B1E19]">{adminNote}</p>
                </div>
              ) : null}
            </div>
            <DialogActions>
              <button
                type="button"
                onClick={() => setReasonItem(null)}
                className="flex-1 rounded-full border border-[#F0E6D8] py-2.5 text-sm font-semibold text-[#5C4A3A]"
              >
                {t(lang, "common.cancel")}
              </button>
              <Link
                href={
                  notificationType(reasonItem) === "listing_rejected"
                    ? "/app/account"
                    : "/app/account/breeder"
                }
                onClick={() => setReasonItem(null)}
                className="flex-1 text-center rounded-full bg-[#D97706] py-2.5 text-sm font-semibold text-white hover:bg-[#B45309]"
              >
                {notificationType(reasonItem) === "listing_rejected"
                  ? t(lang, "notifications.listingRejectedCta")
                  : t(lang, "account.breederTrust.editProfile")}
              </Link>
            </DialogActions>
          </div>
        </div>
      ) : null}
    </div>
  );
}
