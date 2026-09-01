import type { Lang } from "./types";
import { t, type EnKey } from "../i18n/index";
import {
  fillSeconds,
  parseRetryAfterSeconds,
  SIGNUP_OTP_LENGTH,
  isValidEmail,
  fillEmail,
} from "./authErrorParsers";

export {
  SIGNUP_OTP_LENGTH,
  isValidEmail,
  fillSeconds,
  fillEmail,
  parseRetryAfterSeconds,
};

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
  if (code === "BACKEND_UNAVAILABLE" || code === "UPSTREAM_TIMEOUT") {
    return t(lang, "auth.forgot.backendUnavailable");
  }
  if (code === "SERVICE_ROLE_REQUIRED") {
    return t(lang, "auth.forgot.serviceUnavailable");
  }
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
