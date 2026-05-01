import multer from 'multer';

export function errorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Image too large. Max 5MB' });
  }

  if (err?.status && err?.message) {
    return res.status(err.status).json({ error: err.message });
  }

  console.error(err);
  return res.status(500).json({ error: 'Unexpected server error' });
}
