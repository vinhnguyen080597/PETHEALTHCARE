const LOG_ALL_REQUESTS = /^(1|true|yes)$/i.test(String(process.env.LOG_ALL_REQUESTS || ''));
const LOG_REQUEST_BODY = /^(1|true|yes)$/i.test(String(process.env.LOG_REQUEST_BODY || ''));
const LOG_RESPONSE_BODY = /^(1|true|yes)$/i.test(String(process.env.LOG_RESPONSE_BODY || ''));

function redactHeaders(headers = {}) {
  const out = { ...headers };
  for (const key of Object.keys(out)) {
    const lower = key.toLowerCase();
    if (lower === 'authorization' || lower === 'x-admin-secret' || lower === 'cookie') {
      out[key] = '[REDACTED]';
    }
  }
  return out;
}

function safeJson(value) {
  if (!value || typeof value !== 'object') return value;
  const clone = Array.isArray(value) ? [...value] : { ...value };
  for (const key of Object.keys(clone)) {
    const lower = key.toLowerCase();
    if (
      lower.includes('password') ||
      lower.includes('token') ||
      lower.includes('secret') ||
      lower.includes('apikey') ||
      lower.includes('api_key')
    ) {
      clone[key] = '[REDACTED]';
    }
  }
  return clone;
}

export function requestLogger(req, res, next) {
  if (!LOG_ALL_REQUESTS) return next();

  const start = Date.now();
  const reqLog = {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    headers: redactHeaders(req.headers),
    ...(LOG_REQUEST_BODY ? { body: safeJson(req.body) } : {}),
  };
  console.log('[HTTP_REQUEST]', JSON.stringify(reqLog));

  const originalJson = res.json.bind(res);
  let responseBody = null;
  res.json = (body) => {
    responseBody = body;
    return originalJson(body);
  };

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const resLog = {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
      ...(LOG_RESPONSE_BODY ? { body: safeJson(responseBody) } : {}),
    };
    console.log('[HTTP_RESPONSE]', JSON.stringify(resLog));
  });

  next();
}

