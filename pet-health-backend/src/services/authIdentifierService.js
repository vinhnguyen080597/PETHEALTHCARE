import { createHash } from 'node:crypto';

export function compactText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

export function normalizeIdentifier(value) {
  const identifier = compactText(value);
  if (identifier.length < 2 || identifier.length > 120) {
    const err = new Error('Please enter a login name or email between 2 and 120 characters.');
    err.status = 400;
    err.code = 'INVALID_AUTH_IDENTIFIER';
    throw err;
  }
  return identifier;
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Self-service signup sends OTP by email; free-text login names are not supported here. */
export function requireSignupEmail(identifier) {
  const value = compactText(identifier).toLocaleLowerCase('en-US');
  if (!looksLikeEmail(value)) {
    const err = new Error('Please enter a valid email address.');
    err.status = 400;
    err.code = 'INVALID_EMAIL_FORMAT';
    throw err;
  }
  return value;
}

export function authEmailFromIdentifier(identifier) {
  const normalized = normalizeIdentifier(identifier).toLocaleLowerCase('en-US');
  if (looksLikeEmail(normalized)) return normalized;
  const domain = compactText(process.env.AUTH_FREE_TEXT_DOMAIN) || 'pethealth.local';
  const digest = sha256(normalized);
  return `login-${digest.slice(0, 32)}@${domain}`;
}
