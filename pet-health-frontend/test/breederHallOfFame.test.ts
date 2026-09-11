import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hallOfFameMonthKey,
  hallOfFameScore,
  pickHallOfFameBreeders,
} from '../src/utils/breederHallOfFame.ts';
import { getComplianceScoreFromMetadata } from '../src/utils/breederComplianceScore.ts';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import vi from '../src/i18n/locales/vi.json' with { type: 'json' };

test('pickHallOfFameBreeders assigns gold silver bronze by reviews', () => {
  const entries = pickHallOfFameBreeders(
    [
      {
        id: 'bronze',
        name: 'C',
        rating: 4.5,
        reviewCount: 5,
        trustScore: 50,
        petsRehomed: 0,
      },
      {
        id: 'gold',
        name: 'A',
        rating: 5,
        reviewCount: 40,
        trustScore: 90,
        petsRehomed: 2,
      },
      {
        id: 'silver',
        name: 'B',
        rating: 4.9,
        reviewCount: 20,
        trustScore: 80,
        petsRehomed: 1,
      },
    ],
    3,
  );
  assert.deepEqual(
    entries.map((e) => [e.id, e.medal]),
    [
      ['gold', 'gold'],
      ['silver', 'silver'],
      ['bronze', 'bronze'],
    ],
  );
});

test('hall of fame month key is zero-padded', () => {
  assert.equal(hallOfFameMonthKey(new Date(2026, 8, 11)), '09');
  assert.equal(hallOfFameMonthKey(new Date(2026, 0, 5)), '01');
});

test('hallOfFameScore ranks higher reviews above trust-only farms', () => {
  const reviewed = hallOfFameScore({
    rating: 5,
    reviewCount: 10,
    trustScore: 40,
    petsRehomed: 0,
  });
  const trustOnly = hallOfFameScore({
    rating: null,
    reviewCount: 0,
    trustScore: 90,
    petsRehomed: 0,
  });
  assert.ok(reviewed > trustOnly);
});

test('hall of fame i18n exists in EN and VI', () => {
  assert.match(vi.petFeed.hall.title, /{{month}}/);
  assert.match(en.petFeed.hall.title, /{{month}}/);
  assert.equal(vi.petFeed.hall.medal.gold, 'Vàng');
  assert.equal(en.petFeed.hall.medal.gold, 'Gold');
});

test('hall of fame compliance score reads metadata and defaults to 100', () => {
  assert.equal(getComplianceScoreFromMetadata({}), 100);
  assert.equal(getComplianceScoreFromMetadata({ compliance: { score: 81 } }), 81);
});
