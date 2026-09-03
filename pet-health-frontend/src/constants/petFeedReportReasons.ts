export const PET_FEED_REPORT_REASONS = [
  'stock_photo_spam',
  'wrong_category_species',
  'inaccurate_listing',
  'abusive_communication',
  'concealed_illness',
  'forged_documents',
  'confirmed_scam',
  'prohibited_wildlife',
] as const;

export type PetFeedReportReason = (typeof PET_FEED_REPORT_REASONS)[number];
