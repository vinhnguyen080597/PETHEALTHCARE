import type { Lang } from "@/lib/types";
import { t, type EnKey } from "@/i18n";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const SIGNUP_OTP_LENGTH = 8;

export function isValidEmail(value: string) {
  return EMAIL_RE.test(value.trim());
}

export function fillSeconds(template: string, seconds: number) {
  return template.replace(/\{\{\s*seconds\s*\}\}/g, String(seconds));
}

export function fillEmail(template: string, email: string) {
  return template.replace(/\{\{\s*email\s*\}\}/g, email);
}

export function parseRetryAfterSeconds(payload: {
  code?: string;
  error?: string;
  message?: string;
  retry_after?: number;
  retryAfter?: number;
}): number {
  const fromField = Number(payload.retry_after ?? payload.retryAfter);
  if (Number.isFinite(fromField) && fromField > 0) return Math.ceil(fromField);
  const text = `${payload.error || ""} ${payload.message || ""}`;
  const match = text.match(/(\d+)\s*second/i);
  if (match) return Number(match[1]);
  return 60;
}

export function resolveAuthError(
  lang: Lang,
  isSignUp: boolean,
  data: { error?: string; code?: string; message?: string },
  status?: number,
): string {
  const code = data.code || "";
  if (!isSignUp) {
    if (status === 503) return t(lang, "auth.errors.signInFailed");
    if (code === "SIGNUP_OTP_PENDING") return t(lang, "auth.errors.signupOtpPending");
    return t(lang, "auth.errors.invalidCredentials");
  }
  if (code === "over_email_send_rate_limit") {
    return fillSeconds(
      t(lang, "auth.errors.signUpRateLimit"),
      parseRetryAfterSeconds(data),
    );
  }
  if (code === "EMAIL_ALREADY_REGISTERED") {
    return t(lang, "auth.errors.emailAlreadyRegistered");
  }
  if (code === "INVALID_EMAIL_FORMAT" || code === "INVALID_AUTH_IDENTIFIER") {
    return t(lang, "auth.errors.invalidEmailFormat");
  }
  if (code === "weak_password" || code === "PASSWORD_TOO_SHORT") {
    return t(lang, "auth.errors.weakPassword");
  }
  if (data.error || data.message) return String(data.error || data.message);
  return isSignUp
    ? t(lang, "auth.errors.signUpFailed")
    : t(lang, "auth.errors.invalidCredentials");
}

export function resolveOtpError(
  lang: Lang,
  data: { error?: string; code?: string; message?: string },
): string {
  const code = data.code || "";
  if (code === "otp_expired" || code === "OTP_EXPIRED") {
    return t(lang, "auth.otpErrors.expired");
  }
  if (code === "otp_invalid" || code === "OTP_INVALID" || code === "invalid_otp") {
    return t(lang, "auth.otpErrors.invalid");
  }
  if (code === "over_email_send_rate_limit") {
    return fillSeconds(
      t(lang, "auth.otpErrors.rateLimit"),
      parseRetryAfterSeconds(data),
    );
  }
  if (code === "DISPLAY_NAME_REQUIRED") {
    return t(lang, "auth.field.displayNameRequired");
  }
  if (data.error || data.message) return String(data.error || data.message);
  return t(lang, "auth.otpErrors.generic");
}

export function resolveForgotError(
  lang: Lang,
  data: { error?: string; code?: string; message?: string },
): string {
  const code = data.code || "";
  if (code === "over_email_send_rate_limit") {
    return fillSeconds(
      t(lang, "auth.forgot.rateLimit"),
      parseRetryAfterSeconds(data),
    );
  }
  if (code === "PASSWORD_TOO_SHORT" || code === "weak_password") {
    return t(lang, "auth.field.passwordTooShort");
  }
  if (data.error || data.message) return String(data.error || data.message);
  return t(lang, "auth.forgot.sendFailed");
}

/** Tiny helper so AuthScreen can keep keys typed. */
export function authT(lang: Lang, key: EnKey) {
  return t(lang, key);
}
