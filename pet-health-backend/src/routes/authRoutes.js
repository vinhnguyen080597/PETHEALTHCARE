import { Router } from 'express';
import { getSupabaseAnonClient, getSupabaseServiceClient } from '../config/supabase.js';
import { ensureAccountProfile } from '../repositories/accountRepository.js';
import { authEmailFromIdentifier, compactText, looksLikeEmail } from '../services/authIdentifierService.js';
import { requireUser } from '../middleware/auth.js';

const router = Router();

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
      primary_role: 'sen',
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
      const account = data.user?.id
        ? await ensureAccountProfile({
            userId: data.user.id,
            email: data.user.email,
            loginIdentifier: metadata.login_identifier,
            displayName: name,
            primaryRole: metadata.primary_role,
            metadata: { auth_mode: metadata.auth_mode },
          })
        : null;
      return res.status(created.error ? 200 : 201).json({ data: { ...data, account } });
    }

    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
    const account = data.user?.id
      ? await ensureAccountProfile({
          userId: data.user.id,
          email: data.user.email,
          loginIdentifier: metadata.login_identifier,
          displayName: name,
          primaryRole: metadata.primary_role,
          metadata: { auth_mode: metadata.auth_mode },
        })
      : null;
    return res.status(201).json({ data: { ...data, account } });
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
    const metadata = data.user?.user_metadata ?? {};
    const account = data.user?.id
      ? await ensureAccountProfile({
          userId: data.user.id,
          email: data.user.email,
          loginIdentifier: typeof metadata.login_identifier === 'string' ? metadata.login_identifier : compactText(email),
          displayName: typeof metadata.full_name === 'string' ? metadata.full_name : compactText(email),
          primaryRole: 'sen',
          metadata: { auth_mode: metadata.auth_mode },
        })
      : null;
    return res.json({ data: { ...data, account } });
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
    const metadata = data.user?.user_metadata ?? {};
    const account = data.user?.id
      ? await ensureAccountProfile({
          userId: data.user.id,
          email: data.user.email,
          loginIdentifier: data.user.email ?? '',
          displayName: typeof metadata.full_name === 'string' ? metadata.full_name : data.user.email ?? '',
          primaryRole: 'sen',
          metadata: { auth_mode: 'google' },
        })
      : null;
    return res.json({ data: { ...data, account } });
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
    const metadata = data.user?.user_metadata ?? {};
    const account = data.user?.id
      ? await ensureAccountProfile({
          userId: data.user.id,
          email: data.user.email,
          loginIdentifier: data.user.email ?? '',
          displayName: typeof metadata.full_name === 'string' ? metadata.full_name : data.user.email ?? '',
          primaryRole: 'sen',
          metadata: { auth_mode: 'apple' },
        })
      : null;
    return res.json({ data: { ...data, account } });
  } catch (err) {
    return next(err);
  }
});

router.get('/me', requireUser, async (req, res) => {
  return res.json({ data: req.account });
});

export default router;
