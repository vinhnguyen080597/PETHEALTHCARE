import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTransparencyScore } from '../src/utils/breederTransparencyScore.ts';
import {
  formatTransparencyBreakdownPoints,
  transparencyBreakdownLabel,
  visibleTransparencyBreakdownLines,
} from '../src/utils/transparencyBreakdownDisplay.ts';

test('transparency breakdown labels cover profile checklist only', () => {
  assert.equal(transparencyBreakdownLabel('VI', 'businessLicense'), 'Giấy phép kinh doanh');
  assert.equal(transparencyBreakdownLabel('EN', 'facilityVideo'), 'Facility video');
  assert.equal(transparencyBreakdownLabel('VI', 'completions'), 'completions');
});

test('profile breakdown lines show fixed point ranges', () => {
  const { lines } = computeTransparencyScore({
    isVerified: true,
    approvedBusinessLicense: true,
  });
  const license = lines.find((line) => line.key === 'businessLicense');
  assert.ok(license);
  assert.equal(formatTransparencyBreakdownPoints(license!, 'VI'), '+30 / 30đ');
  assert.equal(
    lines.some((line) => line.key === 'completions' || line.key === 'reviews'),
    false,
  );
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
