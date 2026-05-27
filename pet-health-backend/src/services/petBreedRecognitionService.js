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

function cleanString(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.replace(/\s+/g, ' ').trim() || fallback;
}

function cleanStringArray(value, limit) {
  return Array.isArray(value)
    ? value
        .map((s) => cleanString(s))
        .filter(Boolean)
        .slice(0, limit)
    : [];
}

function normalizeLevel(value) {
  const v = cleanString(value).toLowerCase();
  return ['low', 'medium', 'high'].includes(v) ? v : 'medium';
}

function normalizePrimary(raw, primary, confidence) {
  const src = raw?.primary && typeof raw.primary === 'object' ? raw.primary : {};
  return {
    breed_name: cleanString(src.breed_name, primary || 'Unknown breed type'),
    phenotype_label: cleanString(src.phenotype_label),
    confidence,
    summary: cleanString(src.summary, primary || 'Preliminary visual breed suggestion.'),
  };
}

function normalizeBreedProfile(raw) {
  const src = raw?.breed_profile && typeof raw.breed_profile === 'object' ? raw.breed_profile : {};
  return {
    origin: cleanString(src.origin),
    size: cleanString(src.size),
    coat: cleanString(src.coat),
    temperament: cleanStringArray(src.temperament, 6),
    activity_level: normalizeLevel(src.activity_level),
    grooming_needs: normalizeLevel(src.grooming_needs),
  };
}

function normalizeVisualEvidence(raw, fallbackClues) {
  const src = Array.isArray(raw?.visual_evidence) ? raw.visual_evidence : [];
  const evidence = src
    .filter((x) => x && typeof x === 'object')
    .map((x) => ({
      trait: cleanString(x.trait),
      observation: cleanString(x.observation),
      source_slot: cleanString(x.source_slot),
    }))
    .filter((x) => x.trait || x.observation)
    .slice(0, 10);

  if (evidence.length) return evidence;
  return fallbackClues.slice(0, 8).map((clue) => ({ trait: '', observation: clue, source_slot: '' }));
}

function normalizeCareOverview(raw) {
  const src = Array.isArray(raw?.care_overview) ? raw.care_overview : [];
  return src
    .filter((x) => x && typeof x === 'object')
    .map((x) => ({
      title: cleanString(x.title),
      body: cleanString(x.body),
    }))
    .filter((x) => x.title || x.body)
    .slice(0, 4);
}

