import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTransparencyScore } from '../src/utils/breederTransparencyScore.ts';
import {
  formatTransparencyBreakdownPoints,
  transparencyBreakdownLabel,
  visibleTransparencyBreakdownLines,
} from '../src/utils/transparencyBreakdownDisplay.ts';

test('transparency breakdown labels use completed handoff and per-review wording', () => {
  assert.equal(transparencyBreakdownLabel('VI', 'completions'), 'Giao dịch hoàn thành');
  assert.equal(transparencyBreakdownLabel('VI', 'reviews'), 'Nhận đánh giá 5 sao');
  assert.equal(transparencyBreakdownLabel('EN', 'completions'), 'Completed handoffs');
});

test('activity breakdown lines show per-occurrence points', () => {
  const { lines } = computeTransparencyScore({ isVerified: true });
  const completions = lines.find((line) => line.key === 'completions');
  const reviews = lines.find((line) => line.key === 'reviews');
  assert.ok(completions);
  assert.ok(reviews);
  assert.equal(formatTransparencyBreakdownPoints(completions!, 'VI'), '+3/lần');
  assert.equal(formatTransparencyBreakdownPoints(reviews!, 'VI'), '+2/lần');
  assert.equal(formatTransparencyBreakdownPoints(completions!, 'EN'), '+3/each');
  assert.equal(formatTransparencyBreakdownPoints(reviews!, 'EN'), '+2/each');
});

test('penalty history row is hidden from breakdown list', () => {
  const { lines } = computeTransparencyScore({
    isVerified: true,
    penaltyPoints: 5,
  });
  const visible = visibleTransparencyBreakdownLines(lines);
  assert.equal(visible.some((line) => line.key === 'penalty'), false);
  assert.equal(visible.length, lines.length - 1);
});
