import test from 'node:test';
import assert from 'node:assert/strict';
import { PET_FEED_REPORT_REASONS } from '../src/constants/petFeedReportReasons.ts';

test('pet feed report reasons stay stable for Phase 0 shared ReportModal', () => {
  assert.deepEqual([...PET_FEED_REPORT_REASONS], [
    'stock_photo_spam',
    'wrong_category_species',
    'inaccurate_listing',
    'abusive_communication',
    'concealed_illness',
    'forged_documents',
    'confirmed_scam',
    'prohibited_wildlife',
  ]);
});
