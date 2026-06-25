import { Router } from 'express';
import { getSupabaseAnonClient, getSupabaseServiceClient } from '../config/supabase.js';
import { deleteAccountData, ensureAccountProfile } from '../repositories/accountRepository.js';
import { authEmailFromIdentifier, compactText, looksLikeEmail, requireSignupEmail } from '../services/authIdentifierService.js';
import { findAuthUserByEmail } from '../services/adminAuthUserService.js';
import {
  applyUpdateEmail,
  applyUpdatePassword,
  applyPublicRecoverPassword,
  applyRecoverPassword,
  requestPublicPasswordRecovery,
  verifyRecoverPasswordRequest,
  verifyUpdateEmailRequest,
  verifyUpdatePasswordRequest,
} from '../services/accountUpdateService.js';
import { requireUser } from '../middleware/auth.js';
import { deleteUserImageStorage } from '../services/imageStorageService.js';

const router = Router();

router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters', code: 'PASSWORD_TOO_SHORT' });
    }

    const supabase = getSupabaseAnonClient();
    if (!supabase) {
      return res.status(503).json({
        error: 'Supabase auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY',
      });
    }

    const authEmail = requireSignupEmail(email);
    const name =
      typeof displayName === 'string' && displayName.trim() ? displayName.trim() : compactText(email);
    const metadata = {
      full_name: name,
      login_identifier: compactText(email),
      auth_mode: 'email',
      primary_role: 'sen',
    };

    const admin = getSupabaseServiceClient();
    if (admin) {
      const existing = await findAuthUserByEmail(admin, authEmail);
      if (existing) {
        return res.status(409).json({
          error: 'This email is already registered. Please sign in instead.',
          code: 'EMAIL_ALREADY_REGISTERED',
        });
      }
    }

    const { data, error } = await supabase.auth.signInWithOtp({
      email: authEmail,
      options: {
        shouldCreateUser: true,
        data: metadata,
      },
    });
    if (error) throw error;
    return res.status(200).json({
      data: {
        otpSent: true,
        email: authEmail,
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/signup/verify-otp', async (req, res, next) => {
  try {
    const { email, otp, password } = req.body ?? {};
    if (!email || !otp || !password) {
      return res.status(400).json({ error: 'email, otp and password are required' });
    }

    const supabase = getSupabaseAnonClient();
    if (!supabase) {
      return res.status(503).json({
        error: 'Supabase auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY',
      });
    }

    const authEmail = requireSignupEmail(email);
    const cleanPassword = String(password);
    if (cleanPassword.length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters', code: 'PASSWORD_TOO_SHORT' });
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: authEmail,
      token: String(otp).trim(),
      type: 'email',
    });
    if (error) throw error;

    const admin = getSupabaseServiceClient();
    if (!admin) {
      return res.status(503).json({
        error: 'Supabase service role is required to finalize sign up password',
        code: 'SERVICE_ROLE_REQUIRED',
      });
    }
    if (data.user?.id) {
      const { error: updatePasswordError } = await admin.auth.admin.updateUserById(data.user.id, {
        password: cleanPassword,
      });
      if (updatePasswordError) throw updatePasswordError;
    }

    // Setting password via admin API invalidates the OTP session; sign in again for a fresh JWT.
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: cleanPassword,
    });
    if (loginError) throw loginError;

    const metadata = loginData.user?.user_metadata ?? data.user?.user_metadata ?? {};
    const loginIdentifier =
      typeof metadata.login_identifier === 'string' && metadata.login_identifier.trim()
        ? metadata.login_identifier
        : compactText(email);
    const displayName =
      typeof metadata.full_name === 'string' && metadata.full_name.trim()
        ? metadata.full_name
        : compactText(email);

    const account = loginData.user?.id
      ? await ensureAccountProfile({
          userId: loginData.user.id,
          email: loginData.user.email,
          loginIdentifier,
          displayName,
          primaryRole: 'sen',
          metadata: { auth_mode: 'email_password_otp' },
        })
      : null;
    return res.json({ data: { ...loginData, account } });
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

    let authEmail;
    try {
      authEmail = authEmailFromIdentifier(email);
    } catch {
      return res.status(401).json({
        error: 'Incorrect email or password.',
        code: 'invalid_credentials',
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
    if (error) {
      return res.status(401).json({
        error: 'Incorrect email or password.',
        code: 'invalid_credentials',
      });
    }
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

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body ?? {};
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const supabase = getSupabaseAnonClient();
    if (!supabase) {
      return res.status(503).json({
        error: 'Supabase auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY',
      });
    }

    const result = await requestPublicPasswordRecovery(email);
    return res.json({ data: result });
  } catch (err) {
    return next(err);
  }
});

router.post('/forgot-password/apply', async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body ?? {};
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'email, otp and newPassword are required' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters', code: 'PASSWORD_TOO_SHORT' });
    }

    const result = await applyPublicRecoverPassword({ identifier: email, otp, newPassword });
    return res.json({ data: result });
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

router.post('/account/verify-request', requireUser, async (req, res, next) => {
  try {
    const { type, newEmail, currentEmail, currentPassword, newPassword } = req.body ?? {};
    if (!type || typeof type !== 'string') {
      return res.status(400).json({ error: 'type is required' });
    }

    switch (type) {
      case 'update_email': {
        if (!newEmail || !currentPassword) {
          return res.status(400).json({ error: 'newEmail and currentPassword are required' });
        }
        const result = await verifyUpdateEmailRequest({
          user: req.user,
          account: req.account,
          newEmail,
          currentEmail,
          currentPassword,
        });
        return res.json({ data: result });
      }
      case 'update_password': {
        if (!currentPassword || !newPassword) {
          return res.status(400).json({ error: 'currentPassword and newPassword are required' });
        }
        const result = await verifyUpdatePasswordRequest({
          user: req.user,
          account: req.account,
          currentEmail,
          currentPassword,
          newPassword,
        });
        return res.json({ data: result });
      }
      case 'recover_password': {
        const result = await verifyRecoverPasswordRequest({ user: req.user, account: req.account });
        return res.json({ data: result });
      }
      default:
        return res.status(400).json({ error: 'Unsupported verification type', code: 'INVALID_INPUT' });
    }
  } catch (err) {
    return next(err);
  }
});

router.post('/account/apply-update', requireUser, async (req, res, next) => {
  try {
    const { type, newEmail, otp, currentEmail, currentPassword, newPassword } = req.body ?? {};
    if (!type || typeof type !== 'string') {
      return res.status(400).json({ error: 'type is required' });
    }

    switch (type) {
      case 'update_email': {
        if (!newEmail || !otp || !currentPassword) {
          return res.status(400).json({ error: 'newEmail, otp and currentPassword are required' });
        }
        const result = await applyUpdateEmail({
          user: req.user,
          account: req.account,
          newEmail,
          otp,
          currentEmail,
          currentPassword,
        });
        return res.json({ data: result });
      }
      case 'update_password': {
        if (!currentPassword || !newPassword) {
          return res.status(400).json({ error: 'currentPassword and newPassword are required' });
        }
        const result = await applyUpdatePassword({
          user: req.user,
          account: req.account,
          currentEmail,
          currentPassword,
          newPassword,
        });
        return res.json({ data: result });
      }
      case 'recover_password': {
        if (!otp || !newPassword) {
          return res.status(400).json({ error: 'otp and newPassword are required' });
        }
        const result = await applyRecoverPassword({
          user: req.user,
          account: req.account,
          otp,
          newPassword,
        });
        return res.json({ data: result });
      }
      default:
        return res.status(400).json({ error: 'Unsupported update type', code: 'INVALID_INPUT' });
    }
  } catch (err) {
    return next(err);
  }
});

router.delete('/me', requireUser, async (req, res, next) => {
  try {
    const admin = getSupabaseServiceClient();
    if (!admin) {
      return res.status(503).json({
        error: 'Account deletion requires the Supabase service role client.',
        code: 'ACCOUNT_DELETION_NOT_CONFIGURED',
      });
    }

    await deleteUserImageStorage(req.user.id);
    await deleteAccountData(req.user.id);
    const { error } = await admin.auth.admin.deleteUser(req.user.id);
    if (error) throw error;

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;
