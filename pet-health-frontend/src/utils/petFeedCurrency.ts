const USD_TO_VND = 25_400;
const LEGACY_CA_TO_VND = 1_000_000;

function normalizePriceText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function isEnglish(language: string) {
  return language.toLowerCase().startsWith('en');
}

function parseNumberToken(token: string) {
  const compact = token.replace(/\s/g, '');
  const hasComma = compact.includes(',');
  const hasDot = compact.includes('.');
  if (hasComma && hasDot) {
    const lastComma = compact.lastIndexOf(',');
    const lastDot = compact.lastIndexOf('.');
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const groupSeparator = decimalSeparator === ',' ? '.' : ',';
    return Number(compact.replaceAll(groupSeparator, '').replace(decimalSeparator, '.'));
  }
  if (hasComma || hasDot) {
    const separator = hasComma ? ',' : '.';
    const parts = compact.split(separator);
    const looksGrouped = parts.length > 1 && parts.slice(1).every((part) => part.length === 3);
    return Number(looksGrouped ? parts.join('') : compact.replace(separator, '.'));
  }
  return Number(compact);
}

/** Format a typed amount with thousand separators while the user is typing. */
export function formatPetFeedPriceInputDisplay(value: string, language: string) {
  const digits = String(value ?? '').replace(/[^\d]/g, '');
  if (!digits) return '';
  const normalized = digits.replace(/^0+(?=\d)/, '');
  const groupSeparator = isEnglish(language) ? ',' : '.';
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator);
}

/** Prefill price input from a stored price_note like "5000000 VND". */
export function petFeedPriceInputFromStored(value: string | undefined | null, language: string) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  const parsedVnd = parsePetFeedPriceToVnd(trimmed);
  if (parsedVnd == null) return trimmed;
  if (isEnglish(language)) {
    return formatPetFeedPriceInputDisplay(String(Math.round(parsedVnd / USD_TO_VND)), language);
  }
  return formatPetFeedPriceInputDisplay(String(Math.round(parsedVnd)), language);
}

export function parsePetFeedPriceToVnd(value: string): number | null {
  const normalized = normalizePriceText(value);
  if (!normalized) return null;
  const match = normalized.match(/\d[\d.,\s]*/);
  if (!match) return null;

  const amount = parseNumberToken(match[0]);
  if (!Number.isFinite(amount)) return null;

  if (/\b(usd|dollar|dollars)\b|\$/.test(normalized)) return amount * USD_TO_VND;
  if (/\b(ca|cu|trieu|million|m)\b/.test(normalized)) return amount * LEGACY_CA_TO_VND;
  if (/\b(k|nghin|ngan|thousand)\b/.test(normalized)) return amount * 1_000;
  return amount;
}

export function normalizePetFeedPriceInput(value: string, language: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const parsedVnd = parsePetFeedPriceToVnd(trimmed);
  if (parsedVnd == null) return trimmed;

  const normalized = normalizePriceText(trimmed);
  const hasExplicitCurrency = /\b(vnd|dong|usd|dollar|dollars|ca|cu|trieu|million|m|k|nghin|ngan|thousand)\b|[$₫đ]/.test(normalized);
  if (!hasExplicitCurrency) {
    const amount = parseNumberToken(normalized.match(/\d[\d.,\s]*/)?.[0] ?? '');
    if (!Number.isFinite(amount)) return trimmed;
    const vnd = isEnglish(language) ? amount * USD_TO_VND : amount;
    return `${Math.round(vnd)} VND`;
  }

  return `${Math.round(parsedVnd)} VND`;
}

export function formatPetFeedPrice(value: string, language: string) {
  const parsedVnd = parsePetFeedPriceToVnd(value);
  if (parsedVnd == null) return value.trim();
  if (isEnglish(language)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(parsedVnd / USD_TO_VND);
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(parsedVnd);
}

export function petFeedPriceInputUnit(language: string) {
  return isEnglish(language) ? 'USD' : 'VND';
}
