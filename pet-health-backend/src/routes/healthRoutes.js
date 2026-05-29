import { Router } from 'express';
import { getSupabaseServiceClient, parseSupabaseKeyRole } from '../config/supabase.js';

const router = Router();

const REQUIRED_ENV = [
  'GEMINI_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'ADMIN_INTERNAL_API_KEY',
];

function envStatus() {
  const missing = REQUIRED_ENV.filter((key) => !String(process.env[key] || '').trim());
  const warnings = [];

  if (process.env.NODE_ENV === 'production' && !String(process.env.CORS_ORIGINS || '').trim()) {
    warnings.push('CORS_ORIGINS is not set; browser API access is not restricted by origin.');
  }

  const serviceRole = parseSupabaseKeyRole(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && serviceRole !== 'service_role') {
    warnings.push('SUPABASE_SERVICE_ROLE_KEY does not look like a service_role JWT.');
  }

  return { missing, warnings };
}

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'pet-health-backend',
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', async (req, res) => {
  const { missing, warnings } = envStatus();
  const checks = {
    env: missing.length === 0 ? 'ok' : 'missing_required_values',
    supabase: 'skipped',
  };

  if (missing.length === 0 && req.query.deep === '1') {
    try {
      const supabase = getSupabaseServiceClient();
      if (!supabase) {
        checks.supabase = 'client_unavailable';
      } else {
        const { error } = await supabase.from('pets').select('id').limit(1);
        checks.supabase = error ? 'query_failed' : 'ok';
        if (error) warnings.push(`Supabase readiness query failed: ${error.message}`);
      }
    } catch (error) {
      checks.supabase = 'query_failed';
      warnings.push(`Supabase readiness query failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  const ok = missing.length === 0 && !Object.values(checks).includes('client_unavailable') && !Object.values(checks).includes('query_failed');
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ready' : 'not_ready',
    service: 'pet-health-backend',
    checks,
    missing,
    warnings,
    timestamp: new Date().toISOString(),
  });
});

export default router;
