import { Router } from 'express';
import {
  getPrivateMediaBucketName,
  getPublicMediaBucketName,
  getSupabaseServiceClient,
  parseSupabaseKeyRole,
} from '../config/supabase.js';

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
  const invalid = [];
  const warnings = [];

  if (process.env.NODE_ENV === 'production' && !String(process.env.CORS_ORIGINS || '').trim()) {
    warnings.push('CORS_ORIGINS is not set; production browser API access is blocked unless ALLOW_OPEN_CORS=true.');
  }

  const serviceRole = parseSupabaseKeyRole(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && serviceRole !== 'service_role') {
    invalid.push('SUPABASE_SERVICE_ROLE_KEY');
  }

  return { missing, invalid, warnings };
}

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'pet-health-backend',
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', async (req, res) => {
  const { missing, invalid, warnings } = envStatus();
  const checks = {
    env: missing.length > 0 ? 'missing_required_values' : invalid.length > 0 ? 'invalid_required_values' : 'ok',
    supabase: 'skipped',
    storagePrivate: 'skipped',
    storagePublic: 'skipped',
  };
  const shouldDeepCheck = req.query.deep === '1' || process.env.NODE_ENV === 'production';

  if (missing.length === 0 && invalid.length === 0 && shouldDeepCheck) {
    try {
      const supabase = getSupabaseServiceClient();
      if (!supabase) {
        checks.supabase = 'client_unavailable';
      } else {
        const { error: petsError } = await supabase.from('pets').select('id').limit(1);
        const { error: analysesError } = await supabase.from('analyses').select('id').limit(1);
        const queryError = petsError || analysesError;
        checks.supabase = queryError ? 'query_failed' : 'ok';
        if (queryError) warnings.push(`Supabase readiness query failed: ${queryError.message}`);
        const { error: privateBucketError } = await supabase.storage.getBucket(getPrivateMediaBucketName());
        checks.storagePrivate = privateBucketError ? 'bucket_unavailable' : 'ok';
        if (privateBucketError) warnings.push(`Private storage bucket check failed: ${privateBucketError.message}`);
        const { error: publicBucketError } = await supabase.storage.getBucket(getPublicMediaBucketName());
        checks.storagePublic = publicBucketError ? 'bucket_unavailable' : 'ok';
        if (publicBucketError) warnings.push(`Public storage bucket check failed: ${publicBucketError.message}`);
      }
    } catch (error) {
      checks.supabase = 'query_failed';
      warnings.push(`Supabase readiness query failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  const ok =
    missing.length === 0 &&
    invalid.length === 0 &&
    !Object.values(checks).includes('client_unavailable') &&
    !Object.values(checks).includes('query_failed') &&
    !Object.values(checks).includes('bucket_unavailable');
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ready' : 'not_ready',
    service: 'pet-health-backend',
    checks,
    missing,
    invalid,
    warnings,
    timestamp: new Date().toISOString(),
  });
});

export default router;
