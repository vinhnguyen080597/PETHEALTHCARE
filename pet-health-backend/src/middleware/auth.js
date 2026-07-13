import { getSupabaseAnonClient } from '../config/supabase.js';
import { getAccountProfile, ensureAccountProfile } from '../repositories/accountRepository.js';

const AUTH_CACHE_TTL_MS = 45_000;
const AUTH_CACHE_MAX = 500;
/** @type {Map<string, { user: { id: string, email: string | null }, account: object, cachedAt: number }>} */
const authRequestCache = new Map();

function trimCache() {
  if (authRequestCache.size <= AUTH_CACHE_MAX) return;
  const overflow = authRequestCache.size - AUTH_CACHE_MAX;
  const keys = authRequestCache.keys();
  for (let i = 0; i < overflow; i += 1) {
    const key = keys.next().value;
    if (key) authRequestCache.delete(key);
  }
}

function getCachedAuth(token) {
  const entry = authRequestCache.get(token);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > AUTH_CACHE_TTL_MS) {
    authRequestCache.delete(token);
    return null;
  }
  return entry;
}

function setCachedAuth(token, user, account) {
  authRequestCache.set(token, { user, account, cachedAt: Date.now() });
  trimCache();
}

export function invalidateAuthRequestCache(token) {
  if (token) authRequestCache.delete(token);
}

export function hasValidAdminSecret(req) {
  const expected = String(process.env.ADMIN_INTERNAL_API_KEY || '').trim();
  if (!expected) return false;
  const provided = String(req.headers['x-admin-secret'] || '').trim();
  return provided.length > 0 && provided === expected;
}

async function resolveAccountForRequest(user) {
  const metadata = user.user_metadata ?? {};
  const existing = await getAccountProfile(user.id);
  if (existing) return existing;
  return ensureAccountProfile({
    userId: user.id,
    email: user.email ?? null,
    loginIdentifier: typeof metadata.login_identifier === 'string' ? metadata.login_identifier : user.email ?? '',
    displayName: typeof metadata.full_name === 'string' ? metadata.full_name : user.email ?? '',
    primaryRole: 'sen',
    metadata: {
      auth_mode: metadata.auth_mode,
    },
  });
}

export async function requireUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (!token) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }

    const cached = getCachedAuth(token);
    if (cached) {
      if (cached.account?.account_status === 'suspended') {
        return res.status(403).json({ error: 'Account is suspended', code: 'ACCOUNT_SUSPENDED' });
      }
      req.user = cached.user;
      req.account = cached.account;
      req.accessToken = token;
      return next();
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

    const account = await resolveAccountForRequest(data.user);
    if (account?.account_status === 'suspended') {
      return res.status(403).json({ error: 'Account is suspended', code: 'ACCOUNT_SUSPENDED' });
    }

    const user = {
      id: data.user.id,
      email: data.user.email ?? null,
    };
    setCachedAuth(token, user, account);

    req.user = user;
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
