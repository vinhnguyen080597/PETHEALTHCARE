import { findAuthUserByEmail } from './adminAuthUserService.js';

/** User created by signInWithOtp during sign-up but OTP not verified yet (no password / not confirmed). */
export function isPendingEmailSignUpUser(user) {
  if (!user?.id || !user.email) return false;
  if (user.email_confirmed_at || user.confirmed_at) return false;
  const identities = user.identities ?? [];
  const hasOAuthIdentity = identities.some((identity) => identity.provider !== 'email');
  if (hasOAuthIdentity) return false;
  return true;
}

export async function requestEmailSignUpOtp({ supabase, admin, authEmail, metadata }) {
  const existing = admin ? await findAuthUserByEmail(admin, authEmail) : null;
  if (existing && !isPendingEmailSignUpUser(existing)) {
    const err = new Error('This email is already registered. Please sign in instead.');
    err.status = 409;
    err.code = 'EMAIL_ALREADY_REGISTERED';
    throw err;
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: authEmail,
    options: {
      shouldCreateUser: !existing,
      data: metadata,
    },
  });
  if (error) throw error;

  return {
    otpSent: true,
    email: authEmail,
    resumed: Boolean(existing),
  };
}

export async function getPendingSignUpLoginBlockCode(admin, authEmail) {
  if (!admin) return null;
  const existing = await findAuthUserByEmail(admin, authEmail);
  if (existing && isPendingEmailSignUpUser(existing)) {
    return 'SIGNUP_OTP_PENDING';
  }
  return null;
}
