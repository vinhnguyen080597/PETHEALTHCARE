import { Router } from 'express';
import { createHash } from 'node:crypto';
import { getSupabaseAnonClient, getSupabaseServiceClient } from '../config/supabase.js';

const router = Router();

function compactText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function normalizeIdentifier(value) {
  const identifier = compactText(value);
  if (identifier.length < 2 || identifier.length > 120) {
    const err = new Error('Please enter a login name or email between 2 and 120 characters.');
    err.status = 400;
    err.code = 'INVALID_AUTH_IDENTIFIER';
    throw err;
  }
  return identifier;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function authEmailFromIdentifier(identifier) {
  const normalized = normalizeIdentifier(identifier).toLocaleLowerCase('en-US');
  if (looksLikeEmail(normalized)) return normalized;
  const domain = compactText(process.env.AUTH_FREE_TEXT_DOMAIN) || 'pethealth.local';
  const digest = sha256(normalized);
  return `login-${digest.slice(0, 32)}@${domain}`;
}

function isAlreadyRegistered(error) {
  const text = [error?.message, String(error?.code ?? ''), String(error?.status ?? '')].filter(Boolean).join(' ');
  return /already|registered|exists/i.test(text);
}

router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const supabase = getSupabaseAnonClient();
    if (!supabase) {
      return res.status(503).json({
        error: 'Supabase auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY',
      });
    }

    const authEmail = authEmailFromIdentifier(email);
    const name =
      typeof displayName === 'string' && displayName.trim() ? displayName.trim() : compactText(email);
    const metadata = {
      full_name: name,
      login_identifier: compactText(email),
      auth_mode: looksLikeEmail(compactText(email)) ? 'email' : 'free_text_identifier',
    };

    const admin = getSupabaseServiceClient();
    if (admin) {
      const created = await admin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: metadata,
      });
      if (created.error && !isAlreadyRegistered(created.error)) throw created.error;

      const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
      if (error) throw error;
      return res.status(created.error ? 200 : 201).json({ data });
    }

    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
    return res.status(201).json({ data });
  } catch (err) {
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const supabase = getSupabaseAnonClient();
    if (!supabase) {
      return res.status(503).json({
        error: 'Supabase auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY',
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: authEmailFromIdentifier(email), password });
    if (error) throw error;
    return res.json({ data });
  } catch (err) {
    return next(err);
  }
});

router.post('/oauth/google', async (req, res, next) => {
  try {
    const { idToken } = req.body ?? {};
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ error: 'idToken is required' });
    }

    const supabase = getSupabaseAnonClient();
    if (!supabase) {
      return res.status(503).json({
        error: 'Supabase auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY',
      });
    }

    // Do not pass `nonce` here: expo-auth-session adds a nonce to the Google request, but Google's
    // id_token nonce claim does not match what Supabase hashes for comparison → "Nonces mismatch".
    // With Supabase Dashboard → Auth → Google → "Skip nonce checks" ON, GoTrue accepts this token.
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) throw error;
    return res.json({ data });
  } catch (err) {
    return next(err);
  }
});

router.post('/oauth/apple', async (req, res, next) => {
  try {
    const { idToken, nonce } = req.body ?? {};
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ error: 'idToken is required' });
    }

    const supabase = getSupabaseAnonClient();
    if (!supabase) {
      return res.status(503).json({
        error: 'Supabase auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY',
      });
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: idToken,
      ...(typeof nonce === 'string' && nonce.length > 0 ? { nonce } : {}),
    });
    if (error) throw error;
    return res.json({ data });
  } catch (err) {
    return next(err);
  }
});

export default router;
