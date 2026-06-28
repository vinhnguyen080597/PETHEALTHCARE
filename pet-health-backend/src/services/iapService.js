import {
  activatePremiumSubscription,
  fulfillIapConsumable,
  getAiCreditSummary,
  hasProcessedIapTransaction,
} from './aiEconomicsService.js';
import { getIapProduct, listIapCatalog } from '../config/iapCatalog.js';
import { getIapVerificationStatus, verifyStorePurchase } from './iapVerifyService.js';
import { recordProductEvent } from './productAnalyticsService.js';

function normalizePlatform(platform) {
  const value = String(platform || '').trim().toLowerCase();
  if (value === 'ios' || value === 'android') return value;
  return null;
}

export function getIapPublicCatalog() {
  return {
    products: listIapCatalog(),
    verification: getIapVerificationStatus(),
  };
}

export async function verifyAndFulfillPurchase(userId, payload) {
  const platform = normalizePlatform(payload?.platform);
  const productId = String(payload?.productId || '').trim();
  const transactionIdHint = String(payload?.transactionId || '').trim() || null;
  const purchaseToken = String(payload?.purchaseToken || '').trim() || null;
  const receiptData = String(payload?.receiptData || '').trim() || null;

  if (!platform) {
    return { ok: false, status: 400, code: 'IAP_INVALID_PLATFORM', error: 'platform must be ios or android' };
  }
  const product = getIapProduct(productId);
  if (!product) {
    return { ok: false, status: 400, code: 'IAP_UNKNOWN_PRODUCT', error: 'Unknown productId' };
  }

  let verified;
  try {
    verified = await verifyStorePurchase({
      platform,
      productId,
      productType: product.type,
      receiptData,
      purchaseToken,
      transactionId: transactionIdHint,
    });
  } catch (error) {
    return {
      ok: false,
      status: error.status ?? 502,
      code: error.code ?? 'IAP_VERIFY_FAILED',
      error: error.message ?? 'Purchase verification failed',
    };
  }

  const transactionId = String(verified.transactionId || transactionIdHint || purchaseToken || '');
  if (!transactionId) {
    return { ok: false, status: 400, code: 'IAP_TRANSACTION_MISSING', error: 'Missing transaction id' };
  }

  if (await hasProcessedIapTransaction(userId, transactionId)) {
    const account = await getAiCreditSummary(userId);
    return { ok: true, alreadyProcessed: true, account, productId, transactionId };
  }

  const metadata = {
    platform,
    productId,
    transactionId,
    purchaseToken: verified.purchaseToken,
    environment: verified.environment,
    store: verified.raw ?? null,
  };

  let account;
  if (product.type === 'subscription') {
    account = await activatePremiumSubscription(userId, {
      transactionId,
      productId,
      monthlyCredits: product.monthlyCredits ?? 60,
      planTier: product.planTier ?? 'premium',
      metadata,
    });
  } else {
    account = await fulfillIapConsumable(userId, {
      transactionId,
      productId,
      credits: product.credits ?? 0,
      metadata,
    });
  }

  void recordProductEvent({
    userId,
    event: product.type === 'subscription' ? 'iap_subscription_fulfilled' : 'iap_consumable_fulfilled',
    metadata: { productId, transactionId, credits: product.credits ?? product.monthlyCredits ?? null },
  });

  return {
    ok: true,
    alreadyProcessed: false,
    account,
    productId,
    transactionId,
    productType: product.type,
    grantedCredits: product.type === 'consumable' ? product.credits : product.monthlyCredits,
  };
}

export async function restorePurchases(userId, purchases = []) {
  const results = [];
  for (const purchase of purchases) {
    const result = await verifyAndFulfillPurchase(userId, purchase);
    results.push({
      productId: purchase?.productId ?? null,
      ok: result.ok,
      alreadyProcessed: result.alreadyProcessed ?? false,
      code: result.code ?? null,
      error: result.error ?? null,
    });
  }
  const account = await getAiCreditSummary(userId);
  return { account, results };
}
