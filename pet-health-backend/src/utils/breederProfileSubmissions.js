/** Breeder transparency detail submissions — types, validation, profile merge on approve. */

export const BREEDER_SUBMISSION_TYPES = [
  'facility_video',
  'business_license',
  'social_facebook',
  'social_zalo',
  'social_tiktok',
  'social_instagram',
];

export const BREEDER_SUBMISSION_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

const SOCIAL_TYPE_TO_CONTACT_KEY = {
  social_facebook: 'facebook',
  social_zalo: 'zalo',
  social_tiktok: 'tiktok',
  social_instagram: 'instagram',
};

const SOCIAL_TYPE_TO_APPROVAL_FLAG = {
  social_facebook: 'social_facebook_approved',
  social_zalo: 'social_zalo_approved',
  social_tiktok: 'social_tiktok_approved',
  social_instagram: 'social_instagram_approved',
};

const SUBMISSION_TYPE_TO_TRUST_AWARDED = {
  facility_video: 'facility_video_trust_awarded',
  business_license: 'business_license_trust_awarded',
  social_facebook: 'social_facebook_trust_awarded',
  social_zalo: 'social_zalo_trust_awarded',
  social_tiktok: 'social_tiktok_trust_awarded',
  social_instagram: 'social_instagram_trust_awarded',
};

function markTrustAwarded(metadata, key) {
  if (!key) return;
  metadata[key] = Boolean(metadata[key]) || true;
}

function trimText(value, max = 500) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

export function normalizeBreederSubmissionType(value) {
  const raw = trimText(value, 64).toLowerCase();
  return BREEDER_SUBMISSION_TYPES.includes(raw) ? raw : '';
}

export function normalizeBreederSubmissionStatus(value) {
  const raw = trimText(value, 32).toLowerCase();
  return BREEDER_SUBMISSION_STATUSES.includes(raw) ? raw : '';
}

export function isSocialBreederSubmissionType(type) {
  return type.startsWith('social_');
}

