import { randomUUID } from 'node:crypto';
import { getSupabaseServiceClient } from '../config/supabase.js';
import { legacyFieldsFromAssessment, normalizeAnalysisRow } from '../services/healthAssessmentContract.js';
import { resolvePrivateMediaUrl, resolvePrivateMediaUrls } from '../services/imageStorageService.js';

const memoryAnalyses = [];

const DISPLAY_MERGE_KEYS = [
  'diagnosis',
  'symptoms',
  'treatment',
  'disclaimer',
  'red_flags',
  'evidence',
  'missing_data',
  'diagnosis_candidates',
  'next_action',
  'assessment',
];

function isMissingOptionalColumnError(error) {
  if (!error) return false;
  const msg = [error.message, error.details, error.hint, String(error.code ?? '')].filter(Boolean).join(' ');
  return (
    /Could not find the|column .* does not exist|42703/i.test(msg) ||
    (String(error.code) === 'PGRST204' &&
      /(weight_kg|video_url|extra_image|vaccination|neutering|medical_history|symptom_description|output_locale|display_translations|assessment)/i.test(
        msg,
      ))
  );
}

function isLikelyTranslationColumnMissing(error) {
  if (!error) return false;
  const msg = [error.message, error.details, error.hint].filter(Boolean).join(' ');
  return /output_locale|display_translations/i.test(msg);
}

function stripTranslationFields(row) {
  const { output_locale: _o, display_translations: _d, ...rest } = row;
  return rest;
}

function stripOptionalHealthFields(row) {
  const {
    extra_image_urls: _e,
    video_url: _v,
    weight_kg: _w,
    vaccination_status: _vs,
    vaccine_type: _vt,
    neutering_status: _ns,
    medical_history: _mh,
    symptom_description: _sd,
    assessment: _a,
    ...rest
  } = row;
  return rest;
}

function overlayAssessmentFromLegacy(row) {
  if (!row?.assessment || typeof row.assessment !== 'object') return row;
  const legacy = legacyFieldsFromAssessment(row.assessment);
  const assessment = {
    ...row.assessment,
    possible_finding: typeof row.diagnosis === 'string' ? row.diagnosis : legacy.diagnosis,
    observed_signs: Array.isArray(row.symptoms) ? row.symptoms : legacy.symptoms,
    care_guidance: typeof row.treatment === 'string' ? row.treatment : legacy.treatment,
    red_flags: Array.isArray(row.red_flags) ? row.red_flags : legacy.red_flags,
    visual_evidence: Array.isArray(row.evidence) ? row.evidence : legacy.evidence,
    missing_data: Array.isArray(row.missing_data) ? row.missing_data : legacy.missing_data,
    candidates: Array.isArray(row.diagnosis_candidates)
      ? row.diagnosis_candidates.map((item) => ({ name: item.name, confidence: item.confidence }))
      : row.assessment.candidates,
    next_action:
      row.next_action && typeof row.next_action === 'object'
        ? { ...row.assessment.next_action, ...row.next_action }
        : row.assessment.next_action,
    safety: {
      ...(row.assessment.safety && typeof row.assessment.safety === 'object' ? row.assessment.safety : {}),
      disclaimer: typeof row.disclaimer === 'string' ? row.disclaimer : legacy.disclaimer,
    },
  };
  return { ...row, assessment };
}

async function withSignedAnalysisMedia(row) {
  if (!row) return row;
  const normalized = normalizeAnalysisRow(row);
  const extraImageUrls = await resolvePrivateMediaUrls(normalized.extra_image_urls ?? []);
  const imageUrl = normalized.image_url ? await resolvePrivateMediaUrl(normalized.image_url) : normalized.image_url;
  const videoUrl = normalized.video_url ? await resolvePrivateMediaUrl(normalized.video_url) : normalized.video_url;
  return {
    ...normalized,
    image_url: imageUrl,
    extra_image_urls: extraImageUrls,
    video_url: videoUrl,
    media: normalized.media
      ? {
          ...normalized.media,
          image_url: imageUrl,
          extra_image_urls: extraImageUrls,
          video_url: videoUrl,
        }
      : normalized.media,
  };
}

const DEFAULT_ANALYSIS_PAGE_LIMIT = 20;
const MAX_ANALYSIS_PAGE_LIMIT = 50;
const LIST_ANALYSIS_SELECT =
  'id,user_id,pet_id,diagnosis,severity,confidence,created_at,output_locale,display_translations,assessment,symptoms,treatment,disclaimer,status,red_flags';

function normalizeAnalysisPageLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_ANALYSIS_PAGE_LIMIT;
  return Math.min(Math.max(Math.round(parsed), 1), MAX_ANALYSIS_PAGE_LIMIT);
}

