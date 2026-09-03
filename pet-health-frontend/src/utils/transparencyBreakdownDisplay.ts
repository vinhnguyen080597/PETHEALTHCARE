import type { TransparencyBreakdownLine } from './breederTransparencyScore.ts';
import type { TrustGuideLang } from './farmTrustGuide.ts';

const BREAKDOWN_LABELS: Record<string, { vi: string; en: string }> = {
  verifiedBase: {
    vi: 'Hồ sơ được duyệt',
    en: 'Approved profile base',
  },
  social: {
    vi: 'MXH đã duyệt (FB/Zalo/TT/IG)',
    en: 'Approved social links',
  },
  facilityVideo: {
    vi: 'Video cơ sở',
    en: 'Facility video',
  },
  businessLicense: {
    vi: 'Giấy phép kinh doanh',
    en: 'Business license',
  },
  firstWarranty: {
    vi: 'Chính sách bảo hành đầu tiên',
    en: 'First warranty policy',
  },
};

export function transparencyBreakdownLabel(lang: TrustGuideLang, key: string): string {
  const row = BREAKDOWN_LABELS[key];
  return row ? (lang === 'VI' ? row.vi : row.en) : key;
}

export function visibleTransparencyBreakdownLines(
  lines: TransparencyBreakdownLine[],
): TransparencyBreakdownLine[] {
  return lines.filter((line) => line.key !== 'penalty');
}

export function formatTransparencyBreakdownPoints(
  line: TransparencyBreakdownLine,
  _lang: TrustGuideLang,
): string {
  const sign = line.val > 0 ? '+' : '';
  return `${sign}${line.val} / ${line.max}đ`;
}
