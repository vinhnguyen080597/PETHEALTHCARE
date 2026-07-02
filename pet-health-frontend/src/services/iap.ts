import { Platform } from 'react-native';
import { PREMIUM_MONTHLY_PRODUCT_ID } from '../constants/iapProducts';
import { RELEASE_MONETIZATION_ENABLED } from '../constants/releaseMonetization';
import type { NativeIapModule, NativePurchase, NativePurchaseError } from '../types/monetizationNative';
import { debugCheck, debugLog } from '../utils/debugLog';
import { isExpoGo } from '../utils/expoRuntime';

export type IapPurchasePayload = {
  platform: 'ios' | 'android';
  productId: string;
  transactionId: string;
  purchaseToken: string | null;
  receiptData: string | null;
};

type IapModule = NativeIapModule;
type Purchase = NativePurchase;
type PurchaseError = NativePurchaseError;

let initPromise: Promise<boolean> | null = null;
let listenersAttached = false;
let iapModule: IapModule | null = null;
let iapModulePromise: Promise<IapModule | null> | null = null;
let pendingPurchase:
  | {
      productId: string;
      resolve: (purchase: Purchase) => void;
      reject: (error: Error) => void;
    }
  | null = null;

function platformName(): 'ios' | 'android' | null {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return null;
}

export function isIapSupported(): boolean {
  if (!RELEASE_MONETIZATION_ENABLED) return false;
  if (isExpoGo()) return false;
  return platformName() != null;
}

async function loadIapModule(): Promise<IapModule | null> {
  debugLog('STARTUP', 'iap.loadIapModule.enter');
  if (!isIapSupported()) {
    debugLog('STARTUP', 'iap.loadIapModule.exit', { skipped: true });
    return null;
  }
  if (iapModule) return iapModule;
  if (!iapModulePromise) {
    iapModulePromise = import('react-native-iap')
      .then((module) => {
        iapModule = module;
        debugCheck('STARTUP', 'iap.loadIapModule', true, { platform: Platform.OS });
        return module;
      })
      .catch((error) => {
        debugCheck('STARTUP', 'iap.loadIapModule', false, {
          message: error instanceof Error ? error.message : String(error),
        });
        return null;
      });
  }
  return iapModulePromise;
}

function isUserCancelled(error: PurchaseError, ErrorCode: IapModule['ErrorCode']): boolean {
  return error.code === ErrorCode.UserCancelled;
}

async function attachPurchaseListeners(iap: IapModule) {
  if (listenersAttached) return;
  listenersAttached = true;

  iap.purchaseUpdatedListener((purchase) => {
    if (!pendingPurchase) return;
    if (purchase.productId !== pendingPurchase.productId) return;
    pendingPurchase.resolve(purchase);
    pendingPurchase = null;
  });

  iap.purchaseErrorListener((error) => {
    if (!pendingPurchase) return;
    if (error.productId && error.productId !== pendingPurchase.productId) return;
    const err = new Error(error.message || 'Purchase failed');
    if (isUserCancelled(error, iap.ErrorCode)) {
      (err as Error & { userCancelled?: boolean }).userCancelled = true;
    }
    pendingPurchase.reject(err);
    pendingPurchase = null;
  });
}

export async function initializeIap(): Promise<boolean> {
  debugLog('STARTUP', 'iap.initializeIap.enter');
  if (!isIapSupported()) {
    debugLog('STARTUP', 'iap.initializeIap.exit', { ready: false, reason: 'unsupported' });
    return false;
  }
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const iap = await loadIapModule();
    if (!iap) return false;
    try {
      await attachPurchaseListeners(iap);
      await iap.initConnection();
      debugLog('STARTUP', 'iap.initializeIap.exit', { ready: true });
      return true;
    } catch (error) {
      debugCheck('STARTUP', 'iap.initializeIap', false, {
        message: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  })();

  return initPromise;
}

export function purchasePayloadFromStore(purchase: Purchase): IapPurchasePayload {
  const platform = platformName();
  if (!platform) {
    throw new Error('IAP is not supported on this platform');
  }

  const transactionId = String(purchase.transactionId || purchase.id || '');
  const purchaseToken =
    purchase.purchaseToken ??
    ('purchaseTokenAndroid' in purchase ? purchase.purchaseTokenAndroid : null) ??
    null;

  return {
    platform,
    productId: purchase.productId,
    transactionId,
    purchaseToken: purchaseToken ? String(purchaseToken) : null,
    receiptData: purchaseToken ? String(purchaseToken) : null,
  };
}

async function waitForPurchase(iap: IapModule, productId: string, productType: 'subs' | 'in-app'): Promise<Purchase> {
  return new Promise<Purchase>((resolve, reject) => {
    pendingPurchase = { productId, resolve, reject };

    void iap
      .requestPurchase({
        type: productType,
        request: {
          apple: { sku: productId },
          google: { skus: [productId] },
        },
      })
      .catch((error: unknown) => {
        if (pendingPurchase?.productId === productId) {
          pendingPurchase = null;
          reject(error instanceof Error ? error : new Error('Purchase failed'));
        }
      });
  });
}

export async function purchasePremiumSubscription(
  verifyFn: (payload: IapPurchasePayload) => Promise<void>,
): Promise<{ ok: true } | { ok: false; cancelled?: boolean; message?: string }> {
  const ready = await initializeIap();
  if (!ready) {
    return { ok: false, message: 'IAP_UNAVAILABLE' };
  }

  const iap = await loadIapModule();
  if (!iap) {
    return { ok: false, message: 'IAP_UNAVAILABLE' };
  }

  try {
    const purchase = await waitForPurchase(iap, PREMIUM_MONTHLY_PRODUCT_ID, 'subs');
    const payload = purchasePayloadFromStore(purchase);
    await verifyFn(payload);
    await iap.finishTransaction({ purchase, isConsumable: false });
    return { ok: true };
  } catch (error: unknown) {
    const err = error as Error & { userCancelled?: boolean };
    if (err.userCancelled) {
      return { ok: false, cancelled: true };
    }
    return { ok: false, message: err.message || 'Purchase failed' };
  }
}

export async function restoreIapPurchases(
  verifyFn: (payload: IapPurchasePayload) => Promise<void>,
): Promise<{ restored: number; failed: number }> {
  const ready = await initializeIap();
  if (!ready) return { restored: 0, failed: 0 };

  const iap = await loadIapModule();
  if (!iap) return { restored: 0, failed: 0 };

  await iap.restorePurchases();
  const purchases = await iap.getAvailablePurchases();
  let restored = 0;
  let failed = 0;

  for (const purchase of purchases) {
    try {
      const payload = purchasePayloadFromStore(purchase);
      await verifyFn(payload);
      const isConsumable = payload.productId.includes('.credits.');
      await iap.finishTransaction({ purchase, isConsumable });
      restored += 1;
    } catch {
      failed += 1;
    }
  }

  return { restored, failed };
}
