"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import type { PetFeedNotification } from "@/lib/api/petFeed";
import {
  adminRequestHref,
  breederTransparencyNotificationHref,
  isAdminQueueNotification,
  isDepositCancelRequestNotification,
  listingNotificationHref,
  notificationInboxCta,
  notificationType,
  isNotificationUnread,
} from "@/lib/notifications/deepLinks";
import { resolveRejectionNotice } from "@/lib/notifications/rejectionNotice";
import { DialogActions } from "@/components/ui/DialogActions";

function formatTime(value: string | undefined, lang: Lang) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString(lang === "VI" ? "vi-VN" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const [error, setError] = useState("");
  const [reasonItem, setReasonItem] = useState<PetFeedNotification | null>(null);
  const [cancelItem, setCancelItem] = useState<PetFeedNotification | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelDone, setCancelDone] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/notifications?limit=50", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      setItems(Array.isArray(data.data) ? data.data : []);
      setUnreadCount(Number(data.unread_count) || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "common.error"));
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    setItems(initialNotifications);
    setUnreadCount(initialUnreadCount);
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
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("phc:notifications-read", { detail: { count: marked } }),
        );
      }
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
    const type = notificationType(item);
    if (isNotificationUnread(item)) {
      await markIdsRead([item.id]);
    }

    if (isAdminQueueNotification(item)) {
      router.push(adminRequestHref(item));
      return;
    }
    if (
      type === "breeder_rejected" ||
      type === "listing_rejected" ||
      type === "breeder_detail_rejected"
    ) {
      setReasonItem(item);
      return;
    }
    const farmHref = breederTransparencyNotificationHref(item);
    if (farmHref) {
      router.push(farmHref);
      return;
    }
    if (isDepositCancelRequestNotification(item)) {
      setCancelError("");
      setCancelDone(false);
      setCancelItem(item);
      return;
    }
    if (item.post_id) {
      const unreadIds = items
        .filter(
          (n) =>
            isNotificationUnread(n) &&
            n.post_id === item.post_id &&
            n.id !== item.id,
        )
        .map((n) => n.id);
      if (unreadIds.length) await markIdsRead(unreadIds);
      router.push(
        listingNotificationHref(item) ||
          `/app/pet-feed/posts/${encodeURIComponent(item.post_id)}`,
      );
    }
  };

  const confirmDepositCancel = async () => {
    const postId = String(cancelItem?.post_id || "").trim();
    if (!postId) return;
    setCancelBusy(true);
    setCancelError("");
    try {
      const res = await fetch(
        `/api/listings/${encodeURIComponent(postId)}/deposit/cancel/confirm`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : t(lang, "common.error"),
        );
      }
      setCancelDone(true);
    } catch (err) {
      setCancelError(
        err instanceof Error ? err.message : t(lang, "common.error"),
      );
    } finally {
      setCancelBusy(false);
    }
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
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("phc:notifications-read", {
          detail: { count: unreadIds.length || unreadCount },
        }),
      );
    }
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

  const titleFor = (item: PetFeedNotification) => {
    const type = notificationType(item);
    if (type === "breeder_verified") return t(lang, "notifications.verifiedTitle");
    if (type === "breeder_rejected") return t(lang, "notifications.rejectedTitle");
    if (type === "listing_approved") return t(lang, "notifications.listingApprovedTitle");
    if (type === "listing_rejected") return t(lang, "notifications.listingRejectedTitle");
    if (type === "breeder_detail_approved") {
      return t(lang, "notifications.detailApprovedTitle");
    }
    if (type === "breeder_detail_rejected") {
      return t(lang, "notifications.detailRejectedTitle");
    }
    if (type === "transparency_warning") {
      return t(lang, "notifications.transparencyWarningTitle");
    }
    if (type === "transparency_warning_resolved") {
      return t(lang, "notifications.transparencyResolvedTitle");
    }
    if (type === "admin_breeder_pending") return t(lang, "notifications.adminBreederTitle");
    if (type === "admin_breeder_detail_pending") {
      return t(lang, "notifications.adminDetailTitle");
    }
    if (type === "admin_transparency_appeal") {
      return t(lang, "notifications.adminAppealTitle");
    }
    if (type === "admin_listing_pending") return t(lang, "notifications.adminListingTitle");
    if (type === "admin_report_open") return t(lang, "notifications.adminReportTitle");
    if (type === "deposit_cancel_request") {
      return t(lang, "notifications.depositCancelTitle");
    }
    return item.actor_display_name || t(lang, "notifications.someone");
  };

  const bodyFor = (item: PetFeedNotification) => {
    const type = notificationType(item);
    if (type === "breeder_verified") {
      return item.body_preview || t(lang, "notifications.verifiedBody");
    }
    if (type === "breeder_rejected") {
      return (
        item.rejection_reason ||
        item.body_preview ||
        t(lang, "notifications.rejectedBody")
      );
    }
    if (type === "listing_approved") {
      return item.body_preview || t(lang, "notifications.listingApprovedBody");
    }
    if (type === "listing_rejected") {
      return (
        resolveRejectionNotice(item).reason ||
        t(lang, "notifications.listingRejectedBody")
      );
    }
    if (type === "breeder_detail_approved") {
      return item.body_preview || t(lang, "notifications.detailApprovedBody");
    }
    if (type === "breeder_detail_rejected") {
      return (
        resolveRejectionNotice(item).reason ||
        item.body_preview ||
        t(lang, "notifications.detailRejectedBody")
      );
    }
    if (type === "transparency_warning") {
      return item.body_preview || t(lang, "notifications.transparencyWarningBody");
    }
    if (type === "transparency_warning_resolved") {
      return item.body_preview || t(lang, "notifications.transparencyResolvedBody");
    }
    if (type === "admin_breeder_pending") {
      return item.body_preview || t(lang, "notifications.adminBreederBody");
    }
    if (type === "admin_breeder_detail_pending") {
      return item.body_preview || t(lang, "notifications.adminDetailBody");
    }
    if (type === "admin_transparency_appeal") {
      return item.body_preview || t(lang, "notifications.adminAppealBody");
    }
    if (type === "admin_listing_pending") {
      return item.body_preview || t(lang, "notifications.adminListingBody");
    }
    if (type === "admin_report_open") {
      return item.body_preview || t(lang, "notifications.adminReportBody");
    }
    if (type === "deposit_cancel_request") {
      return item.body_preview || t(lang, "notifications.depositCancelBody");
    }
    return item.body_preview || t(lang, "notifications.commentFallback");
  };

  const ctaFor = (item: PetFeedNotification) =>
    notificationInboxCta(item, {
      verified: t(lang, "notifications.verifiedCta"),
      rejected: t(lang, "notifications.rejectedCta"),
      listingApproved: t(lang, "notifications.listingApprovedCta"),
      listingRejected: t(lang, "notifications.listingRejectedCta"),
      adminRequest: t(lang, "notifications.adminRequestCta"),
      detailApproved: t(lang, "notifications.detailApprovedCta"),
      detailRejected: t(lang, "notifications.detailRejectedCta"),
      transparencyWarning: t(lang, "notifications.transparencyWarningCta"),
      transparencyResolved: t(lang, "notifications.transparencyResolvedCta"),
      depositCancelConfirm: t(lang, "notifications.depositCancelCta"),
      depositConfirm: t(lang, "notifications.depositRequestCta"),
      dealCompleteConfirm: t(lang, "notifications.dealCompleteCta"),
      viewListing: t(lang, "notifications.viewListing"),
    });

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
        <ul className="space-y-2">
          {items.map((item) => {
            const type = notificationType(item);
            const cta = ctaFor(item);
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
                    ) : type === "breeder_verified" ||
                      type === "listing_approved" ||
                      type === "breeder_detail_approved" ||
                      type === "transparency_warning_resolved" ? (
                      "✅"
                    ) : type === "breeder_rejected" ||
                      type === "listing_rejected" ||
                      type === "breeder_detail_rejected" ||
                      type === "transparency_warning" ? (
                      "⚠️"
                    ) : isAdminQueueNotification(type) ? (
                      "📋"
                    ) : (
                      "🔔"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-[#2B1E19] truncate">
                        {titleFor(item)}
                      </p>
                      <span className="shrink-0 text-[11px] text-stone-400">
                        {formatTime(item.created_at, lang)}
                      </span>
                    </div>
                    {type === "post_comment" ? (
                      <p className="mt-0.5 text-xs text-[#6E5A51] truncate">
                        {item.post_title || t(lang, "notifications.postFallback")}
                      </p>
                    ) : null}
                    <p className="mt-1.5 text-sm text-[#2B1E19] line-clamp-2">
                      {bodyFor(item)}
                    </p>
                    {cta ? (
                      <p className="mt-2 text-xs font-semibold text-[#D97706]">{cta} →</p>
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
      )}

      {reasonItem ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#2B1E19]/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#F0E6D8] bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-[#2B1E19]">
              {notificationType(reasonItem) === "listing_rejected"
                ? t(lang, "notifications.listingRejectedTitle")
                : notificationType(reasonItem) === "breeder_detail_rejected"
                  ? t(lang, "notifications.detailRejectedTitle")
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

      {cancelItem ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#2B1E19]/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#F0E6D8] bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-[#2B1E19]">
              {t(lang, "notifications.depositCancelTitle")}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[#2B1E19]">
              {cancelItem.body_preview || t(lang, "notifications.depositCancelBody")}
            </p>
            {cancelError ? (
              <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {cancelError}
              </p>
            ) : null}
            {cancelDone ? (
              <p className="mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                {t(lang, "notifications.depositCancelSuccess")}
              </p>
            ) : null}
            <DialogActions>
              <button
                type="button"
                onClick={() => setCancelItem(null)}
                className="flex-1 rounded-full border border-[#F0E6D8] py-2.5 text-sm font-semibold text-[#5C4A3A]"
              >
                {t(lang, "common.cancel")}
              </button>
              {!cancelDone ? (
                <button
                  type="button"
                  disabled={cancelBusy || !cancelItem.post_id}
                  onClick={() => void confirmDepositCancel()}
                  className="flex-1 rounded-full bg-[#D97706] py-2.5 text-sm font-semibold text-white hover:bg-[#B45309] disabled:opacity-60"
                >
                  {cancelBusy
                    ? t(lang, "common.loading")
                    : t(lang, "notifications.depositCancelCta")}
                </button>
              ) : cancelItem.post_id ? (
                <Link
                  href={
                    listingNotificationHref(cancelItem) ||
                    `/app/pet-feed/posts/${encodeURIComponent(cancelItem.post_id)}`
                  }
                  onClick={() => setCancelItem(null)}
                  className="flex-1 text-center rounded-full bg-[#D97706] py-2.5 text-sm font-semibold text-white hover:bg-[#B45309]"
                >
                  {t(lang, "notifications.viewListing")}
                </Link>
              ) : null}
            </DialogActions>
          </div>
        </div>
      ) : null}
    </div>
  );
}