function badAnalysisCursorError() {
  const err = new Error('Invalid analysis cursor.');
  err.status = 400;
  err.code = 'INVALID_ANALYSIS_CURSOR';
  return err;
}

function decodeAnalysisCursor(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(String(value), 'base64url').toString('utf8'));
    if (!parsed || typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'string') {
      throw badAnalysisCursorError();
    }
    const createdAtMs = new Date(parsed.createdAt).getTime();
    if (!Number.isFinite(createdAtMs) || !parsed.id.trim()) throw badAnalysisCursorError();
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch (err) {
    if (err?.code === 'INVALID_ANALYSIS_CURSOR') throw err;
    throw badAnalysisCursorError();
  }
}

function encodeAnalysisCursor(row) {
  if (!row?.created_at || !row?.id) return null;
  return Buffer.from(JSON.stringify({ createdAt: row.created_at, id: row.id }), 'utf8').toString('base64url');
}

function compareAnalysesDesc(a, b) {
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}

function isBeforeAnalysisCursor(row, cursor) {
  if (!cursor) return true;
  if (row.created_at < cursor.createdAt) return true;
  return row.created_at === cursor.createdAt && row.id < cursor.id;
}

/** Slim list DTO: enough for profile/history cards; no signed media. */
export function toListAnalysisRow(row) {
  const normalized = normalizeAnalysisRow(row);
  const assessment =
    normalized.assessment && typeof normalized.assessment === 'object'
      ? {
          schema_version: normalized.assessment.schema_version,
          possible_finding: normalized.assessment.possible_finding,
          severity: normalized.assessment.severity,
          confidence: normalized.assessment.confidence,
          safety: normalized.assessment.safety ?? null,
        }
      : null;
  return {
    id: normalized.id,
    user_id: normalized.user_id,
    pet_id: normalized.pet_id,
    diagnosis: typeof normalized.diagnosis === 'string' ? normalized.diagnosis : '',
    severity: normalized.severity,
    confidence: normalized.confidence,
    created_at: normalized.created_at,
    output_locale: normalized.output_locale ?? null,
    assessment,
    has_vi_translation: Boolean(normalized.display_translations?.vi && typeof normalized.display_translations.vi === 'object'),
    list_incomplete: true,
    image_url: null,
    extra_image_urls: [],
    video_url: null,
    symptoms: [],
    treatment: '',
    disclaimer: '',
  };
}

function resolveDisplayLocale(displayLocale) {
  return typeof displayLocale === 'string' && displayLocale.trim().slice(0, 2).toLowerCase().startsWith('vi')
    ? 'vi'
    : null;
}

/** When reading analyses with UI locale `vi`, merge cached Vietnamese strings from display_translations. */
export function mergeDisplayLocaleRow(row, displayLocale) {
  if (!row || displayLocale !== 'vi') return row;
  const pack = row.display_translations?.vi;
  if (!pack || typeof pack !== 'object') return row;
  const out = { ...row };
  for (const k of DISPLAY_MERGE_KEYS) {
    if (pack[k] !== undefined) out[k] = pack[k];
  }
  return pack.assessment ? out : overlayAssessmentFromLegacy(out);
}

export async function createAnalysisRecord(payload) {
  const row = {
    id: randomUUID(),
    user_id: payload.userId,
    pet_id: payload.petId,
    diagnosis: payload.diagnosis,
    severity: payload.severity,
    symptoms: payload.symptoms,
    treatment: payload.treatment,
    confidence: payload.confidence,
    disclaimer: payload.disclaimer,
    assessment: payload.assessment && typeof payload.assessment === 'object' ? payload.assessment : {},
    image_url: payload.imageUrl ?? null,
    extra_image_urls: Array.isArray(payload.extraImageUrls) ? payload.extraImageUrls : [],
    video_url: payload.videoUrl ?? null,
    weight_kg: payload.weightKg ?? null,
    vaccination_status: payload.vaccinationStatus ?? null,
    vaccine_type: payload.vaccineType ?? null,
    neutering_status: payload.neuteringStatus ?? null,
    medical_history: payload.medicalHistory ?? null,
    symptom_description: payload.symptomDescription ?? null,
    created_at: new Date().toISOString(),
    output_locale:
      typeof payload.outputLocale === 'string' && payload.outputLocale.trim()
        ? payload.outputLocale.trim().slice(0, 16).toLowerCase()
        : 'en',
    display_translations:
      payload.displayTranslations && typeof payload.displayTranslations === 'object' ? payload.displayTranslations : {},
  };

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    memoryAnalyses.push(row);
    return withSignedAnalysisMedia(row);
  }

  const variants = [
    row,
    stripTranslationFields(row),
    stripOptionalHealthFields(row),
    stripOptionalHealthFields(stripTranslationFields(row)),
  ];

  let lastError = null;
  for (const attempt of variants) {
    const { data, error } = await supabase.from('analyses').insert(attempt).select('*').single();
    if (!error) return withSignedAnalysisMedia(data);
    lastError = error;
    if (!isMissingOptionalColumnError(error)) {
      throw error;
    }
  }
  throw lastError;
}

