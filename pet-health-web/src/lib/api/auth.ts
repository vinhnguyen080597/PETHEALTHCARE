import { fetchJson } from "./client";
import type { ApiAccount } from "../types";

export type AuthSessionPayload = {
  access_token?: string;
  refresh_token?: string;
  session?: { access_token?: string; refresh_token?: string };
  user?: { id?: string; email?: string; user_metadata?: Record<string, unknown> };
  account?: ApiAccount | null;
  success?: boolean;
};

export async function loginRequest(email: string, password: string) {
  return fetchJson<{ data: AuthSessionPayload }>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

/** Step 1: request signup OTP (email + password only — matches mobile). */
export async function signupRequest(payload: { email: string; password: string }) {
  return fetchJson<{ data: unknown }>("/auth/signup", {
    method: "POST",
    body: payload,
  });
}

/** Step 2: verify OTP + set display name (required by backend). */
export async function verifyOtpRequest(payload: {
  email: string;
  otp: string;
  password: string;
  displayName: string;
}) {
  return fetchJson<{ data: AuthSessionPayload }>("/auth/signup/verify-otp", {
    method: "POST",
    body: payload,
  });
}

export async function forgotPasswordRequest(email: string) {
  return fetchJson<{ data: { sent?: boolean; email?: string } }>("/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export async function applyForgotPasswordRequest(payload: {
  email: string;
  otp: string;
  newPassword: string;
}) {
  return fetchJson<{ data: AuthSessionPayload }>("/auth/forgot-password/apply", {
    method: "POST",
    body: payload,
  });
}

export async function meRequest(token: string) {
  return fetchJson<{ data?: ApiAccount } | ApiAccount>("/auth/me", {
    token,
    cache: "no-store",
  });
}

/** Hard-delete account via backend DELETE /auth/me (same as mobile). */
export async function deleteMyAccount(token: string) {
  await fetchJson<null>("/auth/me", {
    method: "DELETE",
    token,
  });
}

export async function refreshRequest(refreshToken: string) {
  return fetchJson<{ data: AuthSessionPayload }>("/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
  });
}
