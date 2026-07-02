/** Minimal types used while monetization native packages are not installed. */

export type NativeRewardedAd = {
  addAdEventListener: (event: string, handler: () => void) => () => void;
  load: () => void;
  show: () => Promise<void>;
};

export type NativeRewardedAdModule = {
  default: () => { initialize: () => Promise<unknown> };
  RewardedAd: {
    createForAdRequest: (adUnitId: string, options: Record<string, unknown>) => NativeRewardedAd;
  };
  RewardedAdEventType: {
    LOADED: string;
    EARNED_REWARD: string;
  };
  AdEventType: {
    ERROR: string;
    CLOSED: string;
  };
  TestIds: {
    REWARDED: string;
  };
};

export type NativePurchase = {
  productId: string;
  transactionId?: string | null;
  id?: string | null;
  purchaseToken?: string | null;
  purchaseTokenAndroid?: string | null;
};

export type NativePurchaseError = {
  code?: string;
  message?: string;
  productId?: string;
};

export type NativeIapModule = {
  ErrorCode: {
    UserCancelled: string;
  };
  initConnection: () => Promise<boolean>;
  purchaseUpdatedListener: (listener: (purchase: NativePurchase) => void) => { remove: () => void };
  purchaseErrorListener: (listener: (error: NativePurchaseError) => void) => { remove: () => void };
  requestPurchase: (options: {
    type: 'subs' | 'in-app';
    request: {
      apple: { sku: string };
      google: { skus: string[] };
    };
  }) => Promise<void>;
  finishTransaction: (options: { purchase: NativePurchase; isConsumable: boolean }) => Promise<void>;
  restorePurchases: () => Promise<void>;
  getAvailablePurchases: () => Promise<NativePurchase[]>;
};
