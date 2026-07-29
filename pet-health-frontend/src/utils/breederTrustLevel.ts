export type TrustLevelId = 'L0' | 'L1' | 'L2' | 'L3';

export type TrustLevelColors = {
  bg: string;
  text: string;
  dot: string;
};

export type TrustLevelSummary = {
  level: TrustLevelId;
  labelKey: string;
};

export function trustLevelFromScore(score: number): TrustLevelSummary {
  if (score >= 90) return { level: 'L3', labelKey: 'breederTrustLevel.L3' };
  if (score >= 70) return { level: 'L2', labelKey: 'breederTrustLevel.L2' };
  if (score >= 40) return { level: 'L1', labelKey: 'breederTrustLevel.L1' };
  return { level: 'L0', labelKey: 'breederTrustLevel.L0' };
}

export function levelColor(level: string): TrustLevelColors {
  if (level === 'L3') return { bg: '#D1FAE5', text: '#065F46', dot: '#059669' };
  if (level === 'L2') return { bg: '#DBEAFE', text: '#1E40AF', dot: '#1E6FE8' };
  if (level === 'L1') return { bg: '#FEF3C7', text: '#92400E', dot: '#D97706' };
  return { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' };
}

export function scoreColor(score: number): string {
  if (score >= 90) return '#059669';
  if (score >= 70) return '#1E6FE8';
  if (score >= 40) return '#D97706';
  return '#94A3B8';
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const slice = parts.slice(-2);
  return slice.map((word) => word[0] || '').join('').toUpperCase().slice(0, 2) || '?';
}

export function rankBadgeColor(rank: number): string | null {
  if (rank === 1) return '#F59E0B';
  if (rank === 2) return '#94A3B8';
  if (rank === 3) return '#CD7C3C';
  return null;
}
