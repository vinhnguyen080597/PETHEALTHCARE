import { createHash } from 'node:crypto';

const MAX_HEALTH_IMAGES = 6;
const MAX_TRANSLATION_RECORDS = 24;
const MIN_IMAGE_BYTES = intFromEnv('AI_MIN_IMAGE_BYTES', 128);

const TEXT_LIMITS = {
  vaccineType: intFromEnv('AI_MAX_VACCINE_TEXT_CHARS', 500),
  medicalHistory: intFromEnv('AI_MAX_MEDICAL_HISTORY_CHARS', 1500),
  symptomDescription: intFromEnv('AI_MAX_SYMPTOM_DESCRIPTION_CHARS', 1200),
  translationField: intFromEnv('AI_MAX_TRANSLATION_FIELD_CHARS', 4000),
};

const IMAGE_SIGNATURES = {
  'image/jpeg': (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  'image/png': (buf) =>
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a,
  'image/webp': (buf) =>
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP',
};

function intFromEnv(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function payloadError(message, code, details = undefined) {
  const err = new Error(message);
  err.status = 400;
  err.code = code;
  if (details !== undefined) err.details = details;
  return err;
}

function compactText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

function requireMaxText(field, value, limit) {
  const text = compactText(value);
  if (text.length > limit) {
    throw payloadError(`${field} is too long. Max ${limit} characters.`, 'AI_PAYLOAD_TEXT_TOO_LONG', {
      field,
      limit,
      length: text.length,
    });
  }
  return text;
}

function normalizeYesNo(value, field) {
  if (value === undefined || value === null || value === '') return '';
  const text = compactText(value).toLowerCase();
  if (text === 'yes' || text === 'no') return text;
  throw payloadError(`${field} must be yes or no.`, 'AI_PAYLOAD_INVALID_ENUM', { field });
}

function normalizeLocale(value) {
  const text = compactText(value).toLowerCase();
  return text.startsWith('vi') ? 'vi' : 'en';
}

function validateWeightKg(value) {
  const raw = compactText(value);
  if (!raw) return '';
  const n = Number(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0 || n > 200) {
    throw payloadError('weightKg must be a realistic number between 0 and 200.', 'AI_PAYLOAD_INVALID_WEIGHT', {
      field: 'weightKg',
    });
  }
  return String(Number(n.toFixed(2)));
}

function hashFile(file) {
  return createHash('sha256').update(file.buffer).digest('hex');
}

function validateImageSignature(file, label) {
  const buffer = file?.buffer;
  if (!Buffer.isBuffer(buffer) || buffer.length < MIN_IMAGE_BYTES) {
    throw payloadError(`${label} is too small or empty. Please upload a real photo.`, 'AI_PAYLOAD_IMAGE_TOO_SMALL', {
      field: label,
      minBytes: MIN_IMAGE_BYTES,
    });
  }
  const matches = IMAGE_SIGNATURES[file.mimetype];
  if (matches && !matches(buffer)) {
    throw payloadError(`${label} content does not match its image type.`, 'AI_PAYLOAD_IMAGE_SIGNATURE_MISMATCH', {
      field: label,
      mimetype: file.mimetype,
    });
  }
}

function validateDuplicateImages(entries) {
  const seen = new Map();
  for (const entry of entries) {
    const digest = hashFile(entry.file);
    const previous = seen.get(digest);
    if (previous) {
      throw payloadError('Duplicate photos are not useful for AI analysis. Please upload different views.', 'AI_PAYLOAD_DUPLICATE_IMAGE', {
        first: previous,
        duplicate: entry.label,
      });
    }
    seen.set(digest, entry.label);
  }
}

export function validateHealthAnalysisPayload({ body, primary, extras = [], video = null }) {
  const imageEntries = [
    { label: 'image', file: primary },
    ...extras.map((file, index) => ({ label: `photos[${index}]`, file })),
  ].filter((entry) => entry.file);

  if (imageEntries.length === 0) {
    throw payloadError('At least one photo is required.', 'AI_PAYLOAD_PHOTO_REQUIRED');
  }
  if (imageEntries.length > MAX_HEALTH_IMAGES) {
    throw payloadError(`Too many photos. Max ${MAX_HEALTH_IMAGES}.`, 'AI_PAYLOAD_TOO_MANY_PHOTOS', {
      max: MAX_HEALTH_IMAGES,
      count: imageEntries.length,
    });
  }
  for (const entry of imageEntries) validateImageSignature(entry.file, entry.label);
  validateDuplicateImages(imageEntries);

  if (video && (!Buffer.isBuffer(video.buffer) || video.buffer.length < 256)) {
    throw payloadError('Video is too small or empty. Please upload a real clip.', 'AI_PAYLOAD_VIDEO_TOO_SMALL');
  }

  const sanitized = {
    ...body,
    weightKg: validateWeightKg(body?.weightKg),
    vaccinated: normalizeYesNo(body?.vaccinated, 'vaccinated'),
    vaccineType: requireMaxText('vaccineType', body?.vaccineType, TEXT_LIMITS.vaccineType),
    neutered: normalizeYesNo(body?.neutered, 'neutered'),
    medicalHistory: requireMaxText('medicalHistory', body?.medicalHistory, TEXT_LIMITS.medicalHistory),
    symptomDescription: requireMaxText('symptomDescription', body?.symptomDescription, TEXT_LIMITS.symptomDescription),
    locale: normalizeLocale(body?.locale),
  };

  if (sanitized.vaccinated !== 'yes') {
    sanitized.vaccineType = '';
  }

  return {
    body: sanitized,
    outputLocale: sanitized.locale,
    imageCount: imageEntries.length,
    hasVideo: Boolean(video),
  };
}

export function validateBreedRecognitionPayload({ ordered, locale }) {
  const imageEntries = ordered.map(({ slot, file }) => ({ label: slot, file }));
  for (const entry of imageEntries) validateImageSignature(entry.file, entry.label);
  validateDuplicateImages(imageEntries);
  return {
    locale: normalizeLocale(locale),
    imageCount: imageEntries.length,
    slots: imageEntries.map((entry) => entry.label),
  };
}

export function validateTranslationRequestPayload(body) {
  const targetLocale = normalizeLocale(body?.targetLocale ?? 'vi');
  if (targetLocale !== 'vi') {
    throw payloadError('Only targetLocale vi is supported', 'UNSUPPORTED_LOCALE');
  }

  const rawIds = body?.analysisIds;
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    throw payloadError('analysisIds array required', 'INVALID_INPUT');
  }
  if (rawIds.length > MAX_TRANSLATION_RECORDS) {
    throw payloadError(`Too many analysisIds. Max ${MAX_TRANSLATION_RECORDS}.`, 'AI_PAYLOAD_TOO_MANY_TRANSLATIONS', {
      max: MAX_TRANSLATION_RECORDS,
      count: rawIds.length,
    });
  }

  const analysisIds = [...new Set(rawIds.map((x) => compactText(String(x))).filter(Boolean))];
  if (analysisIds.length === 0) {
    throw payloadError('analysisIds array required', 'INVALID_INPUT');
  }

  return {
    targetLocale,
    analysisIds,
    petIdFilter: typeof body?.petId === 'string' && body.petId.trim() ? body.petId.trim() : null,
  };
}

function collectTextLength(value) {
  if (typeof value === 'string') return compactText(value).length;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + collectTextLength(item), 0);
  if (value && typeof value === 'object') {
    return Object.values(value).reduce((sum, item) => sum + collectTextLength(item), 0);
  }
  return 0;
}

export function validateTranslationRecords(records) {
  return records.filter((record) => {
    const { id: _id, ...payload } = record;
    const textLength = collectTextLength(payload);
    if (textLength > TEXT_LIMITS.translationField) {
      throw payloadError('Translation payload is too large.', 'AI_PAYLOAD_TRANSLATION_TOO_LARGE', {
        limit: TEXT_LIMITS.translationField,
        length: textLength,
      });
    }
    return textLength > 0;
  });
}
