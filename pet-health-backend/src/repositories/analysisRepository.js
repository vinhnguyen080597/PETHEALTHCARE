import { randomUUID } from 'node:crypto';
import { getSupabaseServiceClient } from '../config/supabase.js';
import { legacyFieldsFromAssessment, normalizeAnalysisRow } from '../services/healthAssessmentContract.js';

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
    return normalizeAnalysisRow(row);
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
    if (!error) return normalizeAnalysisRow(data);
    lastError = error;
    if (!isMissingOptionalColumnError(error)) {
      throw error;
    }
  }
  throw lastError;
}

export async function listAnalysesByPet(userId, petId, displayLocale = null) {
  let rows;
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    rows = memoryAnalyses
      .filter((item) => item.user_id === userId && item.pet_id === petId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  } else {
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', userId)
      .eq('pet_id', petId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    rows = data;
  }
  const loc = typeof displayLocale === 'string' && displayLocale.trim().slice(0, 2).toLowerCase().startsWith('vi')
    ? 'vi'
    : null;
  const merged = loc ? rows.map((r) => mergeDisplayLocaleRow(r, loc)) : rows;
  return merged.map((r) => normalizeAnalysisRow(r));
}

export async function getAnalysisByIdForUser(userId, analysisId) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const row = memoryAnalyses.find((x) => x.id === analysisId && x.user_id === userId) ?? null;
    return row ? normalizeAnalysisRow(row) : null;
  }
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', analysisId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeAnalysisRow(data) : data;
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
    return normalizeAnalysisRow(memoryAnalyses[idx]);
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
    return current ? normalizeAnalysisRow(current) : current;
  }
  if (error) throw error;
  return data ? normalizeAnalysisRow(data) : data;
}
