import { Router } from 'express';
import { getSupabaseAnonClient } from '../config/supabase.js';

const router = Router();

router.post('/signup', async (req, res, next) => {
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

    const { data, error } = await supabase.auth.signUp({ email, password });
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

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