function normalizeSources(raw) {
  const src = Array.isArray(raw?.sources) ? raw.sources : [];
  return src
    .filter((x) => x && typeof x === 'object')
    .map((x) => ({
      title: cleanString(x.title),
      url: cleanString(x.url),
    }))
    .filter((x) => x.title && /^https?:\/\//i.test(x.url))
    .slice(0, 4);
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
          reason: cleanString(x.reason),
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
  const confidence = clamp01(Number(raw?.confidence ?? raw?.primary?.confidence));
  const primaryResult = normalizePrimary(raw, primary, confidence);

  return {
    schema_version: 'breed_recognition.v2',
    primary: primaryResult,
    breed_profile: normalizeBreedProfile(raw),
    visual_evidence: normalizeVisualEvidence(raw, clues),
    care_overview: normalizeCareOverview(raw),
    sources: normalizeSources(raw),
    primary_hypothesis: primary || primaryResult.breed_name || 'Unable to summarize from images',
    confidence,
    alternatives: alts.slice(0, 5),
    visible_clues: clues.slice(0, 12),
    missing_for_better_id: missing.slice(0, 8),
    notes_for_owner: notes,
    disclaimer,
  };
}

const SLOT_LABELS_EN = {
  face: 'FACE (front / clear head shape, ears)',
  fullBodySide: 'FULL BODY SIDE PROFILE (standing on a flat surface; whole body visible)',
  coat: 'COAT / COLOR / PATTERN (body fur, markings, texture)',
  eyes: 'EYES (close-up: iris color, shape)',
  headProfile: 'HEAD SIDE PROFILE (nose bridge, muzzle, forehead, stop/profile)',
  pawPads: 'PAW PADS / TOES (underside of paws if visible)',
  tail: 'TAIL (length, carriage, coat, shape)',
  frontFullBody: 'FULL FRONT BODY VIEW (standing; front structure and facial characteristics)',
  ears: 'EARS (set, shape, size, carriage)',
  parentPedigree: 'PARENT / PEDIGREE photo (pedigree book or parents if available)',
};

/**
 * @param {'cat' | 'dog'} species
 */
function buildSpeciesTaskBlock(species) {
  if (species === 'cat') {
    return `
You help with PRELIMINARY domestic cat breed / phenotype guessing from labeled owner photos (multi-angle intake similar to pedigree-style documentation).
This is NOT pedigree certification, NOT registration, and NOT a medical diagnosis.

Rules specific to cats:
- Prefer honest uncertainty. If the cat may be domestic random-bred / "mèo ta" or mixed, say so positively and kindly.
- Focus on head shape, side profile, ears, eyes, body type, coat texture/color/pattern, tail, and paws only when visible.
- Use point / color / pattern language only when supported by visible evidence (e.g. colourpoint "points" on ears/face/tail).
`;
  }
  return `
You help with PRELIMINARY domestic dog breed / phenotype guessing from labeled owner photos (multi-angle intake similar to breed documentation).
This is NOT pedigree certification, NOT registration, and NOT a medical diagnosis.

Rules specific to dogs:
- Prefer honest uncertainty. If the dog may be a village / street mix, random-bred, or heavily mixed, say so positively and kindly.
- A full front view and full side profile are important for visual breed-type intake; use them when available.
- Mention size estimate, body proportions, ear set, muzzle shape, tail, and coat only when visible; do not invent lineage.
`;
}

/**
 * @param {Array<{ slot: string, file: import('multer').File }>} orderedSlots
 * @param {'cat' | 'dog'} species
 * @param {string} [outputLocale='en']
 */
export async function analyzePetBreedFromLabeledImages(orderedSlots, species, outputLocale = 'en') {
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

  const speciesBlock = buildSpeciesTaskBlock(species);

  const basePrompt = `
${speciesBlock}

${slotLines.join('\n')}

Shared rules:
- Do not invent pedigree or registration claims.
- If images are insufficient for a confident guess, lower confidence and list what additional views would help.
- Treat these photos as informal visual context only. Official registries typically require pedigree/registration records, microchip/tattoo, DNA/testing, or judge review rather than app photos alone.

Return STRICT JSON only with this schema:
{
  "schema_version": "breed_recognition.v2",
  "primary": {
    "breed_name": "short breed/type name only",
    "phenotype_label": "optional color, coat, or phenotype label",
    "confidence": 0.0,
    "summary": "1-2 concise sentences summarizing the result"
  },
  "breed_profile": {
    "origin": "short origin/history if commonly known; empty string if uncertain",
    "size": "small|medium|large or short natural text",
    "coat": "short coat description",
    "temperament": ["common temperament traits, phrased as typical/not guaranteed"],
    "activity_level": "low|medium|high",
    "grooming_needs": "low|medium|high"
  },
  "visual_evidence": [
    { "trait": "e.g. face, ears, coat, body", "observation": "what is visible", "source_slot": "slot key if known" }
  ],
  "care_overview": [
    { "title": "short care/profile topic", "body": "1 sentence practical context" }
  ],
  "sources": [
    { "title": "relevant registry or general source name", "url": "https://..." }
  ],
  "primary_hypothesis": "short best guess: breed and/or color pattern in user-facing language",
  "confidence": 0.0,
  "alternatives": [{"label":"other plausible guess","confidence":0.0,"reason":"short visual reason"}],
  "visible_clues": ["bullet observations tied to what you see"],
  "missing_for_better_id": ["what extra photos would help"],
  "notes_for_owner": "1-3 sentences: mixed-breed friendly, practical",
  "disclaimer": "must state preliminary visual guess only"
}

confidence must be between 0 and 1.
Do not fabricate precise pedigree, breeder, DNA, or registration claims. If breed profile data is uncertain, keep it general and say it is typical for the suggested breed/type.
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
