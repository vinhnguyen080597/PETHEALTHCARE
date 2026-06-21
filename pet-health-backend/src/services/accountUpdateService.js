import { getSupabaseAnonClient, getSupabaseServiceClient } from '../config/supabase.js';
import { authEmailFromIdentifier, compactText, looksLikeEmail, requireSignupEmail } from './authIdentifierService.js';
import { findAuthUserByEmail } from './adminAuthUserService.js';
import {
  updateSelfAccountLogin,
  setPendingEmailChange,
  clearPendingEmailChange,
  getPendingEmailChangeTarget,
  setPendingPasswordRecovery,
  clearPendingPasswordRecovery,
  getPendingPasswordRecoveryTarget,
} from '../repositories/accountRepository.js';

const SYNTHETIC_EMAIL_PATTERN = /^login-[a-f0-9]{32}@/i;

export function isSyntheticAuthEmail(email) {
  const value = compactText(email).toLocaleLowerCase('en-US');
  return SYNTHETIC_EMAIL_PATTERN.test(value);
}

/** Returns a real email address for password recovery, or null if the account has none yet. */
export function resolveRealEmailForAccount(account) {
  const profileEmail = compactText(account?.email).toLocaleLowerCase('en-US');
  const loginId = compactText(account?.login_identifier).toLocaleLowerCase('en-US');

  if (profileEmail && looksLikeEmail(profileEmail) && !isSyntheticAuthEmail(profileEmail)) {
    return profileEmail;
  }
  if (loginId && looksLikeEmail(loginId) && !isSyntheticAuthEmail(loginId)) {
    return loginId;
  }
  return null;
}

export function resolveAuthEmailForUser(user, account, currentEmail) {
  const fromPayload = compactText(currentEmail);
  if (fromPayload) {
    try {
      return authEmailFromIdentifier(fromPayload);
    } catch {
      // fall through to profile / JWT resolution
    }
  }

  const userEmail = compactText(user?.email).toLocaleLowerCase('en-US');
  if (userEmail) return userEmail;
  const loginId = compactText(account?.login_identifier);
  const profileEmail = compactText(account?.email);
  const identifier = loginId || profileEmail;
  if (!identifier) {
    const err = new Error('Account login identifier is missing.');
    err.status = 400;
    err.code = 'INVALID_AUTH_IDENTIFIER';
    throw err;
  }
  return authEmailFromIdentifier(identifier);
}

export async function verifyCurrentPasswordSession(authEmail, password) {
  const supabase = getSupabaseAnonClient();
  if (!supabase) {
    const err = new Error('Supabase auth is not configured.');
    err.status = 503;
    throw err;
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password: String(password),
  });
  if (error || !data.session?.access_token || !data.session?.refresh_token) {
    const err = new Error('Incorrect password.');
    err.status = 401;
    err.code = 'invalid_credentials';
    throw err;
  }
  return data.session;
}

function throwOtpVerificationError(error) {
  const code = String(error?.code ?? '').toLowerCase();
  const message = String(error?.message ?? '').toLowerCase();
  const err = new Error('Incorrect or expired OTP.');
  err.status = 400;
  if (code === 'otp_expired' || message.includes('expired')) {
    err.code = 'otp_expired';
  } else {
    err.code = 'otp_invalid';
  }
  throw err;
}

async function deleteTempAuthUserIfNeeded(admin, tempUserId, realUserId) {
  if (!tempUserId || tempUserId === realUserId) return;
  try {
    await admin.auth.admin.deleteUser(tempUserId);
  } catch {
    // Best-effort cleanup of OTP-only auth row.
  }
}

async function refreshSessionAccessToken(authEmail, password) {
  const supabase = getSupabaseAnonClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password: String(password),
  });
  if (error || !data.session?.access_token) return null;
  return data.session.access_token;
}

