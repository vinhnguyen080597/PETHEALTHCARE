import multer from 'multer';
import { notifySystemError } from '../services/errorNotifierService.js';

function detectAiProviderError(err) {
  const text = String(err?.message || '');
  if (/RESOURCE_EXHAUSTED|quota exceeded|rate[-_ ]limit/i.test(text)) {
    return {
      status: 503,
      code: 'AI_QUOTA_EXCEEDED',
      message: 'Service is currently busy. Please try again shortly.',
      notify: true,
    };
  }
  if (/models\/|not found.*generatecontent|NOT_FOUND/i.test(text)) {
    return {
      status: 503,
      code: 'AI_MODEL_UNAVAILABLE',
      message: 'AI service is temporarily unavailable. Please try again shortly.',
      notify: true,
    };
  }
  return null;
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Image too large. Max 5MB', code: 'MEDIA_TOO_LARGE' });
  }

  const aiMapped = detectAiProviderError(err);
  if (aiMapped) {
    if (aiMapped.notify) {
      void notifySystemError({ req, err, code: aiMapped.code, status: aiMapped.status });
    }
    return res.status(aiMapped.status).json({ error: aiMapped.message, code: aiMapped.code });
  }

  if (err?.status && err?.message) {
    const safe4xx = err.status >= 400 && err.status < 500;
    if (safe4xx) {
      return res.status(err.status).json({ error: err.message, ...(err.code ? { code: err.code } : {}) });
    }
    void notifySystemError({ req, err, code: err.code || 'INTERNAL_ERROR', status: err.status });
    return res.status(500).json({ error: 'A system error occurred. Please try again shortly.', code: 'INTERNAL_ERROR' });
  }

  if (err?.message && typeof err.message === 'string' && /row-level security/i.test(err.message)) {
    void notifySystemError({ req, err, code: 'SUPABASE_RLS_ERROR', status: 500 });
    return res.status(500).json({ error: 'A system error occurred. Please try again shortly.', code: 'INTERNAL_ERROR' });
  }

  // PostgREST / Postgres errors from @supabase/supabase-js (e.g. missing column, constraints)
  if (err?.message && typeof err.message === 'string') {
    const c = String(err.code ?? '');
    if (
      c.startsWith('PGRST') ||
      /^42\d{3}$/.test(c) ||
      /^22\d{3}$/.test(c) ||
      /^23\d{3}$/.test(c)
    ) {
      return res.status(400).json({ error: 'Invalid input. Please check and try again.', code: 'INVALID_INPUT' });
    }
  }

  console.error(err);
  void notifySystemError({ req, err, code: 'INTERNAL_ERROR', status: 500 });
  return res.status(500).json({ error: 'A system error occurred. Please try again shortly.', code: 'INTERNAL_ERROR' });
}
