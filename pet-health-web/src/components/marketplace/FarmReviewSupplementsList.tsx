"use client";

import { useState } from "react";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import type { BreederFarmReview } from "@/lib/breederFarmReviews";
import {
  farmReviewSupplementsCollapsible,
  farmReviewSupplementsToShow,
} from "@/lib/breederFarmReviews";
import { FarmReviewStars } from "./FarmReviewStars";

type FarmReviewSupplementsListProps = {
  lang: Lang;
  supplements: BreederFarmReview[];
};

export function FarmReviewSupplementsList({ lang, supplements }: FarmReviewSupplementsListProps) {
  const [expanded, setExpanded] = useState(false);
  if (!supplements.length) return null;

  const collapsible = farmReviewSupplementsCollapsible(supplements.length);
  const visible = farmReviewSupplementsToShow(supplements, expanded);

  return (
    <div className="space-y-2 border-l-2 border-[#F3E2C8] pl-2.5">
      {visible.map((sup) => (
        <div key={sup.id} className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-xs font-semibold text-[#6E5A51]">
              {t(lang, "farm.review.supplement")}
            </p>
            <FarmReviewStars rating={sup.rating} className="text-xs" />
            {sup.status === "pending" ? (
              <span className="text-[10px] font-semibold text-amber-800">
                · {t(lang, "farm.review.pendingBadge")}
              </span>
            ) : null}
          </div>
          {sup.body ? (
            <p className="text-xs leading-[18px] text-[#2B1E19]">{sup.body}</p>
          ) : null}
          {sup.photo_urls?.length ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sup.photo_urls.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-16 w-16 shrink-0 overflow-hidden rounded-lg"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ))}
      {collapsible ? (
        <button
          type="button"
          className="text-xs font-medium text-[#6E5A51]"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded
            ? t(lang, "farm.review.hideSupplements")
            : t(lang, "farm.review.showMoreSupplements")}
        </button>
      ) : null}
    </div>
  );
}
