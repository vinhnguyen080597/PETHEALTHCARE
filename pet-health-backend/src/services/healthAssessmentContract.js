const SCHEMA_VERSION = 'health_assessment.v1';
const STATUSES = new Set(['ok', 'need_more_data', 'not_pet_or_unclear', 'emergency_flag']);
const SEVERITIES = new Set(['low', 'medium', 'high']);
const URGENCIES = new Set(['self_monitor', 'book_vet', 'urgent_vet', 'emergency_vet']);

const LENGTHS = {
  possibleFinding: 180,
  careGuidance: 700,
  disclaimer: 360,
  nextSummary: 280,
  arrayItem: 220,
  candidateRationale: 220,
};

const ARRAY_LIMITS = {
  observed_signs: 8,
  visual_evidence: 8,
  missing_data: 6,
  red_flags: 8,
  ask_user_to_add: 5,
  candidates: 5,
};

const DISCLAIMER = {
  en: 'This information is for reference only and does not replace diagnosis or treatment from a licensed veterinarian.',
  vi: 'Thông tin này chỉ để tham khảo, không thay thế chẩn đoán hoặc điều trị của bác sĩ thú y.',
};

const FALLBACK = {
  en: {
    possible_finding: 'Not enough reliable data for a health guidance suggestion',
    care_guidance:
      'Please add clearer photos or more context. If your pet has unusual, worsening, or severe signs, contact a veterinarian.',
    next_summary: 'Add clearer photos or contact a veterinarian if signs are concerning.',
  },
  vi: {
    possible_finding: 'Không đủ dữ liệu để đưa ra gợi ý đáng tin cậy',
    care_guidance:
      'Vui lòng bổ sung ảnh rõ hơn hoặc mô tả thêm. Nếu thú cưng có dấu hiệu bất thường, nặng hơn, hoặc nghiêm trọng, hãy liên hệ bác sĩ thú y.',
    next_summary: 'Bổ sung ảnh rõ hơn hoặc liên hệ bác sĩ thú y nếu dấu hiệu đáng lo.',
  },
};

const DEFINITIVE_PATTERNS = [
  /\bconfirmed\s+diagnosis\b/i,
  /\bdiagnosed\s+with\b/i,
  /\bdefinitely\b/i,
  /\bcertainly\b/i,
  /\bhas\s+(a\s+)?(disease|infection|condition)\b/i,
  /\bchắc chắn\b/i,
  /\bđã mắc\b/i,
  /\bmắc bệnh\b/i,
  /\bđược chẩn đoán\b/i,
  /\bxác nhận\b/i,
];

const UNSAFE_CARE_PATTERNS = [
  /\b\d+(\.\d+)?\s?(mg|mcg|g|ml|iu|units?|viên|ống|cc)\b/i,
  /\b(paracetamol|acetaminophen|ibuprofen|aspirin|tylenol|advil|naproxen)\b/i,
  /\b(human medication|human medicine)\b/i,
  /\b(inject|injection|self-inject|give antibiotics|antibiotic dose)\b/i,
  /\b(thuốc người|tự tiêm|tự chích|tự điều trị|kháng sinh|liều thuốc|uống thuốc)\b/i,
  /\b(wait\s+(several\s+)?days|delay\s+vet|avoid\s+vet)\b/i,
  /\b(trì hoãn|không cần đi thú y|khỏi cần đi thú y)\b/i,
];

