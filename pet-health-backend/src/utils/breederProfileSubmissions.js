import { randomUUID } from 'node:crypto';

/** Breeder transparency detail submissions — types, validation, profile merge on approve. */

export const BREEDER_SUBMISSION_TYPES = [
  'facility_video',
  'business_license',
  'warranty_policy_file',
  'social_facebook',
  'social_zalo',
  'social_tiktok',
  'social_instagram',
];

export const BREEDER_SUBMISSION_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

/** Public farm tags after admin approves business_license pack. */
export const LEGAL_ENTITY_TAGS = ['household_business', 'enterprise'];

export const BUSINESS_LICENSE_VERIFY_CHECK_KEYS = [
  'mstPortalMatch',
  'documentReadable',
  'addressMatch',
  'subjectMatch',
];

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
  warranty_policy_file: 'warranty_policy_trust_awarded',
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
      business_license: 'Xác minh hộ kinh doanh / doanh nghiệp',
      warranty_policy_file: 'Chính sách bảo hành upload',
      social_facebook: 'Facebook',
      social_zalo: 'Zalo',
      social_tiktok: 'TikTok',
      social_instagram: 'Instagram',
    },
    en: {
      facility_video: 'Facility video',
      business_license: 'Household business / enterprise verification',
      warranty_policy_file: 'Uploaded warranty policy',
      social_facebook: 'Facebook',
      social_zalo: 'Zalo',
      social_tiktok: 'TikTok',
      social_instagram: 'Instagram',
    },
  };
  const lang = locale === 'en' ? 'en' : 'vi';
  return labels[lang][type] || type;
}

export function normalizeLegalEntityTag(value) {
  const raw = trimText(value, 64).toLowerCase();
  return LEGAL_ENTITY_TAGS.includes(raw) ? raw : '';
}

export function legalEntityTagPublicLabel(tag, locale = 'vi') {
  const normalized = normalizeLegalEntityTag(tag);
  if (!normalized) return '';
  if (locale === 'en') {
    return normalized === 'enterprise' ? 'Enterprise' : 'Household business';
  }
  return normalized === 'enterprise' ? 'Doanh nghiệp' : 'Hộ kinh doanh';
}

export function maskTaxId(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 4) return digits ? '••••' : '';
  return `${digits.slice(0, 2)}${'•'.repeat(Math.max(digits.length - 4, 2))}${digits.slice(-2)}`;
}

function normalizeBusinessLicenseIdentity(payload = {}) {
  const sellerLegalType = normalizeLegalEntityTag(
    payload.seller_legal_type ?? payload.sellerLegalType,
  );
  const legalName = trimText(
    payload.legal_name ?? payload.legalName ?? payload.company_legal_name,
    200,
  );
  const registeredAddress = trimText(
    payload.registered_address ?? payload.registeredAddress,
    300,
  );
  const taxId = String(payload.tax_id ?? payload.taxId ?? payload.mst ?? '')
    .replace(/\D/g, '')
    .slice(0, 14);
  return { sellerLegalType, legalName, registeredAddress, taxId };
}

