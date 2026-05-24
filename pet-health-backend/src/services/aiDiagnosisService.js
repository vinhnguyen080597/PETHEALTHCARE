import { GoogleGenAI } from '@google/genai';

const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_VIDEO_FILE_SIZE = 10 * 1024 * 1024;
const SUPPORTED_VIDEO_MIMES = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp']);
const MAX_IMAGES_FOR_MODEL = 6;
const MODEL_CANDIDATES = String(process.env.GEMINI_MODEL_CANDIDATES || 'gemini-2.5-flash,gemini-2.0-flash')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

let ai = null;
const AI_DEBUG_LOG_ENABLED = /^(1|true|yes)$/i.test(String(process.env.AI_DEBUG_LOG_ENABLED || ''));
const AI_DEBUG_LOG_INCLUDE_MEDIA_BASE64 = /^(1|true|yes)$/i.test(
  String(process.env.AI_DEBUG_LOG_INCLUDE_MEDIA_BASE64 || ''),
);

function toMb(bytes) {
  return Number(bytes || 0) / (1024 * 1024);
}

function buildAiRequestDebugPayload(modelName, files, prompt, imageParts) {
  return {
    model: modelName,
    prompt,
    mediaCount: imageParts.length,
    media: files.map((file, idx) => ({
      index: idx,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      sizeMB: Number(toMb(file.size).toFixed(3)),
      ...(AI_DEBUG_LOG_INCLUDE_MEDIA_BASE64
        ? { base64Preview: file.buffer.toString('base64').slice(0, 120) }
        : {}),
    })),
  };
}

function debugAiLog(label, payload) {
  if (!AI_DEBUG_LOG_ENABLED) return;
  try {
    console.log(`[AI_DEBUG] ${label}:`, JSON.stringify(payload, null, 2));
  } catch {
    console.log(`[AI_DEBUG] ${label}:`, payload);
  }
}

function getAiClient() {
  if (ai) return ai;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is missing');
    err.status = 500;
    throw err;
  }

  ai = new GoogleGenAI({ apiKey });
  return ai;
}

function clampZeroToOne(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === 'string').map((v) => v.trim()).filter(Boolean);
}

function normalizeStatus(rawStatus, confidence) {
  const allowed = new Set(['ok', 'need_more_data', 'not_pet_or_unclear', 'emergency_flag']);
  if (typeof rawStatus === 'string' && allowed.has(rawStatus)) return rawStatus;
  if (confidence < 0.45) return 'need_more_data';
  return 'ok';
}

function normalizeDiagnosisCandidates(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      name: typeof item.name === 'string' ? item.name.trim() : '',
      confidence: clampZeroToOne(Number(item.confidence)),
    }))
    .filter((item) => item.name);
}

function normalizeNextAction(value) {
  if (!value || typeof value !== 'object') {
    return { summary: '', ask_user_to_add: [] };
  }
  return {
    summary: typeof value.summary === 'string' ? value.summary.trim() : '',
    ask_user_to_add: asStringArray(value.ask_user_to_add),
  };
}

export function parseJsonSafely(rawText) {
  const text = String(rawText ?? '').trim();
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : text;

  try {
    return JSON.parse(candidate);
  } catch {
    const objectStart = candidate.indexOf('{');
    const objectEnd = candidate.lastIndexOf('}');
    if (objectStart >= 0 && objectEnd > objectStart) {
      const objectSlice = candidate.slice(objectStart, objectEnd + 1);
      return JSON.parse(objectSlice);
    }
    throw new Error('Model output is not valid JSON');
  }
}

