import { GoogleGenAI } from '@google/genai';

const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_VIDEO_FILE_SIZE = 10 * 1024 * 1024;
const SUPPORTED_VIDEO_MIMES = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp']);
const MAX_IMAGES_FOR_MODEL = 6;
const MODEL_CANDIDATES = ['gemini-3-flash-preview', 'gemini-1.5-flash-latest'];

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

function clampZeroToOne(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function parseJsonSafely(rawText) {
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
  return {
    diagnosis: typeof raw?.diagnosis === 'string' ? raw.diagnosis : 'Unable to assess',
    severity: ['low', 'medium', 'high'].includes(raw?.severity) ? raw.severity : 'medium',
    symptoms: Array.isArray(raw?.symptoms) ? raw.symptoms : [],
    treatment: typeof raw?.treatment === 'string' ? raw.treatment : 'Please consult a veterinarian.',
    confidence: clampZeroToOne(Number(raw?.confidence)),
    disclaimer:
      typeof raw?.disclaimer === 'string'
        ? raw.disclaimer
        : 'This AI response is not a final medical diagnosis.',
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

/** Optional diagnosis clip: max 10 MB (client should cap length ≈10s). */
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
 */
export async function analyzePetHealthImages(imageFiles, healthContextAppendix = '') {
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
You are a professional veterinary triage assistant.
Analyze the uploaded pet image(s) and return JSON only.

Required schema:
{
  "diagnosis": "short possible condition name",
  "severity": "low|medium|high",
  "symptoms": ["symptom 1", "symptom 2"],
  "treatment": "safe first-aid guidance and when to visit clinic",
  "confidence": 0.0,
  "disclaimer": "This is not a medical diagnosis..."
}

Rules:
- confidence must be a number between 0 and 1.
- If images are not of a pet or quality is too low, set diagnosis to "Unable to assess".
- Keep treatment cautious and safe.
- If multiple images are provided, synthesize findings across all views.
${healthContextAppendix}
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
      const result = await client.models.generateContent({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
        contents,
      });

      parsedResult = parseJsonSafely(result.text);
      break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!parsedResult) {
    throw lastError ?? new Error('Failed to analyze image');
  }

  return normalizeDiagnosisPayload(parsedResult);
}

/** @deprecated path — prefer analyzePetHealthImages with optional extras */
export async function analyzePetImage(file) {
  return analyzePetHealthImages([file], '');
}