export function breederSubmissionTypeLabel(type, locale = 'vi') {
  const labels = {
    vi: {
      facility_video: 'Video cơ sở',
      business_license: 'Giấy phép kinh doanh',
      social_facebook: 'Facebook',
      social_zalo: 'Zalo',
      social_tiktok: 'TikTok',
      social_instagram: 'Instagram',
    },
    en: {
      facility_video: 'Facility video',
      business_license: 'Business license',
      social_facebook: 'Facebook',
      social_zalo: 'Zalo',
      social_tiktok: 'TikTok',
      social_instagram: 'Instagram',
    },
  };
  const lang = locale === 'en' ? 'en' : 'vi';
  return labels[lang][type] || type;
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

function pathnameOf(url) {
  try {
    return new URL(url).pathname.replace(/\/+$/, '') || '/';
  } catch {
    return '';
  }
}

function zaloDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function isZaloPhoneInput(value) {
  const digits = zaloDigits(value);
  return /^0\d{9}$/.test(digits) || /^84\d{9}$/.test(digits);
}

function normalizeSocialUrl(url, submissionType) {
  const trimmed = trimText(url, 2000);
  if (submissionType === 'social_zalo' && isZaloPhoneInput(trimmed)) {
    const digits = zaloDigits(trimmed);
    return digits.startsWith('84') ? `0${digits.slice(2)}` : digits;
  }
  return trimmed;
}

function isFacebookProfileUrl(url) {
  const host = hostnameOf(url);
  if (!host) return false;
  if (!['facebook.com', 'fb.com', 'm.facebook.com', 'm.me'].includes(host)) return false;
  const path = pathnameOf(url);
  if (/\/(posts|videos|watch|photo|photos|permalink\.php|share)\b/i.test(path)) return false;
  if (path === '/profile.php') return true;
  const slug = path.replace(/^\//, '');
  return slug.length >= 1 && !slug.includes('/');
}

function isZaloPhoneUrl(url) {
  return isZaloPhoneInput(url);
}

function isTiktokProfileUrl(url) {
  const host = hostnameOf(url);
  if (host !== 'tiktok.com') return false;
  return /^\/@[A-Za-z0-9._]{2,24}$/.test(pathnameOf(url));
}

function isInstagramProfileUrl(url) {
  const host = hostnameOf(url);
  if (host !== 'instagram.com' && host !== 'instagr.am') return false;
  const path = pathnameOf(url);
  if (/^\/(p|reel|reels|stories|tv|explore|accounts|direct)\b/i.test(path)) return false;
  return /^\/[A-Za-z0-9._]{1,30}$/.test(path);
}

function socialProfileError(submissionType, url) {
  if (submissionType === 'social_facebook' && !isFacebookProfileUrl(url)) {
    return 'Use a Facebook profile or page URL (facebook.com/yourpage).';
  }
  if (submissionType === 'social_zalo' && !isZaloPhoneUrl(url)) {
    return 'Enter a 10-digit Zalo phone number (090xxxxxxx).';
  }
  if (submissionType === 'social_tiktok' && !isTiktokProfileUrl(url)) {
    return 'Use a TikTok profile URL (tiktok.com/@username).';
  }
  if (submissionType === 'social_instagram' && !isInstagramProfileUrl(url)) {
    return 'Use an Instagram profile URL (instagram.com/username).';
  }
  return '';
}

export function validateBreederSubmissionPayload(submissionType, payload = {}) {
  const rawUrl = trimText(payload.url ?? payload.media_url, 2000);
  const note = trimText(payload.note, 500);
  const url = isSocialBreederSubmissionType(submissionType)
    ? normalizeSocialUrl(rawUrl, submissionType)
    : rawUrl;
  if (!url) {
    return { ok: false, code: 'MISSING_SUBMISSION_URL', error: 'url is required' };
  }
  if (isSocialBreederSubmissionType(submissionType)) {
    const socialError = socialProfileError(submissionType, url);
    if (socialError) {
      return { ok: false, code: 'INVALID_SOCIAL_URL', error: socialError };
    }
  } else if (submissionType === 'facility_video') {
    if (!/\.(mp4|webm|mov|3gp)(\?|$)/i.test(url) && !/^https?:\/\//i.test(url)) {
      return { ok: false, code: 'INVALID_VIDEO_URL', error: 'Invalid facility video URL' };
    }
  } else if (submissionType === 'business_license') {
    if (!/^https?:\/\//i.test(url)) {
      return { ok: false, code: 'INVALID_LICENSE_URL', error: 'Invalid business license URL' };
    }
  }
  return {
    ok: true,
    payload: {
      url,
      ...(note ? { note } : {}),
    },
  };
}

/** Merge an approved submission into breeder profile contact + metadata. */
export function applyApprovedBreederSubmission(profile, submission, reviewedAt) {
  const submissionType = normalizeBreederSubmissionType(submission?.submission_type);
  const payload = submission?.payload && typeof submission.payload === 'object'
    ? submission.payload
    : {};
  const url = trimText(payload.url, 2000);
  const now = reviewedAt || new Date().toISOString();
  const metadata = { ...(profile.metadata && typeof profile.metadata === 'object' ? profile.metadata : {}) };
  const contact = { ...(profile.contact && typeof profile.contact === 'object' ? profile.contact : {}) };

  if (submissionType === 'facility_video') {
    metadata.facility_verified = true;
    metadata.facility_video_approved = true;
    metadata.facility_video_url = url;
    metadata.facility_video_approved_at = now;
    markTrustAwarded(metadata, SUBMISSION_TYPE_TO_TRUST_AWARDED.facility_video);
  } else if (submissionType === 'business_license') {
    metadata.business_license_verified = true;
    metadata.business_license_approved = true;
    metadata.business_license_url = url;
    metadata.business_license_approved_at = now;
    markTrustAwarded(metadata, SUBMISSION_TYPE_TO_TRUST_AWARDED.business_license);
  } else if (isSocialBreederSubmissionType(submissionType)) {
    const contactKey = SOCIAL_TYPE_TO_CONTACT_KEY[submissionType];
    const flagKey = SOCIAL_TYPE_TO_APPROVAL_FLAG[submissionType];
    if (contactKey) contact[contactKey] = url;
    if (flagKey) metadata[flagKey] = true;
    metadata[`${submissionType}_approved_at`] = now;
    markTrustAwarded(metadata, SUBMISSION_TYPE_TO_TRUST_AWARDED[submissionType]);
  }

  return { metadata, contact };
}

export function adminBreederDetailPendingHref(submissionId) {
  const focus = encodeURIComponent(submissionId);
  return `/app/admin?section=requests&type=detail&focus=${focus}`;
}