function normalizeDiagnosisPayload(raw) {
  const confidence = clampZeroToOne(Number(raw?.confidence));
  const status = normalizeStatus(raw?.status, confidence);
  const nextAction = normalizeNextAction(raw?.next_action);

  return {
    diagnosis: typeof raw?.diagnosis === 'string' ? raw.diagnosis : 'Unable to assess',
    severity: ['low', 'medium', 'high'].includes(raw?.severity) ? raw.severity : 'medium',
    symptoms: asStringArray(raw?.symptoms),
    treatment:
      typeof raw?.treatment === 'string'
        ? raw.treatment
        : 'Monitor your pet closely and consult a veterinarian if signs persist or worsen.',
    confidence,
    disclaimer:
      typeof raw?.disclaimer === 'string'
        ? raw.disclaimer
        : 'This AI wellness screening is for early guidance only and is not a veterinary diagnosis. Consult a licensed veterinarian for medical decisions.',
    // Extended fields for richer UX; kept optional/derived for backward compatibility.
    status,
    red_flags: asStringArray(raw?.red_flags),
    diagnosis_candidates: normalizeDiagnosisCandidates(raw?.diagnosis_candidates),
    evidence: asStringArray(raw?.evidence),
    missing_data: asStringArray(raw?.missing_data),
    next_action: {
      summary: nextAction.summary,
      ask_user_to_add: nextAction.ask_user_to_add,
    },
  };
}

export function validateImageFile(file) {
  if (!file) {
    const err = new Error("Please upload an image file as 'image'");
    err.status = 400;
    throw err;
  }

  if (!SUPPORTED_IMAGE_MIMES.has(file.mimetype)) {
    const err = new Error('Unsupported file type. Use jpeg, png, or webp');
    err.status = 400;
    throw err;
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    const err = new Error('Image too large. Max 5MB');
    err.status = 400;
    throw err;
  }
}

/** Optional health-check clip: max 10 MB (client should cap length ≈10s). */
export function validateVideoFile(file) {
  if (!file) return;

  if (!SUPPORTED_VIDEO_MIMES.has(file.mimetype)) {
    const err = new Error('Unsupported video type. Use MP4, MOV, WebM, or 3GP');
    err.status = 400;
    throw err;
  }

  if (file.size > MAX_VIDEO_FILE_SIZE) {
    const err = new Error('Video too large. Max 10 MB (about 10 seconds).');
    err.status = 400;
    throw err;
  }
}

/** UI locale → model output language (string values in JSON only). */
function normalizeOutputLocale(raw) {
  const s = String(raw ?? '').trim().toLowerCase();
  return s.startsWith('vi') ? 'vi' : 'en';
}

function buildOutputLanguageBlock(locale) {
  const lang = normalizeOutputLocale(locale);
  if (lang === 'vi') {
    return `

Output language (mandatory for Vietnamese users):
- Write EVERY human-readable string value in Vietnamese (Tiếng Việt natural, clear): diagnosis, symptoms[], treatment, disclaimer, red_flags[], diagnosis_candidates[].name, evidence[], missing_data[], next_action.summary, next_action.ask_user_to_add[].
- Wording must be cautious: describe "dấu hiệu có thể gặp", "gợi ý chăm sóc tham khảo", and "nên thăm khám thú y" when needed. Do not phrase output as a confirmed diagnosis.
- Keep ALL JSON keys in English exactly as in the schema above. Enum fields must stay in English tokens only: status (ok|need_more_data|not_pet_or_unclear|emergency_flag), severity (low|medium|high).
- If the owner wrote notes in another language, you may still respond in Vietnamese.
`;
  }
  return `

Output language:
- Write all human-readable string values in clear English. Keep JSON keys and enum tokens (status, severity) exactly as specified.
`;
}

export function buildHealthContextAppendix(body) {
  const lines = [];
  const w = typeof body.weightKg === 'string' ? body.weightKg.trim() : '';
  if (w) lines.push(`Weight (kg): ${w}`);

  const vac = body.vaccinated;
  if (vac === 'yes' || vac === 'no') {
    const vt = typeof body.vaccineType === 'string' ? body.vaccineType.trim() : '';
    lines.push(
      vac === 'yes'
        ? `Vaccinated: yes${vt ? `; vaccine details: ${vt}` : ''}`
        : 'Vaccinated: no',
    );
  }

  const neu = body.neutered;
  if (neu === 'yes' || neu === 'no') {
    lines.push(`Neutered/spayed: ${neu}`);
  }

  const mh = typeof body.medicalHistory === 'string' ? body.medicalHistory.trim() : '';
  if (mh) lines.push(`Medical history: ${mh}`);

  const sx = typeof body.symptomDescription === 'string' ? body.symptomDescription.trim() : '';
  if (sx) lines.push(`Symptom / owner notes: ${sx}`);

  if (!lines.length) return '';
  return `\n\nOwner-provided context (use together with images; this is not a substitute for an exam):\n${lines.join('\n')}`;
}

