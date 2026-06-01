import { getSupabaseAnonClient } from '../config/supabase.js';
import { ensureAccountProfile } from '../repositories/accountRepository.js';

export function hasValidAdminSecret(req) {
  const expected = String(process.env.ADMIN_INTERNAL_API_KEY || '').trim();
  if (!expected) return false;
  const provided = String(req.headers['x-admin-secret'] || '').trim();
  return provided.length > 0 && provided === expected;
}

export async function requireUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (!token) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }

    const supabase = getSupabaseAnonClient();
    if (!supabase) {
      return res.status(503).json({
        error: 'Supabase auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY',
      });
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.id) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const metadata = data.user.user_metadata ?? {};
    const account = await ensureAccountProfile({
      userId: data.user.id,
      email: data.user.email ?? null,
      loginIdentifier: typeof metadata.login_identifier === 'string' ? metadata.login_identifier : data.user.email ?? '',
      displayName: typeof metadata.full_name === 'string' ? metadata.full_name : data.user.email ?? '',
      primaryRole: 'sen',
      metadata: {
        auth_mode: metadata.auth_mode,
      },
    });
    if (account?.account_status === 'suspended') {
      return res.status(403).json({ error: 'Account is suspended', code: 'ACCOUNT_SUSPENDED' });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email ?? null,
    };
    req.account = account;
    req.accessToken = token;
    return next();
  } catch (_err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requireAnyRole(...roles) {
  return (req, res, next) => {
    const role = req.account?.primary_role;
    if (role && roles.includes(role)) return next();
    return res.status(403).json({ error: 'Insufficient role permission', code: 'INSUFFICIENT_ROLE' });
  };
}

export function requireAdminOrSecret(req, res, next) {
  if (hasValidAdminSecret(req)) {
    req.adminViaSecret = true;
    return next();
  }
  return requireUser(req, res, () => requireAnyRole('admin')(req, res, next));
}