function localeKey(raw) {
  return String(raw ?? '').toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

function clampZeroToOne(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function stripMarkup(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|mailto:)[^)]+\)/gi, '$1')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[`*_>#~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value, max) {
  const text = stripMarkup(value);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function stringArray(value, maxItems) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value) {
    const text = truncate(item, LENGTHS.arrayItem);
    if (text) out.push(text);
    if (out.length >= maxItems) break;
  }
  return out;
}

function hasPattern(text, patterns) {
  return patterns.some((pattern) => pattern.test(String(text ?? '')));
}

function containsUnsafeCare(assessmentLike) {
  const joined = [
    assessmentLike?.care_guidance,
    assessmentLike?.treatment,
    ...(Array.isArray(assessmentLike?.next_action?.ask_user_to_add) ? assessmentLike.next_action.ask_user_to_add : []),
    assessmentLike?.next_action?.summary,
  ]
    .filter(Boolean)
    .join(' ');
  return hasPattern(joined, UNSAFE_CARE_PATTERNS);
}

function containsDefinitiveDiagnosis(assessmentLike) {
  const joined = [
    assessmentLike?.possible_finding,
    assessmentLike?.diagnosis,
    ...(Array.isArray(assessmentLike?.candidates) ? assessmentLike.candidates.map((c) => c?.name) : []),
    ...(Array.isArray(assessmentLike?.diagnosis_candidates) ? assessmentLike.diagnosis_candidates.map((c) => c?.name) : []),
  ]
    .filter(Boolean)
    .join(' ');
  return hasPattern(joined, DEFINITIVE_PATTERNS);
}

function cautiousFinding(text, locale) {
  const clean = truncate(text, LENGTHS.possibleFinding);
  if (!clean) return FALLBACK[locale].possible_finding;
  if (!containsDefinitiveDiagnosis({ possible_finding: clean })) return clean;
  if (locale === 'vi') {
    return `Dấu hiệu có thể phù hợp với ${clean
      .replace(/^(chắc chắn|đã mắc|mắc bệnh|được chẩn đoán|xác nhận)\s*/i, '')
      .trim()}`;
  }
  return `Possible signs consistent with ${clean
    .replace(/^(confirmed diagnosis|diagnosed with|definitely|certainly|has)\s*/i, '')
    .trim()}`;
}

function normalizeUrgency(raw, status, severity) {
  if (typeof raw === 'string' && URGENCIES.has(raw)) return raw;
  if (status === 'emergency_flag') return 'emergency_vet';
  if (severity === 'high') return 'urgent_vet';
  if (severity === 'medium') return 'book_vet';
  return 'self_monitor';
}

function normalizeCandidates(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .filter((item) => item && typeof item === 'object')
    .slice(0, ARRAY_LIMITS.candidates)
    .map((item) => ({
      name: truncate(item.name, LENGTHS.arrayItem),
      confidence: clampZeroToOne(Number(item.confidence)),
      ...(typeof item.rationale === 'string' && item.rationale.trim()
        ? { rationale: truncate(item.rationale, LENGTHS.candidateRationale) }
        : {}),
    }))
    .filter((item) => item.name);
}

function fallbackAssessment(locale, outputLocale, reason = 'policy_fallback') {
  return {
    schema_version: SCHEMA_VERSION,
    output_locale: outputLocale,
    status: 'need_more_data',
    severity: 'medium',
    confidence: 0,
    possible_finding: FALLBACK[locale].possible_finding,
    observed_signs: [],
    visual_evidence: [],
    missing_data: [],
    care_guidance: FALLBACK[locale].care_guidance,
    red_flags: [],
    next_action: {
      urgency: 'book_vet',
      summary: FALLBACK[locale].next_summary,
      ask_user_to_add: [],
    },
    candidates: [],
    safety: {
      is_definitive_diagnosis: false,
      contains_medication_dosage: false,
      requires_vet_attention: true,
      disclaimer: DISCLAIMER[locale],
      policy_fallback: true,
      reason,
    },
  };
}

export function normalizeHealthAssessment(raw, outputLocale = 'en') {
  const output = localeKey(outputLocale);
  const locale = output;
  const source =
    raw?.assessment && typeof raw.assessment === 'object' && Object.keys(raw.assessment).length > 0
      ? raw.assessment
      : raw ?? {};
  if (!source || typeof source !== 'object') {
    return fallbackAssessment(locale, output, 'missing_object');
  }

  if (containsUnsafeCare(source)) {
    return fallbackAssessment(locale, output, 'unsafe_care_guidance');
  }

  const confidence = clampZeroToOne(Number(source.confidence));
  const status =
    typeof source.status === 'string' && STATUSES.has(source.status)
      ? source.status
      : confidence < 0.45
        ? 'need_more_data'
        : 'ok';
  const severity = typeof source.severity === 'string' && SEVERITIES.has(source.severity) ? source.severity : 'medium';
  const next = source.next_action && typeof source.next_action === 'object' ? source.next_action : {};
  const urgency = normalizeUrgency(next.urgency, status, severity);
  const redFlags = stringArray(source.red_flags, ARRAY_LIMITS.red_flags);

  const possibleFinding = cautiousFinding(source.possible_finding ?? source.diagnosis, locale);
  const careGuidance = truncate(source.care_guidance ?? source.treatment, LENGTHS.careGuidance);

  if (!possibleFinding || !careGuidance) {
    return fallbackAssessment(locale, output, 'missing_required_text');
  }

  const requiresVetAttention =
    urgency !== 'self_monitor' || status === 'emergency_flag' || severity === 'high' || redFlags.length > 0;

  return {
    schema_version: SCHEMA_VERSION,
    output_locale: output,
    status,
    severity,
    confidence,
    possible_finding: possibleFinding,
    observed_signs: stringArray(source.observed_signs ?? source.symptoms, ARRAY_LIMITS.observed_signs),
    visual_evidence: stringArray(source.visual_evidence ?? source.evidence, ARRAY_LIMITS.visual_evidence),
    missing_data: stringArray(source.missing_data, ARRAY_LIMITS.missing_data),
    care_guidance: careGuidance,
    red_flags: redFlags,
    next_action: {
      urgency,
      summary: truncate(next.summary, LENGTHS.nextSummary),
      ask_user_to_add: stringArray(next.ask_user_to_add, ARRAY_LIMITS.ask_user_to_add),
    },
    candidates: normalizeCandidates(source.candidates ?? source.diagnosis_candidates),
    safety: {
      is_definitive_diagnosis: false,
      contains_medication_dosage: false,
      requires_vet_attention: requiresVetAttention,
      disclaimer: truncate(source.safety?.disclaimer ?? source.disclaimer ?? DISCLAIMER[locale], LENGTHS.disclaimer),
    },
  };
}

export function legacyFieldsFromAssessment(assessment) {
  const safe = normalizeHealthAssessment({ assessment }, assessment?.output_locale ?? 'en');
  return {
    diagnosis: safe.possible_finding,
    severity: safe.severity,
    symptoms: safe.observed_signs,
    treatment:
      safe.status === 'emergency_flag'
        ? `${safe.care_guidance} ${
            safe.output_locale === 'vi'
              ? 'Ưu tiên đưa thú cưng đến cơ sở thú y gần nhất ngay lập tức.'
              : 'Prioritize immediate care at the nearest veterinary clinic.'
          }`
        : safe.care_guidance,
    confidence: safe.confidence,
    disclaimer: safe.safety.disclaimer,
    status: safe.status,
    red_flags: safe.red_flags,
    diagnosis_candidates: safe.candidates.map((item) => ({
      name: item.name,
      confidence: item.confidence,
    })),
    evidence: safe.visual_evidence,
    missing_data: safe.missing_data,
    next_action: {
      summary: safe.next_action.summary,
      ask_user_to_add: safe.next_action.ask_user_to_add,
      urgency: safe.next_action.urgency,
    },
  };
}

export function normalizeAnalysisRow(row) {
  if (!row || typeof row !== 'object') return row;
  const assessment = normalizeHealthAssessment(row.assessment ?? row, row.output_locale ?? row.assessment?.output_locale ?? 'en');
  return {
    ...row,
    assessment,
    ...legacyFieldsFromAssessment(assessment),
  };
}

export const HEALTH_ASSESSMENT_SCHEMA_VERSION = SCHEMA_VERSION;
