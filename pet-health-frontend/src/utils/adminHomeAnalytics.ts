export type HomeRangePreset = 'today' | '7d' | '30d' | 'custom';

export type HomeRange = {
  preset: HomeRangePreset;
  days: number;
  from: Date;
  to: Date;
};

export type ProductAnalyticsDashboard = {
  windowDays: number;
  generatedAt?: string;
  kpis: {
    activeUsers: number;
    activeUsersDeltaPct: number;
    totalEvents: number;
    totalEventsDeltaPct: number;
    contactActions: number;
    contactActionsDeltaPct: number;
    conversionRate: number;
    conversionRateDeltaPct: number;
  };
  byEvent?: Record<string, number>;
  dailySeries: Array<{
    date: string;
    events: number;
    uniqueUsers: number;
    senSignals: number;
    breederSignals: number;
  }>;
  peakHours: Array<{ hour: number; count: number }>;
  funnel?: Array<{ key: string; label: string; value: number }>;
  notes?: Record<string, string>;
};

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function resolveHomeRange(
  preset: HomeRangePreset,
  customFrom?: string,
  customTo?: string,
): HomeRange {
  const to = new Date();
  if (preset === 'today') {
    const from = startOfLocalDay(to);
    return { preset, days: 1, from, to };
  }
  if (preset === 'custom' && customFrom && customTo) {
    const from = startOfLocalDay(new Date(customFrom));
    const end = new Date(customTo);
    end.setHours(23, 59, 59, 999);
    const ms = Math.max(0, end.getTime() - from.getTime());
    const days = Math.min(90, Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000))));
    return { preset, days, from, to: end };
  }
  const days = preset === '30d' ? 30 : 7;
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { preset, days, from, to };
}

export function inRange(iso: string | undefined | null, range: HomeRange): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return t >= range.from.getTime() && t <= range.to.getTime();
}

export function countCreatedInRange<T extends { created_at?: string }>(
  rows: T[],
  range: HomeRange,
): number {
  return rows.filter((row) => inRange(row.created_at, range)).length;
}

export function previousRange(range: HomeRange): HomeRange {
  const span = Math.max(1, range.to.getTime() - range.from.getTime());
  const to = new Date(range.from.getTime() - 1);
  const from = new Date(to.getTime() - span);
  return { preset: range.preset, days: range.days, from, to };
}

export function deltaPercent(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export function formatDelta(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}%`;
}

export type BreedSlice = { name: string; value: number; color?: string };

const CHART_COLORS = ['#D97706', '#059669', '#0284C7', '#B45309', '#7C3AED', '#C4B5A5'];

export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

export function breedInterestSlices(
  posts: Array<{ breed?: string; created_at?: string }>,
  range: HomeRange,
  limit = 6,
): BreedSlice[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    if (!inRange(post.created_at, range)) continue;
    const name = (post.breed || '').trim() || 'Other';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return topSlices(counts, limit);
}

export function breederSpeciesSlices(
  breeders: Array<{ primary_species?: string[] | null }>,
  limit = 6,
): BreedSlice[] {
  const counts = new Map<string, number>();
  for (const profile of breeders) {
    const species = Array.isArray(profile.primary_species) ? profile.primary_species : [];
    const unique = new Set(
      species
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .map((item) => item.charAt(0).toUpperCase() + item.slice(1).toLowerCase()),
    );
    if (unique.size === 0) {
      counts.set('Other', (counts.get('Other') ?? 0) + 1);
      continue;
    }
    for (const name of unique) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return topSlices(counts, limit);
}

function topSlices(counts: Map<string, number>, limit: number): BreedSlice[] {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const trimmed =
    sorted.length <= limit
      ? sorted
      : [
          ...sorted.slice(0, limit - 1),
          ['Other', sorted.slice(limit - 1).reduce((sum, [, n]) => sum + n, 0)] as [string, number],
        ];
  return trimmed.map(([name, value], index) => ({
    name,
    value,
    color: chartColor(index),
  }));
}

export function todayHomeRange(): HomeRange {
  return resolveHomeRange('today');
}

export function growthSeriesFromEntities(
  accounts: Array<{ created_at?: string; primary_role?: string }>,
  breeders: Array<{ created_at?: string }>,
  range: HomeRange,
): Array<{ date: string; users: number; breeders: number }> {
  const days = Math.min(90, Math.max(1, range.days));
  const start = startOfLocalDay(range.from);
  const map = new Map<string, { date: string; users: number; breeders: number }>();
  for (let i = 0; i <= days; i += 1) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    map.set(key, { date: key, users: 0, breeders: 0 });
  }
  for (const account of accounts) {
    if (!inRange(account.created_at, range)) continue;
    const key = String(account.created_at).slice(0, 10);
    const bucket = map.get(key);
    if (!bucket) continue;
    if ((account.primary_role || 'sen') !== 'admin') bucket.users += 1;
  }
  for (const profile of breeders) {
    if (!inRange(profile.created_at, range)) continue;
    const key = String(profile.created_at).slice(0, 10);
    const bucket = map.get(key);
    if (bucket) bucket.breeders += 1;
  }
  return [...map.values()];
}
