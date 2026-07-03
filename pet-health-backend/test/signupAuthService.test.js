import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPendingSignUpLoginBlockCode,
  isPendingEmailSignUpUser,
  requestEmailSignUpOtp,
} from '../src/services/signupAuthService.js';

test('isPendingEmailSignUpUser detects unverified email-only auth user', () => {
  assert.equal(
    isPendingEmailSignUpUser({
      id: 'u1',
      email: 'test@example.com',
      email_confirmed_at: null,
      identities: [{ provider: 'email' }],
    }),
    true,
  );
});

test('isPendingEmailSignUpUser rejects confirmed email user', () => {
  assert.equal(
    isPendingEmailSignUpUser({
      id: 'u1',
      email: 'test@example.com',
      email_confirmed_at: '2026-01-01T00:00:00Z',
      identities: [{ provider: 'email' }],
    }),
    false,
  );
});

test('isPendingEmailSignUpUser rejects oauth-linked user', () => {
  assert.equal(
    isPendingEmailSignUpUser({
      id: 'u1',
      email: 'test@example.com',
      email_confirmed_at: null,
      identities: [{ provider: 'google' }],
    }),
    false,
  );
});

test('requestEmailSignUpOtp resumes pending signup instead of 409', async () => {
  let otpOptions;
  const authEmail = 'pending@example.com';
  const result = await requestEmailSignUpOtp({
    supabase: {
      auth: {
        signInWithOtp: async ({ email, options }) => {
          assert.equal(email, authEmail);
          otpOptions = options;
          return { error: null };
        },
      },
    },
    admin: {
      auth: {
        admin: {
          listUsers: async () => ({
            data: {
              users: [
                {
                  id: 'pending-user',
                  email: authEmail,
                  email_confirmed_at: null,
                  identities: [{ provider: 'email' }],
                },
              ],
            },
            error: null,
          }),
        },
      },
    },
    authEmail,
    metadata: { auth_mode: 'email' },
  });

  assert.equal(result.resumed, true);
  assert.equal(otpOptions.shouldCreateUser, false);
});

test('requestEmailSignUpOtp rejects confirmed existing user', async () => {
  await assert.rejects(
    () =>
      requestEmailSignUpOtp({
        supabase: { auth: { signInWithOtp: async () => ({ error: null }) } },
        admin: {
          auth: {
            admin: {
              listUsers: async () => ({
                data: {
                  users: [
                    {
                      id: 'active-user',
                      email: 'active@example.com',
                      email_confirmed_at: '2026-01-01T00:00:00Z',
                      identities: [{ provider: 'email' }],
                    },
                  ],
                },
                error: null,
              }),
            },
          },
        },
        authEmail: 'active@example.com',
        metadata: {},
      }),
    (error) => error.code === 'EMAIL_ALREADY_REGISTERED',
  );
});

test('getPendingSignUpLoginBlockCode flags pending signup user', async () => {
  const code = await getPendingSignUpLoginBlockCode(
    {
      auth: {
        admin: {
          listUsers: async () => ({
            data: {
              users: [
                {
                  id: 'pending-user',
                  email: 'pending@example.com',
                  email_confirmed_at: null,
                  identities: [{ provider: 'email' }],
                },
              ],
            },
            error: null,
          }),
        },
      },
    },
    'pending@example.com',
  );
  assert.equal(code, 'SIGNUP_OTP_PENDING');
});
