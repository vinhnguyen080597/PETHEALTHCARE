/** Breeder compliance score (0–100) — starts at 100, deduct on confirmed violations. */

export const COMPLIANCE_SCORE_MAX = 100;
export const COMPLIANCE_SCORE_DEFAULT = 100;

export const COMPLIANCE_TIER_POINTS = {
  1: 5,
  2: 10,
  3: 25,
  4: 50,
};

export const COMPLIANCE_BANDS = {
  normal: { id: 'normal', min: 80, max: 100 },
  warning: { id: 'warning', min: 50, max: 79 },
  severe: { id: 'severe', min: 1, max: 49 },
  banned: { id: 'banned', min: 0, max: 0 },
};

export const COMPLIANCE_REPORT_REASONS = [
  'stock_photo_spam',
  'wrong_category_species',
  'inaccurate_listing',
  'abusive_communication',
  'concealed_illness',
  'forged_documents',
  'confirmed_scam',
  'prohibited_wildlife',
];

/** Legacy report reasons → compliance reason codes. */
const LEGACY_REASON_ALIASES = {
  scam: 'confirmed_scam',
  misleading_health_claims: 'concealed_illness',
  abusive_content: 'abusive_communication',
  fake_contact: 'inaccurate_listing',
  unsafe_transaction: 'confirmed_scam',
  spam: 'stock_photo_spam',
  misleading: 'inaccurate_listing',
  other: 'inaccurate_listing',
  report_upheld: 'inaccurate_listing',
};

const REASON_TO_TIER = {
  stock_photo_spam: 1,
  wrong_category_species: 1,
  inaccurate_listing: 2,
  abusive_communication: 2,
  concealed_illness: 3,
  forged_documents: 3,
  confirmed_scam: 4,
  prohibited_wildlife: 4,
};

const TIER_IMMEDIATE_ACTIONS = {
  1: ['hide_listing'],
  2: ['hide_listing', 'system_warning'],
  3: ['post_ban_14d', 'strip_verified_30d'],
  4: ['hide_listing', 'permanent_suspend'],
};

export const COMPLIANCE_MATRIX = [
  {
    tier: 1,
    points: COMPLIANCE_TIER_POINTS[1],
    reasonCodes: ['stock_photo_spam', 'wrong_category_species'],
    titleVI: 'Mức 1: Nhẹ',
    titleEN: 'Tier 1: Light',
    behaviorsVI: 'Dùng ảnh mạng / spam bài trùng lặp; chọn sai danh mục / sai giống loài',
    behaviorsEN: 'Stock photos / duplicate spam; wrong category or species',
    actionVI: 'Tạm ẩn bài đăng vi phạm.',
    actionEN: 'Temporarily hide the violating listing.',
  },
  {
    tier: 2,
    points: COMPLIANCE_TIER_POINTS[2],
    reasonCodes: ['inaccurate_listing', 'abusive_communication'],
    titleVI: 'Mức 2: Trung bình',
    titleEN: 'Tier 2: Medium',
    behaviorsVI: 'Đăng sai thông tin (giá ảo, tuổi, vắc-xin); thái độ độc hại / quấy rối trong chat',
    behaviorsEN: 'False listing info (price, age, vaccines); abusive / harassing chat',
    actionVI: 'Gỡ bài vi phạm + cảnh cáo toàn hệ thống.',
    actionEN: 'Remove listing + system-wide warning.',
  },
  {
    tier: 3,
    points: COMPLIANCE_TIER_POINTS[3],
    reasonCodes: ['concealed_illness', 'forged_documents'],
    titleVI: 'Mức 3: Nghiêm trọng',
    titleEN: 'Tier 3: Severe',
    behaviorsVI: 'Che giấu bệnh truyền nhiễm (Care, Parvo…); giả mạo giấy tờ vắc-xin / gia phả',
    behaviorsEN: 'Concealing infectious disease; forged vaccine / pedigree papers',
    actionVI: 'Tạm khóa đăng bài 14 ngày; mất nhãn Verified trong 30 ngày.',
    actionEN: 'Posting ban 14 days; Verified badge stripped for 30 days.',
  },
  {
    tier: 4,
    points: COMPLIANCE_TIER_POINTS[4],
    reasonCodes: ['confirmed_scam', 'prohibited_wildlife'],
    titleVI: 'Mức 4: Rất nghiêm trọng',
    titleEN: 'Tier 4: Critical',
    behaviorsVI: 'Lừa đảo cọc / tráo bé (có bằng chứng); bán động vật hoang dã / loài bị cấm (CITES)',
    behaviorsEN: 'Deposit scam / bait-and-switch; prohibited wildlife / CITES species',
    actionVI: 'Khóa tài khoản vĩnh viễn.',
    actionEN: 'Permanently suspend the account.',
  },
];

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function clampScore(value) {
  return Math.max(0, Math.min(COMPLIANCE_SCORE_MAX, Math.round(Number(value) || 0)));
}

