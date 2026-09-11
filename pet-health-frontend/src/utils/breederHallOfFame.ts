export type HallOfFameMedal = 'gold' | 'silver' | 'bronze';
export type HallOfFameRank = 1 | 2 | 3;

export type HallOfFameMetrics = {
  id: string;
  name: string;
  rating: number | null;
  reviewCount: number;
  trustScore: number;
  petsRehomed: number;
};

export type HallOfFamePicked<T extends HallOfFameMetrics> = T & {
  rank: HallOfFameRank;
  medal: HallOfFameMedal;
};

const MEDALS: HallOfFameMedal[] = ['gold', 'silver', 'bronze'];

export function hallOfFameScore(input: Pick<
  HallOfFameMetrics,
  'rating' | 'reviewCount' | 'trustScore' | 'petsRehomed'
>): number {
  const rating = Number(input.rating) || 0;
  const reviews = Math.max(0, Math.floor(Number(input.reviewCount) || 0));
  const trust = Math.max(0, Math.min(100, Math.round(Number(input.trustScore) || 0)));
  const sold = Math.max(0, Math.floor(Number(input.petsRehomed) || 0));
  return rating * 1000 + reviews * 20 + trust * 2 + sold;
}

export function hallOfFameMonthKey(now = new Date()): string {
  return String(now.getMonth() + 1).padStart(2, '0');
}

/** Top kennels for Hall of Fame — gold / silver / bronze, matching web. */
export function pickHallOfFameBreeders<T extends HallOfFameMetrics>(
  candidates: T[],
  limit = 3,
): HallOfFamePicked<T>[] {
  return [...candidates]
    .filter((row) => (row.reviewCount || 0) > 0 || (row.trustScore || 0) >= 40)
    .sort((a, b) => {
      const d = hallOfFameScore(b) - hallOfFameScore(a);
      if (d !== 0) return d;
      return a.name.localeCompare(b.name);
    })
    .slice(0, Math.min(3, limit))
    .map((item, index) => ({
      ...item,
      rank: (index + 1) as HallOfFameRank,
      medal: MEDALS[index]!,
    }));
}