/**
 * @param {import('multer').File[]} imageFiles - primary first, then extras (jpeg/png/webp)
 * @param {string} healthContextAppendix - from buildHealthContextAppendix
 * @param {string} [outputLocale='en'] - 'vi' | 'en' (from client UI language)
 */
export async function analyzePetHealthImages(imageFiles, healthContextAppendix = '', outputLocale = 'en') {
  const files = (imageFiles || []).filter(Boolean).slice(0, MAX_IMAGES_FOR_MODEL);
  if (!files.length) {
    const err = new Error('At least one image is required');
    err.status = 400;
    throw err;
  }

  for (const f of files) {
    validateImageFile(f);
  }

  const basePrompt = `
You are a veterinary wellness screening assistant for pet health checks.
Analyze uploaded media and owner context, then return STRICT JSON only.

Scope:
- Supported species: dog, cat.
- Provide early wellness screening guidance, not a definitive diagnosis.
- Be conservative and safe.
- Never imply that AI replaces an in-person veterinarian.

Required schema:
{
  "status": "ok|need_more_data|not_pet_or_unclear|emergency_flag",
  "diagnosis": "short possible finding or condition; phrase as possible/not confirmed",
  "severity": "low|medium|high",
  "symptoms": ["observed sign 1", "observed sign 2"],
  "treatment": "safe care guidance and when to visit a veterinarian",
  "confidence": 0.0,
  "disclaimer": "This AI wellness screening is for early guidance only and is not a veterinary diagnosis. Consult a licensed veterinarian for medical decisions.",
  "red_flags": ["optional danger signs"],
  "diagnosis_candidates": [{"name":"possible candidate, not confirmed","confidence":0.0}],
  "evidence": ["visual findings from media"],
  "missing_data": ["what is missing for better assessment"],
  "next_action": {
    "summary": "what user should do now",
    "ask_user_to_add": ["specific additional photos/data to upload"]
  }
}

Rules:
- confidence must be between 0 and 1.
- If species is unclear/not dog-cat -> status = "not_pet_or_unclear".
- If image quality/context is insufficient -> status = "need_more_data".
- If emergency signs are present -> status = "emergency_flag", severity = "high".
- If confidence < 0.45, prefer status = "need_more_data" unless emergency.
- Do not invent findings not visible in media/context.
- Avoid definitive wording such as "has", "diagnosed with", "confirmed", or exact treatment plans.
- For concerning signs, recommend timely in-person veterinary care instead of home diagnosis.
- If multiple images are provided, synthesize findings across all views.
${healthContextAppendix}
${buildOutputLanguageBlock(outputLocale)}
`;

  const imageParts = files.map((file) => ({
    inlineData: {
      data: file.buffer.toString('base64'),
      mimeType: file.mimetype,
    },
  }));

  const contents = [basePrompt, ...imageParts];

  const client = getAiClient();
  let parsedResult = null;
  let lastError = null;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      debugAiLog('REQUEST', buildAiRequestDebugPayload(modelName, files, basePrompt, imageParts));
      const result = await client.models.generateContent({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
        contents,
      });
      debugAiLog('RAW_RESPONSE', {
        model: modelName,
        text: result?.text ?? null,
      });
      parsedResult = parseJsonSafely(result.text);
      debugAiLog('PARSED_RESPONSE', {
        model: modelName,
        parsed: parsedResult,
      });
      break;
    } catch (err) {
      debugAiLog('MODEL_ERROR', {
        model: modelName,
        message: err?.message || String(err),
      });
      lastError = err;
    }
  }

  if (!parsedResult) {
    throw lastError ?? new Error('Failed to analyze image');
  }

  return normalizeDiagnosisPayload(parsedResult);
}

/** @deprecated path — prefer analyzePetHealthImages with optional extras */
export async function analyzePetImage(file, outputLocale = 'en') {
  return analyzePetHealthImages([file], '', outputLocale);
}
