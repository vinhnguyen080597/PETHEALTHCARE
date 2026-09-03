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
  businessLicense: 30,
  firstWarranty: 10,
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

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Effective penalty from violations — always 0; penalties moved to compliance score. */
export function effectivePenaltyPoints(_meta = {}) {
  return 0;
}

/**
 * Compute transparency score for a breeder profile row.
 * Unverified → 0 (never triggers warning).
 * Profile points only — compliance violations do not reduce this score.
 */
export function computeTransparencyScoreFromProfile(profile) {
  const verification = String(profile?.verification_status || '').toLowerCase();
  if (verification !== 'verified') {
    return { score: 0, isVerified: false, penaltyPoints: 0 };
  }
  const meta = asObject(profile?.metadata);

  function trustAwarded(trustKey, ...legacyApprovedKeys) {
    if (flag(meta, trustKey)) return true;
    return legacyApprovedKeys.some((k) => flag(meta, k));
  }

  let social = 0;
  if (trustAwarded('social_facebook_trust_awarded', 'social_facebook_approved', 'approved_social_facebook')) {
    social += POINTS.socialPlatform;
  }
  if (trustAwarded('social_zalo_trust_awarded', 'social_zalo_approved', 'approved_social_zalo')) {
    social += POINTS.socialPlatform;
  }
  if (trustAwarded('social_tiktok_trust_awarded', 'social_tiktok_approved', 'approved_social_tiktok')) {
    social += POINTS.socialPlatform;
  }
  if (trustAwarded('social_instagram_trust_awarded', 'social_instagram_approved', 'approved_social_instagram')) {
    social += POINTS.socialPlatform;
  }

  const facilityVideo = trustAwarded(
    'facility_video_trust_awarded',
    'facility_verified',
    'farm_video_verified',
    'environment_verified',
    'facility_video_approved',
  )
    ? POINTS.facilityVideo
    : 0;
  const businessLicense = trustAwarded(
    'business_license_trust_awarded',
    'business_license_verified',
    'license_verified',
    'farm_license_verified',
    'business_license_approved',
  )
    ? POINTS.businessLicense
    : 0;
  const policies = Array.isArray(meta.warranty_policies) ? meta.warranty_policies : [];
  const firstWarranty =
    trustAwarded('warranty_policy_trust_awarded', 'first_warranty_approved') || policies.length > 0
      ? POINTS.firstWarranty
      : 0;

  const profilePoints =
    POINTS.verifiedBase + social + facilityVideo + businessLicense + firstWarranty;
  const score = clampScore(profilePoints);
  return { score, isVerified: true, penaltyPoints: 0 };
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
