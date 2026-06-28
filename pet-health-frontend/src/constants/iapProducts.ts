export const PREMIUM_MONTHLY_PRODUCT_ID = 'com.pethealthcare.app.premium.monthly';

export const IAP_CONSUMABLE_PRODUCT_IDS = [
  'com.pethealthcare.app.credits.starter5',
  'com.pethealthcare.app.credits.family20',
] as const;

export const IAP_SUBSCRIPTION_PRODUCT_IDS = [PREMIUM_MONTHLY_PRODUCT_ID] as const;

export const IAP_ALL_PRODUCT_IDS = [...IAP_SUBSCRIPTION_PRODUCT_IDS, ...IAP_CONSUMABLE_PRODUCT_IDS];
