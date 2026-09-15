"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import type { PetFeedNotification } from "@/lib/api/petFeed";
import {
  isNotificationUnread,
  notificationType,
} from "@/lib/notifications/deepLinks";
import {
  dispatchNotificationsRead,
  formatNotificationListTime,
  notificationBody,
  notificationCtaLabel,
  notificationThumbEmoji,
  notificationTitle,
  NOTIFICATIONS_PAGE_LIMIT,
  NOTIFICATIONS_PAGE_LOAD_STEP,
} from "@/lib/notifications/inbox";
import { openPetFeedNotification } from "@/lib/notifications/open";
import { resolveRejectionNotice } from "@/lib/notifications/rejectionNotice";
import { DialogActions } from "@/components/ui/DialogActions";

export function NotificationsClient({
  lang,
  initialNotifications,
  initialUnreadCount,
}: {
  lang: Lang;
  initialNotifications: PetFeedNotification[];
  initialUnreadCount: number;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [reasonItem, setReasonItem] = useState<PetFeedNotification | null>(null);
  const [fetchLimit, setFetchLimit] = useState(
    Math.max(NOTIFICATIONS_PAGE_LIMIT, initialNotifications.length || 0),
  );

  const fetchList = useCallback(
    async (limit: number, mode: "replace" | "more") => {
      if (mode === "more") setLoadingMore(true);
      else setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/notifications?limit=${limit}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed");
        setItems(Array.isArray(data.data) ? data.data : []);
        setUnreadCount(Number(data.unread_count) || 0);
        setFetchLimit(limit);
      } catch (err) {
        setError(err instanceof Error ? err.message : t(lang, "common.error"));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [lang],
  );

  const refresh = useCallback(async () => {
    await fetchList(fetchLimit || NOTIFICATIONS_PAGE_LIMIT, "replace");
  }, [fetchList, fetchLimit]);

  useEffect(() => {
    setItems(initialNotifications);
    setUnreadCount(initialUnreadCount);
    setFetchLimit(
      Math.max(NOTIFICATIONS_PAGE_LIMIT, initialNotifications.length || 0),
    );
  }, [initialNotifications, initialUnreadCount]);

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
      setUnreadCount((c) => Math.max(0, c - marked));
      dispatchNotificationsRead(marked);
    }
    try {
      const res = await fetch("/api/notifications/read", {
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

  const openNotification = async (item: PetFeedNotification) => {
    await openPetFeedNotification({
      item,
      allItems: items,
      markIdsRead,
      navigate: (href) => router.push(href),
      onRejection: setReasonItem,
    });
  };

  const markAllRead = async () => {
    if (unreadCount <= 0) return;
    const unreadIds = items.filter(isNotificationUnread).map((n) => n.id);
    const readAt = new Date().toISOString();
    setItems((cur) =>
      cur.map((n) =>
        isNotificationUnread(n)
          ? { ...n, is_unread: false, read_at: n.read_at || readAt }
          : n,
      ),
    );
    setUnreadCount(0);
    dispatchNotificationsRead(unreadIds.length || unreadCount);
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch (err) {
      console.warn("mark all notifications read failed", err);
    }
  };

  const canLoadMore =
    items.length >= fetchLimit && fetchLimit < 100 && items.length > 0;

  const rejectionNotice = resolveRejectionNotice(reasonItem);
  const reason = rejectionNotice.reason;
  const adminAction = rejectionNotice.adminAction;
  const adminNote = rejectionNotice.adminNote;

  return (
    <div className="max-w-[720px] mx-auto px-5 lg:px-8 py-6">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold text-[#2B1E19]">
          {t(lang, "notifications.title")}
        </h1>
        <div className="flex items-center gap-2">
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs font-semibold text-[#D97706] hover:text-[#B45309]"
            >
              {t(lang, "notifications.markAllRead")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="text-xs font-medium text-stone-500 hover:text-[#2B1E19] disabled:opacity-50"
          >
            {loading ? t(lang, "common.loading") : t(lang, "notifications.refresh")}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-[#F0E6D8] bg-white px-5 py-12 text-center">
          <p className="text-sm text-[#6E5A51]">{t(lang, "notifications.empty")}</p>
          <Link
            href="/app/pet-feed"
            className="inline-block mt-4 px-5 py-2.5 rounded-full bg-[#D97706] text-white text-sm font-semibold hover:bg-[#B45309]"
          >
            {t(lang, "nav.browse")}
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((item) => {
              const type = notificationType(item);
              const cta = notificationCtaLabel(lang, item);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => void openNotification(item)}
                    className={`w-full text-left flex gap-3 rounded-2xl border p-3.5 transition-colors ${
                      isNotificationUnread(item)
                        ? "border-amber-200 bg-amber-50/60 hover:bg-amber-50"
                        : "border-[#F0E6D8] bg-white hover:bg-[#FDFBF7]"
                    }`}
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#F0E6D8] flex items-center justify-center text-lg">
                      {item.post_thumb_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.post_thumb_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span aria-hidden>{notificationThumbEmoji(item)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[#2B1E19] truncate">
                          {notificationTitle(lang, item)}
                        </p>
                        <span className="shrink-0 text-[11px] text-stone-400">
                          {formatNotificationListTime(item.created_at, lang)}
                        </span>
                      </div>
                      {type === "post_comment" ? (
                        <p className="mt-0.5 text-xs text-[#6E5A51] truncate">
                          {item.post_title ||
                            t(lang, "notifications.postFallback")}
                        </p>
                      ) : null}
                      <p className="mt-1.5 text-sm text-[#2B1E19] line-clamp-2">
                        {notificationBody(lang, item)}
                      </p>
                      {cta ? (
                        <p className="mt-2 text-xs font-semibold text-[#D97706]">
                          {cta} →
                        </p>
                      ) : null}
                    </div>
                    {isNotificationUnread(item) ? (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#D97706]" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {canLoadMore ? (
            <div className="mt-4 text-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() =>
                  void fetchList(
                    Math.min(100, fetchLimit + NOTIFICATIONS_PAGE_LOAD_STEP),
                    "more",
                  )
                }
                className="text-sm font-semibold text-[#D97706] hover:text-[#B45309] disabled:opacity-50"
              >
                {loadingMore
                  ? t(lang, "common.loading")
                  : t(lang, "notifications.loadMore")}
              </button>
            </div>
          ) : null}
        </>
      )}

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
