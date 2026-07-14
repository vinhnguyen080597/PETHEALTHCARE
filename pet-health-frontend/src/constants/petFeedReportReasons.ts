export const PET_FEED_REPORT_REASONS = [
  'scam',
  'misleading_health_claims',
  'abusive_content',
  'fake_contact',
  'unsafe_transaction',
] as const;

export type PetFeedReportReason = (typeof PET_FEED_REPORT_REASONS)[number];