export async function verifyUpdateEmailRequest({ user, account, newEmail, currentEmail, currentPassword }) {
  const authEmail = resolveAuthEmailForUser(user, account, currentEmail);
  const nextEmail = requireSignupEmail(newEmail);
  const currentLogin = compactText(currentEmail).toLocaleLowerCase('en-US') || authEmail;

  if (nextEmail === authEmail || nextEmail === currentLogin) {
    const err = new Error('New email must be different from your current email.');
    err.status = 400;
    err.code = 'EMAIL_UNCHANGED';
    throw err;
  }

  await verifyCurrentPasswordSession(authEmail, currentPassword);

  const admin = getSupabaseServiceClient();
  if (admin) {
    const existing = await findAuthUserByEmail(admin, nextEmail);
    if (existing && existing.id !== user.id) {
      const err = new Error('This email is already registered.');
      err.status = 409;
      err.code = 'EMAIL_ALREADY_REGISTERED';
      throw err;
    }
  }

  // updateUser() uses the "Change Email Address" template where {{ .Token }} is often empty.
  // signInWithOtp() reuses the Confirm signup template (same as registration) so OTP is delivered reliably.
  const supabase = getSupabaseAnonClient();
  if (!supabase) {
    const err = new Error('Unable to start email verification.');
    err.status = 503;
    throw err;
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: nextEmail,
    options: {
      shouldCreateUser: true,
      data: {
        pending_email_change_for: user.id,
        pending_email_change_from: authEmail,
      },
    },
  });
  if (error) throw error;

  await setPendingEmailChange(user.id, { newEmail: nextEmail, fromEmail: authEmail });

  return { otpSent: true, email: nextEmail };
}

export async function applyUpdateEmail({ user, account, newEmail, otp, currentEmail, currentPassword }) {
  const nextEmail = requireSignupEmail(newEmail);
  const cleanOtp = String(otp ?? '').trim();
  if (!cleanOtp) {
    const err = new Error('OTP is required.');
    err.status = 400;
    err.code = 'OTP_REQUIRED';
    throw err;
  }

  const pendingTarget = getPendingEmailChangeTarget(account);
  if (!pendingTarget || pendingTarget !== nextEmail) {
    const err = new Error('Incorrect or expired OTP.');
    err.status = 400;
    err.code = 'otp_invalid';
    throw err;
  }

  const authEmail = resolveAuthEmailForUser(user, account, currentEmail);
  await verifyCurrentPasswordSession(authEmail, currentPassword);

  const supabase = getSupabaseAnonClient();
  if (!supabase) {
    const err = new Error('Unable to verify OTP.');
    err.status = 503;
    throw err;
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email: nextEmail,
    token: cleanOtp,
    type: 'email',
  });
  if (error) {
    throwOtpVerificationError(error);
  }

  const admin = getSupabaseServiceClient();
  if (!admin) {
    const err = new Error('Supabase service role is required to update email.');
    err.status = 503;
    err.code = 'SERVICE_ROLE_REQUIRED';
    throw err;
  }

  const tempUserId = data.user?.id;
  const tempMetadata = data.user?.user_metadata ?? {};
  if (tempMetadata.pending_email_change_for !== user.id) {
    await deleteTempAuthUserIfNeeded(admin, tempUserId, user.id);
    const err = new Error('Incorrect or expired OTP.');
    err.status = 400;
    err.code = 'otp_invalid';
    throw err;
  }

  await deleteTempAuthUserIfNeeded(admin, tempUserId, user.id);

  const { data: existingAuthUser, error: loadUserError } = await admin.auth.admin.getUserById(user.id);
  if (loadUserError) throw loadUserError;
  const existingMetadata = existingAuthUser?.user?.user_metadata ?? {};

  const { error: updateAuthError } = await admin.auth.admin.updateUserById(user.id, {
    email: nextEmail,
    email_confirm: true,
    user_metadata: {
      ...existingMetadata,
      login_identifier: nextEmail,
      auth_mode: 'email',
      pending_email_change_for: null,
      pending_email_change_from: null,
    },
  });
  if (updateAuthError) throw updateAuthError;

  const updatedAccount = await updateSelfAccountLogin(user.id, {
    email: nextEmail,
    loginIdentifier: nextEmail,
  });
  await clearPendingEmailChange(user.id);

  const accessToken = await refreshSessionAccessToken(nextEmail, currentPassword);

  return { account: updatedAccount, accessToken };
}

