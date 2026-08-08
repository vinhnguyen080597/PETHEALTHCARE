"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import {
  buildSiteBreadcrumbs,
  parseFarmBreadcrumbId,
} from "@/lib/siteBreadcrumbs";

export function SiteBreadcrumbs({ lang }: { lang: Lang }) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const farmProfileId = parseFarmBreadcrumbId(searchParams.get("farm"));

  const specs = buildSiteBreadcrumbs(pathname, { farmProfileId });
  if (!specs || specs.length === 0) return null;

  const crumbs = specs.map((crumb) => ({
    href: crumb.href,
    label: crumb.rawLabel
      ? crumb.rawLabel
      : crumb.labelKey
        ? t(lang, crumb.labelKey)
        : crumb.href,
  }));

  return (
    <div className="bg-[#FDFBF7]">
      <nav
        aria-label="Breadcrumb"
        className="max-w-[1200px] mx-auto px-5 lg:px-8 py-2.5"
      >
        <ol className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-[#6E5A51]">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <li
                key={`${crumb.href}-${index}`}
                className="flex items-center gap-1.5 min-w-0"
              >
                {index > 0 ? (
                  <span aria-hidden className="text-[#D6C4B0]">
                    /
                  </span>
                ) : null}
                {isLast ? (
                  <span
                    aria-current="page"
                    className="truncate font-medium text-[#2B1E19]"
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="truncate hover:text-[#D97706] transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
