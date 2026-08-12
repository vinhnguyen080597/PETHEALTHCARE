export type TrustLevelId = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

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
  if (score >= 100) return { level: 'L5', labelKey: 'breederTrustLevel.L5' };
  if (score >= 80) return { level: 'L4', labelKey: 'breederTrustLevel.L4' };
  if (score >= 50) return { level: 'L3', labelKey: 'breederTrustLevel.L3' };
  if (score >= 30) return { level: 'L2', labelKey: 'breederTrustLevel.L2' };
  if (score >= 16) return { level: 'L1', labelKey: 'breederTrustLevel.L1' };
  return { level: 'L0', labelKey: 'breederTrustLevel.L0' };
}

export function levelColor(level: string): TrustLevelColors {
  if (level === 'L5') return { bg: '#D1FAE5', text: '#065F46', dot: '#059669' };
  if (level === 'L4') return { bg: '#D1FAE5', text: '#065F46', dot: '#059669' };
  if (level === 'L3') return { bg: '#FEF3C7', text: '#92400E', dot: '#D97706' };
  if (level === 'L2') return { bg: '#FFEDD5', text: '#9A3412', dot: '#F97316' };
  if (level === 'L1') return { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' };
  return { bg: '#FEE2E2', text: '#7F1D1D', dot: '#DC2626' };
}

export function scoreColor(score: number): string {
  if (score >= 100) return '#059669';
  if (score >= 80) return '#10B981';
  if (score >= 50) return '#D97706';
  if (score >= 30) return '#F97316';
  if (score >= 16) return '#EF4444';
  return '#DC2626';
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