export function validateBusinessLicenseVerifyChecks(checks) {
  const source = checks && typeof checks === 'object' ? checks : {};
  const normalized = {};
  for (const key of BUSINESS_LICENSE_VERIFY_CHECK_KEYS) {
    const raw = source[key] ?? source[key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)];
    normalized[key] = raw === true || raw === 'true' || raw === 1 || raw === '1';
  }
  const missing = BUSINESS_LICENSE_VERIFY_CHECK_KEYS.filter((key) => !normalized[key]);
  if (missing.length) {
    return {
      ok: false,
      code: 'MISSING_VERIFY_CHECKS',
      error: 'All business license verification checks must be confirmed before approve.',
      missing,
    };
  }
  return { ok: true, checks: normalized };
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
    const identity = normalizeBusinessLicenseIdentity(payload);
    if (!identity.sellerLegalType) {
      return {
        ok: false,
        code: 'MISSING_SELLER_LEGAL_TYPE',
        error: 'seller_legal_type must be household_business or enterprise',
      };
    }
    if (!identity.legalName) {
      return { ok: false, code: 'MISSING_LEGAL_NAME', error: 'legal_name is required' };
    }
    if (!identity.registeredAddress) {
      return {
        ok: false,
        code: 'MISSING_REGISTERED_ADDRESS',
        error: 'registered_address is required',
      };
    }
    if (!/^\d{8,14}$/.test(identity.taxId)) {
      return {
        ok: false,
        code: 'INVALID_TAX_ID',
        error: 'tax_id must be 8–14 digits (MST / registration number)',
      };
    }
    return {
      ok: true,
      payload: {
        url,
        title: trimText(payload.title, 160),
        content_type: trimText(payload.content_type ?? payload.contentType, 120).toLowerCase(),
        seller_legal_type: identity.sellerLegalType,
        legal_name: identity.legalName,
        registered_address: identity.registeredAddress,
        tax_id: identity.taxId,
        ...(note ? { note } : {}),
      },
    };
  } else if (submissionType === 'warranty_policy_file') {
    if (!/^https?:\/\//i.test(url)) {
      return { ok: false, code: 'INVALID_WARRANTY_URL', error: 'Invalid warranty policy file URL' };
    }
  }
  return {
    ok: true,
    payload: {
      url,
      title: trimText(payload.title, 160),
      content_type: trimText(payload.content_type ?? payload.contentType, 120).toLowerCase(),
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
    const identity = normalizeBusinessLicenseIdentity(payload);
    const legalEntityTag =
      normalizeLegalEntityTag(payload.legal_entity_tag ?? payload.legalEntityTag)
      || identity.sellerLegalType;
    metadata.business_license_verified = true;
    metadata.business_license_approved = true;
    metadata.business_license_url = url;
    metadata.business_license_approved_at = now;
    if (legalEntityTag) metadata.legal_entity_tag = legalEntityTag;
    metadata.identity = {
      seller_legal_type: legalEntityTag || identity.sellerLegalType,
      legal_name: identity.legalName,
      registered_address: identity.registeredAddress,
      tax_id: identity.taxId,
      verified_at: now,
    };
    if (payload.admin_verify_checks && typeof payload.admin_verify_checks === 'object') {
      metadata.identity.admin_verify_checks = payload.admin_verify_checks;
    }
    markTrustAwarded(metadata, SUBMISSION_TYPE_TO_TRUST_AWARDED.business_license);
  } else if (submissionType === 'warranty_policy_file') {
    const rawPolicies = Array.isArray(metadata.warranty_policies)
      ? [...metadata.warranty_policies]
      : [];
    const title = trimText(payload.title, 160) || trimText(payload.note, 160) || 'Uploaded warranty policy';
    const contentType = trimText(payload.content_type ?? payload.contentType, 120).toLowerCase();
    const exists = rawPolicies.some(
      (item) =>
        trimText(item?.file_url ?? item?.fileUrl, 2000) === url
        && trimText(item?.title, 160) === title,
    );
    const sameTitleMissingFile = rawPolicies.find(
      (item) =>
        trimText(item?.title, 160) === title
        && !trimText(item?.file_url ?? item?.fileUrl, 2000),
    );
    if (sameTitleMissingFile) {
      sameTitleMissingFile.file_url = url;
      if (contentType) sameTitleMissingFile.content_type = contentType;
      metadata.warranty_policies = rawPolicies;
    } else if (!exists) {
      rawPolicies.push({
        id: randomUUID(),
        title,
        created_at: now,
        vaccine_shots_count: 2,
        vaccine_types: '',
        deworming_note: '',
        has_health_book: true,
        care_parvo_coverage_days: 14,
        respiratory_skin_coverage_days: 3,
        congenital_coverage_days: 30,
        report_within_hours: 24,
        vet_requirement: 'licensed',
        buyer_guidelines: ['keep_farm_diet_3_5_days', 'no_bath_7_days'],
        exclusions: ['accident_trauma', 'poisoning_wrong_food', 'self_treatment_no_notice'],
        medical_fee_support_percent: 50,
        allow_equivalent_swap: true,
        shipping_party: 'split',
        evidence_required: ['symptom_video', 'rapid_test_photo', 'vet_diagnosis_or_pcr'],
        breeder_response_hours: 24,
        file_url: url,
        content_type: contentType,
      });
      metadata.warranty_policies = rawPolicies;
    }
    if (!metadata.warranty_policy_trust_awarded) {
      markTrustAwarded(metadata, SUBMISSION_TYPE_TO_TRUST_AWARDED.warranty_policy_file);
      metadata.first_warranty_approved = true;
    }
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

function warrantyFilePolicyKey(metadata) {
  const raw = Array.isArray(metadata?.warranty_policies) ? metadata.warranty_policies : [];
  return raw
    .map((item) => `${trimText(item?.file_url ?? item?.fileUrl, 2000)}|${trimText(item?.title, 160)}`)
    .sort()
    .join('\n');
}

/**
 * Re-apply approved warranty file submissions onto a profile.
 * Used when admin approve marked the row approved but skipped the metadata merge.
 */
export function applyApprovedWarrantyFileSubmissions(profile, submissions) {
  let contact = { ...(profile?.contact && typeof profile.contact === 'object' ? profile.contact : {}) };
  let metadata = { ...(profile?.metadata && typeof profile.metadata === 'object' ? profile.metadata : {}) };
  let changed = false;
  for (const submission of Array.isArray(submissions) ? submissions : []) {
    if (normalizeBreederSubmissionType(submission?.submission_type) !== 'warranty_policy_file') continue;
    if (normalizeBreederSubmissionStatus(submission?.status) !== 'approved') continue;
    const merged = applyApprovedBreederSubmission(
      { ...profile, contact, metadata },
      submission,
      submission.reviewed_at,
    );
    const policyChanged = warrantyFilePolicyKey(merged.metadata) !== warrantyFilePolicyKey(metadata);
    const trustChanged =
      Boolean(merged.metadata.warranty_policy_trust_awarded) !== Boolean(metadata.warranty_policy_trust_awarded);
    if (!policyChanged && !trustChanged) continue;
    contact = merged.contact;
    metadata = merged.metadata;
    changed = true;
  }
  return { contact, metadata, changed };
}

export function adminBreederDetailPendingHref(submissionId) {
  const focus = encodeURIComponent(submissionId);
  return `/app/admin?section=requests&type=detail&focus=${focus}`;
}

/** Public farm profile after admin approves a detail submission. */
export function approvedBreederDetailCtaHref(breederProfileId, submissionType) {
  const id = encodeURIComponent(String(breederProfileId || '').trim());
  if (!id) return '/app/account/breeder';
  const base = `/app/breeders/${id}`;
  return normalizeBreederSubmissionType(submissionType) === 'warranty_policy_file'
    ? `${base}?tab=warranty`
    : base;
}

/** Apply pending HKD/DN pack from profile metadata when admin verifies the kennel. */
export function applyPendingBusinessLicenseOnProfileVerify(metadata, reviewedAt) {
  const next = metadata && typeof metadata === 'object' ? { ...metadata } : {};
  if (next.business_license_trust_awarded) return next;

  const breederType = String(next.breederType ?? next.breeder_type ?? '')
    .trim()
    .toLowerCase();
  const sellerType =
    breederType === 'enterprise' || breederType === 'household_business'
      ? breederType
      : '';
  if (!sellerType) return next;

  const identity =
    next.identity && typeof next.identity === 'object' ? { ...next.identity } : {};
  const legalName = String(identity.legal_name || identity.legalName || '').trim();
  const registeredAddress = String(
    identity.registered_address || identity.registeredAddress || '',
  ).trim();
  const taxId = String(identity.tax_id || identity.taxId || '').replace(/\D/g, '');
  const url = String(
    next.business_license_pending_url
      || next.business_license_url
      || identity.license_url
      || '',
  ).trim();

  if (!legalName || !registeredAddress || !/^\d{8,14}$/.test(taxId) || !/^https?:\/\//i.test(url)) {
    return next;
  }

  const now = reviewedAt || new Date().toISOString();
  next.business_license_verified = true;
  next.business_license_approved = true;
  next.business_license_url = url;
  next.business_license_approved_at = now;
  next.business_license_trust_awarded = true;
  next.legal_entity_tag = sellerType;
  next.identity = {
    ...identity,
    seller_legal_type: sellerType,
    legal_name: legalName,
    registered_address: registeredAddress,
    tax_id: taxId,
    verified_at: now,
  };
  delete next.business_license_pending_url;
  return next;
}
