import { getTransparencyTier } from './breederTransparencyScore.ts';

/** Chip copy shows the title only — no Lx prefix (parity with web). */
export function farmTrustLevelChipLabel(_level: string, levelName: string): string {
  return String(levelName || '').trim();
}

export function farmTransparencyMeaning(score: number, lang: string): string {
  const tier = getTransparencyTier(score);
  return lang.toLowerCase().startsWith('vi') ? tier.meaningVI : tier.meaningEN;
}
