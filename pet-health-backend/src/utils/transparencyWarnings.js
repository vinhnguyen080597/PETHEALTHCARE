/** Transparency warning helpers — score ≤15 after penalty. */

export const TRANSPARENCY_WARNING_SCORE_THRESHOLD = 15;

export const TRANSPARENCY_WARNING_STATUSES = [
  'pending_breeder_action',
  'confirmed',
  'appealed',
  'upheld',
  'restored',
];

export const TRANSPARENCY_WARNING_OPEN_STATUSES = [
  'pending_breeder_action',
  'appealed',
];

const POINTS = {
  verifiedBase: 30,
  socialPlatform: 5,
  facilityVideo: 10,
  businessLicense: 10,
  firstWarranty: 10,
  senConfirmedCompletion: 3,
  fiveStarReview: 2,
};

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function flag(meta, ...keys) {
  return keys.some((k) => {
    const v = meta[k];
    return v === true || v === 1 || v === '1' || v === 'true';
  });
}

function nonNegativeInt(value) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Effective penalty from violations list or legacy penaltyPoints. */
export function effectivePenaltyPoints(meta = {}) {
  const list = Array.isArray(meta.violations) ? meta.violations : [];
  if (list.length > 0) {
    let sum = 0;
    for (const v of list) {
      if (!v || v.status === 'waived' || v.status === 'expired') continue;
      const pts = Math.max(0, Number(v.points) || 0);
      sum += pts;
    }
    return sum;
  }
  return Math.max(0, Number(meta.penaltyPoints) || 0);
}

/**
 * Compute transparency score for a breeder profile row.
 * Unverified → 0 (never triggers warning).
 */
export function computeTransparencyScoreFromProfile(profile) {
  const verification = String(profile?.verification_status || '').toLowerCase();
  if (verification !== 'verified') {
    return { score: 0, isVerified: false, penaltyPoints: 0 };
  }
  const meta = asObject(profile?.metadata);
  const contact = asObject(profile?.contact);

  let social = 0;
  if (flag(meta, 'social_facebook_approved', 'approved_social_facebook') || contact.facebook) {
    // Only count approved flags for scoring parity with Phase 1 public score.
  }
  if (flag(meta, 'social_facebook_approved', 'approved_social_facebook')) social += POINTS.socialPlatform;
  if (flag(meta, 'social_zalo_approved', 'approved_social_zalo')) social += POINTS.socialPlatform;
  if (flag(meta, 'social_tiktok_approved', 'approved_social_tiktok')) social += POINTS.socialPlatform;
  if (flag(meta, 'social_instagram_approved', 'approved_social_instagram')) social += POINTS.socialPlatform;

  const facilityVideo = flag(
    meta,
    'facility_verified',
    'farm_video_verified',
    'environment_verified',
    'facility_video_approved',
  )
    ? POINTS.facilityVideo
    : 0;
  const businessLicense = flag(
    meta,
    'business_license_verified',
    'license_verified',
    'farm_license_verified',
    'business_license_approved',
  )
    ? POINTS.businessLicense
    : 0;
  const policies = Array.isArray(meta.warranty_policies) ? meta.warranty_policies : [];
  const firstWarranty =
    flag(meta, 'warranty_policy_trust_awarded', 'first_warranty_approved') || policies.length > 0
      ? POINTS.firstWarranty
      : 0;

  const completions =
    nonNegativeInt(
      meta.sen_confirmed_completions ?? meta.senConfirmedCompletions ?? meta.pets_rehomed,
    ) * POINTS.senConfirmedCompletion;
  const reviews =
    nonNegativeInt(meta.five_star_review_count ?? meta.review_5star_count) * POINTS.fiveStarReview;
  const penaltyPoints = effectivePenaltyPoints(meta);

  const profilePoints =
    POINTS.verifiedBase + social + facilityVideo + businessLicense + firstWarranty;
  const score = clampScore(profilePoints + completions + reviews - penaltyPoints);
  return { score, isVerified: true, penaltyPoints };
}

export function shouldTriggerTransparencyWarning({ scoreBefore, scoreAfter, isVerified }) {
  if (!isVerified) return false;
  // Only when a penalty pushes score to ≤15 (never for unverified score=0).
  if (scoreAfter > TRANSPARENCY_WARNING_SCORE_THRESHOLD) return false;
  return scoreAfter < scoreBefore;
}

export function normalizeTransparencyWarningStatus(value) {
  const raw = String(value || '').trim().toLowerCase();
  return TRANSPARENCY_WARNING_STATUSES.includes(raw) ? raw : '';
}

export function isOpenTransparencyWarningStatus(status) {
  return TRANSPARENCY_WARNING_OPEN_STATUSES.includes(status);
}

export function adminTransparencyAppealHref(warningId) {
  return `/app/admin?section=requests&type=appeal&focus=${encodeURIComponent(warningId)}`;
}
