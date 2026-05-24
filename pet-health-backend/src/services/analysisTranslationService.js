import { GoogleGenAI } from '@google/genai';
import { parseJsonSafely } from './aiDiagnosisService.js';

const MODEL_CANDIDATES = String(process.env.GEMINI_MODEL_CANDIDATES || 'gemini-2.5-flash,gemini-2.0-flash')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

let ai = null;

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

/**
 * Build a minimal payload for translation (English UI text → Vietnamese).
 */
export function extractTranslatablePayload(row) {
  const safeArray = (v) => (Array.isArray(v) ? v : []);
  const assessment = row?.assessment && typeof row.assessment === 'object' ? row.assessment : null;
  const next =
    assessment?.next_action && typeof assessment.next_action === 'object'
      ? assessment.next_action
      : row?.next_action && typeof row.next_action === 'object'
        ? row.next_action
        : {};
  const summary = typeof next.summary === 'string' ? next.summary : '';
  const ask = safeArray(next.ask_user_to_add);

  const candidates = safeArray(assessment?.candidates ?? row?.diagnosis_candidates)
    .filter((x) => x && typeof x === 'object')
    .map((x) => ({
      name: typeof x.name === 'string' ? x.name : '',
      confidence: typeof x.confidence === 'number' ? x.confidence : 0,
    }));

  return {
    diagnosis:
      typeof assessment?.possible_finding === 'string'
        ? assessment.possible_finding
        : typeof row?.diagnosis === 'string'
          ? row.diagnosis
          : '',
    symptoms: safeArray(assessment?.observed_signs ?? row?.symptoms),
    treatment:
      typeof assessment?.care_guidance === 'string'
        ? assessment.care_guidance
        : typeof row?.treatment === 'string'
          ? row.treatment
          : '',
    disclaimer:
      typeof assessment?.safety?.disclaimer === 'string'
        ? assessment.safety.disclaimer
        : typeof row?.disclaimer === 'string'
          ? row.disclaimer
          : '',
    red_flags: safeArray(assessment?.red_flags ?? row?.red_flags),
    evidence: safeArray(assessment?.visual_evidence ?? row?.evidence),
    missing_data: safeArray(assessment?.missing_data ?? row?.missing_data),
    diagnosis_candidates: candidates,
    next_action: {
      summary,
      ask_user_to_add: ask,
    },
  };
}

/**
 * Translate stored analysis display fields from English to Vietnamese. Returns same shape as extractTranslatablePayload.
 */
export async function translateAnalysisFieldsToVietnamese(payload) {
  const client = getAiClient();
  const prompt = `You are a professional translator for veterinary triage UI text.
Translate the following JSON values from English to natural Vietnamese (Tiếng Việt). Keep medical meaning accurate and tone calm and clear for pet owners.

Rules:
- Output STRICT JSON only with exactly these keys: diagnosis, symptoms, treatment, disclaimer, red_flags, evidence, missing_data, diagnosis_candidates, next_action.
- symptoms, red_flags, evidence, missing_data are string arrays — translate each element.
- diagnosis_candidates is an array of { "name": string, "confidence": number } — translate "name" only; keep confidence unchanged.
- next_action is { "summary": string, "ask_user_to_add": string[] } — translate both.
- Do not add keys. Do not omit keys. Use empty string/array if input was empty.

INPUT JSON:
${JSON.stringify(payload)}
`;

  let lastError = null;
  for (const modelName of MODEL_CANDIDATES) {
    try {
      const result = await client.models.generateContent({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
        contents: [prompt],
      });
      return parseJsonSafely(result.text);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error('Translation failed');
}

/**
 * Translate multiple analysis text payloads in one model call (fewer round trips).
 * @param {Array<{ id: string } & Record<string, unknown>>} records
 */
export async function translateManyAnalysisRecordsToVietnamese(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return [];
  }
  const client = getAiClient();
  const input = { records };
  const prompt = `You translate veterinary triage UI records from English to Vietnamese for pet owners.

INPUT JSON has shape: { "records": [ { "id": string, "diagnosis", "symptoms", "treatment", "disclaimer", "red_flags", "evidence", "missing_data", "diagnosis_candidates", "next_action" }, ... ] }

OUTPUT STRICT JSON ONLY: { "records": [ same objects in the SAME ORDER with the SAME "id" values, all text translated to natural Vietnamese. Keep "diagnosis_candidates[].confidence" numbers unchanged. Translate "next_action.summary" and each "next_action.ask_user_to_add" string. } }

Do not skip records. Do not change ids. Same number of records as input.

INPUT:
${JSON.stringify(input)}
`;

  let lastError = null;
  for (const modelName of MODEL_CANDIDATES) {
    try {
      const result = await client.models.generateContent({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
        contents: [prompt],
      });
      const parsed = parseJsonSafely(result.text);
      const out = Array.isArray(parsed?.records) ? parsed.records : [];
      return out;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error('Batch translation failed');
}
