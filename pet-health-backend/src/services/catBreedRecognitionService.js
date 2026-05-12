import { GoogleGenAI } from '@google/genai';
import { parseJsonSafely, validateImageFile } from './aiDiagnosisService.js';

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

function normalizeOutputLocale(raw) {
  const s = String(raw ?? '').trim().toLowerCase();
  return s.startsWith('vi') ? 'vi' : 'en';
}

function buildBreedOutputLanguageBlock(locale) {
  const lang = normalizeOutputLocale(locale);
  if (lang === 'vi') {
    return `
Output language (mandatory):
- Write EVERY human-readable string value in natural Vietnamese (Tiếng Việt).
- Keep JSON keys in English exactly as in the schema.
`;
  }
  return `
Output language:
- Write all human-readable string values in clear English. Keep JSON keys exactly as specified.
`;
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normalizeBreedPayload(raw) {
  const primary = typeof raw?.primary_hypothesis === 'string' ? raw.primary_hypothesis.trim() : '';
  const disclaimer =
    typeof raw?.disclaimer === 'string' && raw.disclaimer.trim()
      ? raw.disclaimer.trim()
      : 'This is a preliminary visual guess only; it does not replace pedigree registration or veterinary assessment.';
  const alts = Array.isArray(raw?.alternatives)
    ? raw.alternatives
        .filter((x) => x && typeof x === 'object')
        .map((x) => ({
          label: typeof x.label === 'string' ? x.label.trim() : '',
          confidence: clamp01(Number(x.confidence)),
        }))
        .filter((x) => x.label)
    : [];
  const clues = Array.isArray(raw?.visible_clues)
    ? raw.visible_clues.filter((s) => typeof s === 'string').map((s) => s.trim()).filter(Boolean)
    : [];
  const missing = Array.isArray(raw?.missing_for_better_id)
    ? raw.missing_for_better_id.filter((s) => typeof s === 'string').map((s) => s.trim()).filter(Boolean)
    : [];
  const notes = typeof raw?.notes_for_owner === 'string' ? raw.notes_for_owner.trim() : '';

  return {
    primary_hypothesis: primary || 'Unable to summarize from images',
    confidence: clamp01(Number(raw?.confidence)),
    alternatives: alts.slice(0, 5),
    visible_clues: clues.slice(0, 12),
    missing_for_better_id: missing.slice(0, 8),
    notes_for_owner: notes,
    disclaimer,
  };
}

const SLOT_LABELS_EN = {
  face: 'FACE (front / clear head shape, ears)',
  eyes: 'EYES (close-up: iris color, shape)',
  pawPads: 'PAW PADS / TOES (underside of paws if visible)',
  coat: 'COAT / COLOR / PATTERN (body fur, markings)',
  fullBodySun: 'FULL BODY in natural outdoor daylight (helps true color)',
  parentPedigree: 'PARENT / PEDIGREE photo (pedigree book or parents if available)',
};

/**
 * @param {Array<{ slot: string, file: import('multer').File }>} orderedSlots
 * @param {string} [outputLocale='en']
 */
export async function analyzeCatBreedFromLabeledImages(orderedSlots, outputLocale = 'en') {
  if (!orderedSlots?.length) {
    const err = new Error('At least one image is required');
    err.status = 400;
    throw err;
  }

  for (const { file } of orderedSlots) {
    validateImageFile(file);
  }

  const slotLines = orderedSlots.map(({ slot, file }, i) => {
    const label = SLOT_LABELS_EN[slot] || String(slot).toUpperCase();
    return `Image ${i + 1} — slot "${slot}": ${label}. MIME: ${file.mimetype}.`;
  });

  const basePrompt = `
You help with PRELIMINARY domestic cat breed / phenotype guessing from labeled owner photos (Vietnam Cat Association–style intake: multiple angles).
This is NOT pedigree certification, NOT registration, and NOT a medical diagnosis.

${slotLines.join('\n')}

Rules:
- Prefer honest uncertainty. If the cat may be domestic random-bred / "mèo ta" or mixed, say so positively and kindly.
- Use point / color / pattern language only when supported by visible evidence (e.g. colourpoint "points" on ears/face/tail).
- Do not invent pedigree or registration claims.
- If images are insufficient for a confident guess, lower confidence and list what additional views would help.

Return STRICT JSON only with this schema:
{
  "primary_hypothesis": "short best guess: breed and/or color pattern in user-facing language",
  "confidence": 0.0,
  "alternatives": [{"label":"other plausible guess","confidence":0.0}],
  "visible_clues": ["bullet observations tied to what you see"],
  "missing_for_better_id": ["what extra photos would help"],
  "notes_for_owner": "1-3 sentences: mixed-breed friendly, practical",
  "disclaimer": "must state preliminary visual guess only"
}

confidence must be between 0 and 1.
${buildBreedOutputLanguageBlock(outputLocale)}
`;

  const imageParts = orderedSlots.map(({ file }) => ({
    inlineData: {
      data: file.buffer.toString('base64'),
      mimeType: file.mimetype,
    },
  }));

  const contents = [basePrompt, ...imageParts];
  const client = getAiClient();
  let parsed = null;
  let lastError = null;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const result = await client.models.generateContent({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
        contents,
      });
      parsed = parseJsonSafely(result.text);
      break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!parsed) {
    throw lastError ?? new Error('Failed to analyze breed images');
  }

  return normalizeBreedPayload(parsed);
}
