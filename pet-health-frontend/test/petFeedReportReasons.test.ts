import test from 'node:test';
import assert from 'node:assert/strict';
import { PET_FEED_REPORT_REASONS } from '../src/constants/petFeedReportReasons.ts';

test('pet feed report reasons stay stable for Phase 0 shared ReportModal', () => {
  assert.deepEqual([...PET_FEED_REPORT_REASONS], [
    'scam',
    'misleading_health_claims',
    'abusive_content',
    'fake_contact',
    'unsafe_transaction',
  ]);
});
