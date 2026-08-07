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
