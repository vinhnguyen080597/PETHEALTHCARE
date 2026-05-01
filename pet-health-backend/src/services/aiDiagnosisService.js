import { GoogleGenAI } from '@google/genai';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const SUPPORTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
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

  if (!SUPPORTED_MIME_TYPES.has(file.mimetype)) {
    const err = new Error('Unsupported file type. Use jpeg, png, or webp');
    err.status = 400;
    throw err;
  }

  if (file.size > MAX_FILE_SIZE) {
    const err = new Error('Image too large. Max 5MB');
    err.status = 400;
    throw err;
  }
}

export async function analyzePetImage(file) {
  validateImageFile(file);

  const prompt = `
You are a professional veterinary triage assistant.
Analyze the uploaded pet image and return JSON only.

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
- If the image is not a pet or quality is too low, set diagnosis to "Unable to assess".
- Keep treatment cautious and safe.
`;

  const imagePart = {
    inlineData: {
      data: file.buffer.toString('base64'),
      mimeType: file.mimetype,
    },
  };

  const client = getAiClient();
  let parsedResult = null;
  let lastError = null;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const result = await client.models.generateContent({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
        contents: [prompt, imagePart],
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
