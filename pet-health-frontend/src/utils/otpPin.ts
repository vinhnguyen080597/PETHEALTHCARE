export const OTP_PIN_LENGTH = 8;
export const SIGNUP_OTP_RESEND_COOLDOWN_MS = 60_000;

export function normalizeOtpDigits(value: string, maxLength = OTP_PIN_LENGTH) {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

export function otpDigitsArray(otp: string, length = OTP_PIN_LENGTH): string[] {
  const digits = normalizeOtpDigits(otp, length);
  return Array.from({ length }, (_, index) => digits[index] ?? '');
}

/** Apply a single keystroke or multi-digit paste into the OTP string. */
export function applyOtpDigitAt(otp: string, index: number, raw: string, length = OTP_PIN_LENGTH) {
  const cleaned = raw.replace(/\D/g, '');
  if (cleaned.length > 1) {
    return normalizeOtpDigits(cleaned, length);
  }
  const digits = otpDigitsArray(otp, length);
  const safeIndex = Math.max(0, Math.min(index, length - 1));
  digits[safeIndex] = cleaned.slice(-1) || '';
  return digits.join('');
}

export function isOtpComplete(otp: string, length = OTP_PIN_LENGTH) {
  return normalizeOtpDigits(otp, length).length === length;
}

/** Mask email for OTP copy: meo0...97@gmail.com */
export function maskEmailForDisplay(email: string) {
  const trimmed = email.trim();
  const at = trimmed.indexOf('@');
  if (at <= 0) return trimmed;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (local.length <= 4) {
    return `${local.slice(0, 1)}***@${domain}`;
  }
  return `${local.slice(0, 4)}...${local.slice(-2)}@${domain}`;
}

/** Provisional display name for signup verify until complete-profile. */
export function provisionalDisplayNameFromEmail(email: string) {
  const local = email.trim().split('@')[0]?.trim() || 'Pet parent';
  return local.slice(0, 160);
}

export function resendCountdownSeconds(availableAtMs: number, nowMs = Date.now()) {
  return Math.max(0, Math.ceil((availableAtMs - nowMs) / 1000));
}
