import { fetchJson } from "./client";
import type { ApiAccount } from "../types";

export type AuthSessionPayload = {
  access_token?: string;
  refresh_token?: string;
  user?: { id?: string; email?: string; user_metadata?: Record<string, unknown> };
  account?: ApiAccount | null;
};

export async function loginRequest(email: string, password: string) {
  return fetchJson<{ data: AuthSessionPayload }>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function signupRequest(payload: {
  email: string;
  password: string;
  displayName?: string;
}) {
  return fetchJson<{ data: unknown }>("/auth/signup", {
    method: "POST",
    body: payload,
  });
}

export async function verifyOtpRequest(payload: {
  email: string;
  token: string;
  password?: string;
}) {
  return fetchJson<{ data: AuthSessionPayload }>("/auth/signup/verify-otp", {
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

export async function refreshRequest(refreshToken: string) {
  return fetchJson<{ data: AuthSessionPayload }>("/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
  });
}
