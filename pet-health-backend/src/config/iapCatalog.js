/** @typedef {'subscription' | 'consumable'} IapProductType */

/** @type {Record<string, { type: IapProductType, credits?: number, monthlyCredits?: number, planTier?: string, label: string }>} */
export const IAP_PRODUCT_CATALOG = {
  'com.pethealthcare.app.premium.monthly': {
    type: 'subscription',
    monthlyCredits: 60,
    planTier: 'premium',
    label: 'Premium monthly',
  },
  'com.pethealthcare.app.credits.starter5': {
    type: 'consumable',
    credits: 5,
    label: 'Starter pack',
  },
  'com.pethealthcare.app.credits.family20': {
    type: 'consumable',
    credits: 20,
    label: 'Family pack',
  },
};

export const IAP_SUBSCRIPTION_PRODUCT_IDS = Object.entries(IAP_PRODUCT_CATALOG)
  .filter(([, product]) => product.type === 'subscription')
  .map(([productId]) => productId);

export const IAP_CONSUMABLE_PRODUCT_IDS = Object.entries(IAP_PRODUCT_CATALOG)
  .filter(([, product]) => product.type === 'consumable')
  .map(([productId]) => productId);

export function getIapProduct(productId) {
  return IAP_PRODUCT_CATALOG[productId] ?? null;
}

export function listIapCatalog() {
  return Object.entries(IAP_PRODUCT_CATALOG).map(([productId, product]) => ({
    productId,
    ...product,
  }));
}
