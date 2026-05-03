import multer from 'multer';

export function errorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Image too large. Max 5MB' });
  }

  if (err?.status && err?.message) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err?.message && typeof err.message === 'string' && /row-level security/i.test(err.message)) {
    return res.status(403).json({
      error: err.message,
      hint:
        'Pets: run the pets RLS block in pet-health-backend/context/supabase-schema.sql. ' +
        'Avatar/diagnosis images: ensure SUPABASE_SERVICE_ROLE_KEY is the service_role JWT from Supabase (not the anon key), ' +
        'or run the storage.objects policies in the same file so uploads can use your Bearer token.',
    });
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
      return res.status(400).json({ error: err.message, code: err.code });
    }
  }

  console.error(err);
  return res.status(500).json({ error: 'Unexpected server error' });
}
