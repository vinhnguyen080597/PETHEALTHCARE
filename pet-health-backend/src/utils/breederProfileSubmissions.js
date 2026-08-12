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

export function validateBreederSubmissionPayload(submissionType, payload = {}) {
  const url = trimText(payload.url ?? payload.media_url, 2000);
  const note = trimText(payload.note, 500);
  if (!url) {
    return { ok: false, code: 'MISSING_SUBMISSION_URL', error: 'url is required' };
  }
  if (isSocialBreederSubmissionType(submissionType)) {
    if (!/^https?:\/\//i.test(url)) {
      return {
        ok: false,
        code: 'INVALID_SOCIAL_URL',
        error: 'Social link must start with http:// or https://',
      };
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
  } else if (submissionType === 'business_license') {
    metadata.business_license_verified = true;
    metadata.business_license_approved = true;
    metadata.business_license_url = url;
    metadata.business_license_approved_at = now;
  } else if (isSocialBreederSubmissionType(submissionType)) {
    const contactKey = SOCIAL_TYPE_TO_CONTACT_KEY[submissionType];
    const flagKey = SOCIAL_TYPE_TO_APPROVAL_FLAG[submissionType];
    if (contactKey) contact[contactKey] = url;
    if (flagKey) metadata[flagKey] = true;
    metadata[`${submissionType}_approved_at`] = now;
  }

  return { metadata, contact };
}

export function adminBreederDetailPendingHref(submissionId) {
  const focus = encodeURIComponent(submissionId);
  return `/app/admin?section=requests&type=detail&focus=${focus}`;
}
