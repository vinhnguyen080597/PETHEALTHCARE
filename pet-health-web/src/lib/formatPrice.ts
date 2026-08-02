/**
 * Format marketplace prices for display.
 * Accepts raw digits ("967346"), notes with currency ("8.500.000 ₫"), or mixed text.
 */
export function formatPriceVnd(raw: string | number | null | undefined): string {
  if (raw == null) return "";
  const text = String(raw).trim();
  if (!text || text === "—" || text === "-") return "";

  // Already looks formatted with thousand separators and currency
  if (/^\d{1,3}([.,]\d{3})+(\s*)(₫|đ|vnd|vnđ)?$/i.test(text.replace(/\s/g, " "))) {
    const digits = text.replace(/[^\d]/g, "");
    if (digits) {
      const n = Number(digits);
      if (Number.isFinite(n)) {
        return `${n.toLocaleString("vi-VN")} VNĐ`;
      }
    }
  }

  const digitsOnly = text.replace(/[^\d]/g, "");
  // Pure / mostly numeric price note
  if (digitsOnly.length >= 3 && digitsOnly.length === text.replace(/[\s.,₫đVvNnĐđ]/g, "").length) {
    const n = Number(digitsOnly);
    if (Number.isFinite(n) && n > 0) {
      return `${n.toLocaleString("vi-VN")} VNĐ`;
    }
  }

  // Mixed note like "8tr" / "thương lượng" — keep original but normalize VND casing
  return text.replace(/\bVND\b/gi, "VNĐ");
}

/** Parse approximate VND integer from a price note for filtering/sorting. */
export function parsePriceVnd(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  const text = String(raw).trim().toLowerCase();
  if (!text) return null;

  const compact = text.replace(/\s/g, "");
  const trMatch = compact.match(/(\d+(?:[.,]\d+)?)\s*tr(?:iệu)?/);
  if (trMatch) {
    const base = Number(trMatch[1].replace(",", "."));
    if (Number.isFinite(base)) return Math.round(base * 1_000_000);
  }

  const digits = text.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

export function isBlankDisplayValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") {
    const t = value.trim();
    return !t || t === "—" || t === "-" || t === "N/A" || t === "n/a";
  }
  if (Array.isArray(value)) return value.length === 0;
  return false;
}
