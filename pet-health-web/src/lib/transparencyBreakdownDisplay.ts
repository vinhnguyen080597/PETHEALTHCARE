import type { Lang } from "./types";
import {
  TRANSPARENCY_POINTS,
  type TransparencyBreakdownLine,
} from "./breederTransparencyScore";

const BREAKDOWN_LABELS: Record<string, { vi: string; en: string }> = {
  verifiedBase: {
    vi: "Hồ sơ được duyệt",
    en: "Approved profile base",
  },
  social: {
    vi: "MXH đã duyệt (FB/Zalo/TT/IG)",
    en: "Approved social links",
  },
  facilityVideo: {
    vi: "Video cơ sở",
    en: "Facility video",
  },
  businessLicense: {
    vi: "Giấy phép kinh doanh",
    en: "Business license",
  },
  firstWarranty: {
    vi: "Chính sách bảo hành đầu tiên",
    en: "First warranty policy",
  },
  completions: {
    vi: "Giao dịch hoàn thành",
    en: "Completed handoffs",
  },
  reviews: {
    vi: "Nhận đánh giá 5 sao",
    en: "5★ reviews received",
  },
};

export function transparencyBreakdownLabel(lang: Lang, key: string): string {
  const row = BREAKDOWN_LABELS[key];
  return row ? (lang === "VI" ? row.vi : row.en) : key;
}

export function visibleTransparencyBreakdownLines(
  lines: TransparencyBreakdownLine[],
): TransparencyBreakdownLine[] {
  return lines.filter((line) => line.key !== "penalty");
}

export function formatTransparencyBreakdownPoints(
  line: TransparencyBreakdownLine,
  lang: Lang,
): string {
  if (line.key === "completions") {
    const pts = TRANSPARENCY_POINTS.senConfirmedCompletion;
    return lang === "VI" ? `+${pts}/lần` : `+${pts}/each`;
  }
  if (line.key === "reviews") {
    const pts = TRANSPARENCY_POINTS.fiveStarReview;
    return lang === "VI" ? `+${pts}/lần` : `+${pts}/each`;
  }
  const sign = line.val > 0 ? "+" : "";
  return `${sign}${line.val} / ${line.max}đ`;
}
