"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import type { PetFeedNotification } from "@/lib/api/petFeed";
import { brandUi } from "@/lib/brand";
import {
  filterInboxNotifications,
  formatNotificationPreviewTime,
  notificationBody,
  notificationThumbEmoji,
  notificationTitle,
  NOTIFICATION_FILTER_ALL,
  NOTIFICATION_FILTER_UNREAD,
  NOTIFICATIONS_PAGE_HREF,
  type NotificationFilter,
} from "@/lib/notifications/inbox";
import { isNotificationUnread, notificationType } from "@/lib/notifications/deepLinks";
import { Skeleton } from "@/components/ui/Skeleton";

export function NotificationsInboxPopover({
  lang,
  items,
  loading,
  error,
  onSelect,
  onClose,
}: {
  lang: Lang;
  items: PetFeedNotification[];
  loading: boolean;
  error: string;
  onSelect: (item: PetFeedNotification) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<NotificationFilter>(NOTIFICATION_FILTER_ALL);

  const visible = useMemo(
    () => filterInboxNotifications(items, { query, filter, lang }),
    [items, query, filter, lang],
  );

  return (
    <div
      id="notifications-inbox-popover"
      role="dialog"
      aria-label={t(lang, "notifications.title")}
      className="absolute right-0 top-[calc(100%+8px)] z-[60] w-[min(calc(100vw-1.5rem),22.5rem)] overflow-hidden rounded-2xl border border-[#F0E6D8] bg-white shadow-[0_18px_50px_-18px_rgba(43,30,25,0.45)]"
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h2 className="text-xl font-bold text-[#2B1E19]">
          {t(lang, "notifications.title")}
        </h2>
      </div>

      <div className="px-3 pb-2">
        <label className="sr-only" htmlFor="notifications-inbox-search">
          {t(lang, "notifications.searchPlaceholder")}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6E5A51]/70">
            🔍
          </span>
          <input
            id="notifications-inbox-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(lang, "notifications.searchPlaceholder")}
            className="h-9 w-full rounded-full border border-[#F3E2C8] bg-[#FDFBF7] pl-8 pr-3 text-sm text-[#2B1E19] placeholder:text-[#6E5A51]/55 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-[#D97706]"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 px-3 pb-2">
        {(
          [
            [NOTIFICATION_FILTER_ALL, "notifications.filterAll"],
            [NOTIFICATION_FILTER_UNREAD, "notifications.filterUnread"],
          ] as const
        ).map(([id, labelKey]) => {
          const active = filter === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                active
                  ? "bg-amber-100 text-amber-900"
                  : "text-stone-600 hover:bg-amber-50"
              }`}
            >
              {t(lang, labelKey)}
            </button>
          );
        })}
      </div>

      <div className="max-h-[min(28rem,55vh)] overflow-y-auto">
        {error ? (
          <p className="mx-3 mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading && items.length === 0 ? (
          <ul className="px-2 pb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-2 py-2.5">
                <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </li>
            ))}
          </ul>
        ) : visible.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm font-semibold text-slate-700">
              {filter === NOTIFICATION_FILTER_UNREAD
                ? t(lang, "notifications.unreadEmpty")
                : t(lang, "notifications.empty")}
            </p>
          </div>
        ) : (
          <ul>
            {visible.map((item) => {
              const unread = isNotificationUnread(item);
              const type = notificationType(item);
              const time = formatNotificationPreviewTime(item.created_at, lang);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-amber-50/70"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#F0E6D8] flex items-center justify-center text-lg">
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
                      {unread ? (
                        <span
                          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ${brandUi.primaryDot} ring-2 ring-white`}
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`truncate text-sm ${
                            unread
                              ? "font-bold text-slate-900"
                              : "font-semibold text-slate-800"
                          }`}
                        >
                          {notificationTitle(lang, item)}
                        </p>
                        {time ? (
                          <span className="shrink-0 text-[11px] text-slate-400">
                            {time}
                          </span>
                        ) : null}
                      </div>
                      {type === "post_comment" ? (
                        <p className="truncate text-[11px] text-slate-500">
                          {item.post_title ||
                            t(lang, "notifications.postFallback")}
                        </p>
                      ) : null}
                      <p
                        className={`mt-0.5 line-clamp-2 text-xs ${
                          unread
                            ? "font-semibold text-slate-700"
                            : "text-slate-400"
                        }`}
                      >
                        {notificationBody(lang, item)}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-[#F0E6D8] px-3 py-2">
        <Link
          href={NOTIFICATIONS_PAGE_HREF}
          onClick={onClose}
          className={`block rounded-lg px-2 py-1.5 text-center text-xs font-semibold ${brandUi.primaryText} hover:bg-amber-50`}
        >
          {t(lang, "notifications.seeAll")}
        </Link>
      </div>
    </div>
  );
}
