import { getTransparencyTier } from './breederTransparencyScore.ts';

/** Web-aligned chip copy: `L3 • Trại tiềm năng`. */
export function farmTrustLevelChipLabel(level: string, levelName: string): string {
  const safeLevel = String(level || '').trim();
  const safeName = String(levelName || '').trim();
  if (!safeLevel) return safeName;
  if (!safeName) return safeLevel;
  return `${safeLevel} • ${safeName}`;
}

export function farmTransparencyMeaning(score: number, lang: string): string {
  const tier = getTransparencyTier(score);
  return lang.toLowerCase().startsWith('vi') ? tier.meaningVI : tier.meaningEN;
}