function addDaysIso(fromDate, days) {
  const d = new Date(fromDate.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export function normalizeComplianceReasonCode(reason) {
  const raw = String(reason || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (!raw) return 'inaccurate_listing';
  if (REASON_TO_TIER[raw]) return raw;
  if (LEGACY_REASON_ALIASES[raw]) return LEGACY_REASON_ALIASES[raw];
  return 'inaccurate_listing';
}

export function mapReportReasonToCompliance(reason) {
  const reasonCode = normalizeComplianceReasonCode(reason);
  const tier = REASON_TO_TIER[reasonCode] || 2;
  const points = COMPLIANCE_TIER_POINTS[tier] ?? COMPLIANCE_TIER_POINTS[2];
  return {
    tier,
    reasonCode,
    points,
    immediateActions: [...(TIER_IMMEDIATE_ACTIONS[tier] || TIER_IMMEDIATE_ACTIONS[2])],
  };
}

export function getComplianceScoreFromMetadata(metadata) {
  const compliance = asObject(asObject(metadata).compliance);
  if (compliance.score === undefined || compliance.score === null || compliance.score === '') {
    return COMPLIANCE_SCORE_DEFAULT;
  }
  return clampScore(compliance.score);
}

export function complianceBandForScore(score) {
  const s = clampScore(score);
  if (s <= 0) return COMPLIANCE_BANDS.banned.id;
  if (s <= 49) return COMPLIANCE_BANDS.severe.id;
  if (s <= 79) return COMPLIANCE_BANDS.warning.id;
  return COMPLIANCE_BANDS.normal.id;
}

export function isComplianceVerifiedStripped(metadata, now = new Date()) {
  const restrictions = asObject(asObject(asObject(metadata).compliance).restrictions);
  if (restrictions.permanentBan === true) return true;
  const band = complianceBandForScore(getComplianceScoreFromMetadata(metadata));
  if (band === 'warning' || band === 'severe' || band === 'banned') return true;
  const until = restrictions.verifiedStrippedUntil;
  if (!until) return false;
  const t = Date.parse(until);
  return Number.isFinite(t) && t > now.getTime();
}

export function isCompliancePostBanned(metadata, now = new Date()) {
  const restrictions = asObject(asObject(asObject(metadata).compliance).restrictions);
  if (restrictions.permanentBan === true) return true;
  const until = restrictions.postBanUntil;
  if (!until) return false;
  const t = Date.parse(until);
  return Number.isFinite(t) && t > now.getTime();
}

export function shouldHideComplianceContact(metadata) {
  const band = complianceBandForScore(getComplianceScoreFromMetadata(metadata));
  return band === 'severe' || band === 'banned';
}

export function dailyListingCapForCompliance(metadata) {
  const band = complianceBandForScore(getComplianceScoreFromMetadata(metadata));
  if (band === 'warning') return 1;
  if (band === 'severe' || band === 'banned') return 0;
  return null;
}

/**
 * Pure apply: returns next compliance object + derived action flags.
 * Does not mutate profile / listings / account.
 */
export function applyComplianceDeduction(metadata, input = {}, now = new Date()) {
  const meta = asObject(metadata);
  const prev = asObject(meta.compliance);
  const events = Array.isArray(prev.events) ? [...prev.events] : [];
  const reportId = input.reportId ? String(input.reportId).trim() : '';
  if (reportId && events.some((e) => e && e.reportId === reportId)) {
    return {
      compliance: {
        score: getComplianceScoreFromMetadata(meta),
        updatedAt: prev.updatedAt || now.toISOString(),
        events,
        restrictions: { ...asObject(prev.restrictions) },
      },
      mapping: mapReportReasonToCompliance(input.reason),
      applied: false,
      scoreBefore: getComplianceScoreFromMetadata(meta),
      scoreAfter: getComplianceScoreFromMetadata(meta),
      band: complianceBandForScore(getComplianceScoreFromMetadata(meta)),
      actions: [],
    };
  }

  const mapping = mapReportReasonToCompliance(input.reason);
  const scoreBefore = getComplianceScoreFromMetadata(meta);
  const scoreAfter = clampScore(scoreBefore - mapping.points);
  const restrictions = { ...asObject(prev.restrictions) };
  const actions = [...mapping.immediateActions];

  if (mapping.tier === 3) {
    const ban14 = addDaysIso(now, 14);
    if (!restrictions.postBanUntil || Date.parse(restrictions.postBanUntil) < Date.parse(ban14)) {
      restrictions.postBanUntil = ban14;
    }
    restrictions.verifiedStrippedUntil = addDaysIso(now, 30);
  }

  const band = complianceBandForScore(scoreAfter);
  if (band === 'severe') {
    const ban30 = addDaysIso(now, 30);
    if (!restrictions.postBanUntil || Date.parse(restrictions.postBanUntil) < Date.parse(ban30)) {
      restrictions.postBanUntil = ban30;
    }
  }
  if (band === 'banned' || mapping.tier === 4) {
    restrictions.permanentBan = true;
    if (!actions.includes('permanent_suspend')) actions.push('permanent_suspend');
    if (band === 'banned' && !actions.includes('unpublish_all_listings')) {
      actions.push('unpublish_all_listings');
    }
  }

  const event = {
    id: input.eventId || `cmp_${now.getTime()}`,
    reportId: reportId || undefined,
    tier: mapping.tier,
    reasonCode: mapping.reasonCode,
    points: mapping.points,
    scoreAfter,
    actions: [...actions],
    createdAt: now.toISOString(),
  };
  events.push(event);

  return {
    compliance: {
      score: scoreAfter,
      updatedAt: now.toISOString(),
      events,
      restrictions,
    },
    mapping,
    applied: true,
    scoreBefore,
    scoreAfter,
    band,
    actions,
    event,
  };
}