export async function listAnalysesByPet(userId, petId, displayLocaleOrOptions = null, maybeOptions = undefined) {
  // Backward compatible: listAnalysesByPet(userId, petId, displayLocale)
  // or listAnalysesByPet(userId, petId, { displayLocale, limit, cursor, view })
  const options =
    displayLocaleOrOptions && typeof displayLocaleOrOptions === 'object' && !Array.isArray(displayLocaleOrOptions)
      ? displayLocaleOrOptions
      : { ...(maybeOptions && typeof maybeOptions === 'object' ? maybeOptions : {}), displayLocale: displayLocaleOrOptions };

  const loc = resolveDisplayLocale(options.displayLocale ?? null);
  const limit = normalizeAnalysisPageLimit(options.limit);
  const cursor = decodeAnalysisCursor(options.cursor);
  const view = options.view === 'full' ? 'full' : 'list';

  let rows;
  let totalCount = null;
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const filtered = memoryAnalyses
      .filter((item) => item.user_id === userId && item.pet_id === petId)
      .sort(compareAnalysesDesc);
    totalCount = filtered.length;
    const window = filtered.filter((row) => isBeforeAnalysisCursor(row, cursor)).slice(0, limit + 1);
    rows = window.slice(0, limit);
    const page = await mapAnalysisPageRows(rows, loc, view);
    return {
      data: page,
      nextCursor: window.length > limit ? encodeAnalysisCursor(rows[rows.length - 1]) : null,
      totalCount,
    };
  }

  let query = supabase
    .from('analyses')
    .select(view === 'list' ? LIST_ANALYSIS_SELECT : '*', cursor ? {} : { count: 'exact' })
    .eq('user_id', userId)
    .eq('pet_id', petId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  const fetched = data ?? [];
  rows = fetched.slice(0, limit);
  if (typeof count === 'number') totalCount = count;

  const page = await mapAnalysisPageRows(rows, loc, view);
  return {
    data: page,
    nextCursor: fetched.length > limit ? encodeAnalysisCursor(rows[rows.length - 1]) : null,
    totalCount,
  };
}

async function mapAnalysisPageRows(rows, loc, view) {
  const merged = loc ? rows.map((r) => mergeDisplayLocaleRow(r, loc)) : rows;
  if (view === 'full') {
    return Promise.all(merged.map((r) => withSignedAnalysisMedia(r)));
  }
  return merged.map((r) => toListAnalysisRow(r));
}

export async function getAnalysisByIdForUser(userId, analysisId) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const row = memoryAnalyses.find((x) => x.id === analysisId && x.user_id === userId) ?? null;
    return row ? withSignedAnalysisMedia(row) : null;
  }
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', analysisId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? withSignedAnalysisMedia(data) : data;
}

/** Merge `{ vi: {...} }` into display_translations and persist. Returns updated row when possible. */
export async function mergeAnalysisDisplayTranslation(userId, analysisId, localeKey, partial) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const idx = memoryAnalyses.findIndex((x) => x.id === analysisId && x.user_id === userId);
    if (idx < 0) return null;
    const prev = memoryAnalyses[idx].display_translations && typeof memoryAnalyses[idx].display_translations === 'object'
      ? memoryAnalyses[idx].display_translations
      : {};
    memoryAnalyses[idx] = {
      ...memoryAnalyses[idx],
      display_translations: { ...prev, [localeKey]: partial },
    };
    return withSignedAnalysisMedia(memoryAnalyses[idx]);
  }

  const current = await getAnalysisByIdForUser(userId, analysisId);
  if (!current) return null;

  const prev = current.display_translations && typeof current.display_translations === 'object' ? current.display_translations : {};
  const next = { ...prev, [localeKey]: partial };

  const { data, error } = await supabase
    .from('analyses')
    .update({ display_translations: next })
    .eq('id', analysisId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error && isLikelyTranslationColumnMissing(error)) {
    console.warn('[analyses] display_translations column missing; translation not persisted for', analysisId);
    return current ? withSignedAnalysisMedia(current) : current;
  }
  if (error) throw error;
  return data ? withSignedAnalysisMedia(data) : data;
}