export async function verifyUpdatePasswordRequest({ user, account, currentEmail, currentPassword, newPassword }) {
  const authEmail = resolveAuthEmailForUser(user, account, currentEmail);
  const cleanPassword = String(newPassword ?? '');
  if (cleanPassword.length < 6) {
    const err = new Error('password must be at least 6 characters');
    err.status = 400;
    err.code = 'PASSWORD_TOO_SHORT';
    throw err;
  }
  await verifyCurrentPasswordSession(authEmail, currentPassword);
  return { verified: true };
}

export async function applyUpdatePassword({ user, account, currentEmail, currentPassword, newPassword }) {
  const authEmail = resolveAuthEmailForUser(user, account, currentEmail);
  const cleanPassword = String(newPassword ?? '');
  if (cleanPassword.length < 6) {
    const err = new Error('password must be at least 6 characters');
    err.status = 400;
    err.code = 'PASSWORD_TOO_SHORT';
    throw err;
  }
  await verifyCurrentPasswordSession(authEmail, currentPassword);

  const admin = getSupabaseServiceClient();
  if (!admin) {
    const err = new Error('Supabase service role is required to update password.');
    err.status = 503;
    err.code = 'SERVICE_ROLE_REQUIRED';
    throw err;
  }

  const { error } = await admin.auth.admin.updateUserById(user.id, { password: cleanPassword });
  if (error) throw error;

  const accessToken = await refreshSessionAccessToken(authEmail, cleanPassword);

  return { success: true, accessToken };
}

export async function verifyRecoverPasswordRequest({ user, account }) {
  const realEmail = resolveRealEmailForAccount(account);
  if (!realEmail) {
    const err = new Error('Please update your email before recovering your password.');
    err.status = 400;
    err.code = 'UPDATE_EMAIL_FIRST';
    throw err;
  }

  const supabase = getSupabaseAnonClient();
  if (!supabase) {
    const err = new Error('Supabase auth is not configured.');
    err.status = 503;
    throw err;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(realEmail);
  if (error) throw error;

  await setPendingPasswordRecovery(user.id, { email: realEmail });

  return { otpSent: true, email: realEmail };
}

export async function applyRecoverPassword({ user, account, otp, newPassword }) {
  const realEmail = resolveRealEmailForAccount(account);
  const pendingEmail = getPendingPasswordRecoveryTarget(account);
  const cleanOtp = String(otp ?? '').trim();
  const cleanPassword = String(newPassword ?? '');

  if (!realEmail || !pendingEmail || pendingEmail !== realEmail) {
    const err = new Error('Incorrect or expired OTP.');
    err.status = 400;
    err.code = 'otp_invalid';
    throw err;
  }
  if (!cleanOtp) {
    const err = new Error('OTP is required.');
    err.status = 400;
    err.code = 'OTP_REQUIRED';
    throw err;
  }
  if (cleanPassword.length < 6) {
    const err = new Error('password must be at least 6 characters');
    err.status = 400;
    err.code = 'PASSWORD_TOO_SHORT';
    throw err;
  }

  const supabase = getSupabaseAnonClient();
  if (!supabase) {
    const err = new Error('Unable to verify OTP.');
    err.status = 503;
    throw err;
  }

  const { error } = await supabase.auth.verifyOtp({
    email: realEmail,
    token: cleanOtp,
    type: 'recovery',
  });
  if (error) {
    throwOtpVerificationError(error);
  }

  const admin = getSupabaseServiceClient();
  if (!admin) {
    const err = new Error('Supabase service role is required to update password.');
    err.status = 503;
    err.code = 'SERVICE_ROLE_REQUIRED';
    throw err;
  }

  const { error: updateAuthError } = await admin.auth.admin.updateUserById(user.id, { password: cleanPassword });
  if (updateAuthError) throw updateAuthError;

  await clearPendingPasswordRecovery(user.id);

  const accessToken = await refreshSessionAccessToken(realEmail, cleanPassword);

  return { success: true, accessToken };
}
