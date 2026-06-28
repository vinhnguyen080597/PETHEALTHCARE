import { GoogleAuth } from 'google-auth-library';

import { SignJWT, importPKCS8, decodeJwt } from 'jose';

const APPLE_PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';
const APPLE_STOREKIT_PRODUCTION = 'https://api.storekit.itunes.apple.com';
const APPLE_STOREKIT_SANDBOX = 'https://api.storekit-sandbox.itunes.apple.com';

function appleSharedSecret() {
  return String(process.env.APPLE_IAP_SHARED_SECRET || '').trim();
}

function appleBundleId() {
  return String(process.env.APPLE_IAP_BUNDLE_ID || 'com.pethealthcare.app').trim();
}

function appleApiCredentials() {
  const issuerId = String(process.env.APPLE_IAP_ISSUER_ID || '').trim();
  const keyId = String(process.env.APPLE_IAP_KEY_ID || '').trim();
  const privateKey = String(process.env.APPLE_IAP_PRIVATE_KEY || '').trim().replace(/\\n/g, '\n');
  if (!issuerId || !keyId || !privateKey) return null;
  return { issuerId, keyId, privateKey };
}

function googlePackageName() {
  return String(process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.pethealthcare.app').trim();
}

function googleServiceAccountJson() {
  const raw = String(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isIapVerificationConfigured(platform) {
  if (platform === 'ios') return Boolean(appleSharedSecret() || appleApiCredentials());
  if (platform === 'android') return Boolean(googleServiceAccountJson());
  return false;
}

async function createAppStoreConnectJwt() {
  const creds = appleApiCredentials();
  if (!creds) {
    const err = new Error('Apple App Store Connect API credentials are not configured');
    err.status = 503;
    err.code = 'IAP_NOT_CONFIGURED';
    throw err;
  }
  const key = await importPKCS8(creds.privateKey, 'ES256');
  return new SignJWT({ bid: appleBundleId() })
    .setProtectedHeader({ alg: 'ES256', kid: creds.keyId, typ: 'JWT' })
    .setIssuer(creds.issuerId)
    .setAudience('appstoreconnect-v1')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);
}

async function verifyAppleViaStoreKitApi(transactionId, productId) {
  const jwt = await createAppStoreConnectJwt();
  const bases = [APPLE_STOREKIT_PRODUCTION, APPLE_STOREKIT_SANDBOX];
  let lastError = null;

  for (const base of bases) {
    const url = `${base}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (response.status === 404) continue;
    if (!response.ok) {
      lastError = new Error(`Apple StoreKit API HTTP ${response.status}`);
      continue;
    }
    const body = await response.json();
    const signed = body?.signedTransactionInfo;
    if (!signed) {
      const err = new Error('Apple StoreKit response missing signedTransactionInfo');
      err.status = 502;
      err.code = 'IAP_APPLE_INVALID';
      throw err;
    }
    const decoded = decodeJwt(signed);
    const resolvedProductId = String(decoded.productId || '');
    if (resolvedProductId !== productId) {
      const err = new Error('Product not found in Apple transaction');
      err.status = 400;
      err.code = 'IAP_PRODUCT_MISMATCH';
      throw err;
    }
    return {
      platform: 'ios',
      productId: resolvedProductId,
      transactionId: String(decoded.transactionId || transactionId),
      purchaseToken: signed,
      environment: base.includes('sandbox') ? 'Sandbox' : 'Production',
      raw: {
        bundleId: decoded.bundleId ?? null,
        originalTransactionId: decoded.originalTransactionId ?? null,
      },
    };
  }

  const err = lastError ?? new Error('Apple transaction not found');
  err.status = 400;
  err.code = 'IAP_APPLE_INVALID';
  throw err;
}

async function postAppleReceipt(url, receiptData) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'receipt-data': receiptData,
      password: appleSharedSecret(),
      'exclude-old-transactions': true,
    }),
  });
  if (!response.ok) {
    const err = new Error(`Apple verifyReceipt HTTP ${response.status}`);
    err.status = 502;
    err.code = 'IAP_APPLE_HTTP_ERROR';
    throw err;
  }
  return response.json();
}

function pickLatestAppleTransaction(verifyResponse, productId) {
  const receipt = verifyResponse?.receipt;
  const inApp = Array.isArray(receipt?.in_app) ? receipt.in_app : [];
  const latestReceipts = Array.isArray(verifyResponse?.latest_receipt_info)
    ? verifyResponse.latest_receipt_info
    : [];
  const candidates = [...inApp, ...latestReceipts].filter((item) => item?.product_id === productId);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => Number(b.purchase_date_ms ?? 0) - Number(a.purchase_date_ms ?? 0));
  return candidates[0];
}

export async function verifyApplePurchase({ receiptData, productId, transactionId }) {
  if (transactionId && appleApiCredentials()) {
    return verifyAppleViaStoreKitApi(transactionId, productId);
  }

  if (!receiptData) {
    const err = new Error('receiptData or transactionId is required for iOS purchases');
    err.status = 400;
    err.code = 'IAP_RECEIPT_REQUIRED';
    throw err;
  }
  if (!appleSharedSecret()) {
    const err = new Error('Apple IAP verification is not configured on the server');
    err.status = 503;
    err.code = 'IAP_NOT_CONFIGURED';
    throw err;
  }

  let payload = await postAppleReceipt(APPLE_PRODUCTION_URL, receiptData);
  if (payload?.status === 21007) {
    payload = await postAppleReceipt(APPLE_SANDBOX_URL, receiptData);
  }
  if (payload?.status !== 0) {
    const err = new Error(`Apple receipt verification failed (${payload?.status ?? 'unknown'})`);
    err.status = 400;
    err.code = 'IAP_APPLE_INVALID';
    throw err;
  }

  const transaction = pickLatestAppleTransaction(payload, productId);
  if (!transaction) {
    const err = new Error('Product not found in Apple receipt');
    err.status = 400;
    err.code = 'IAP_PRODUCT_MISMATCH';
    throw err;
  }

  const resolvedTransactionId = String(transaction.transaction_id || transactionId || '');
  if (transactionId && resolvedTransactionId && transactionId !== resolvedTransactionId) {
    const err = new Error('Transaction ID does not match Apple receipt');
    err.status = 400;
    err.code = 'IAP_TRANSACTION_MISMATCH';
    throw err;
  }

  return {
    platform: 'ios',
    productId,
    transactionId: resolvedTransactionId,
    purchaseToken: null,
    environment: payload?.environment ?? null,
    raw: {
      bundleId: payload?.receipt?.bundle_id ?? null,
      originalTransactionId: transaction.original_transaction_id ?? null,
    },
  };
}

async function getGoogleAccessToken() {
  const credentials = googleServiceAccountJson();
  if (!credentials) {
    const err = new Error('Google Play IAP verification is not configured on the server');
    err.status = 503;
    err.code = 'IAP_NOT_CONFIGURED';
    throw err;
  }
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token?.token) {
    const err = new Error('Failed to obtain Google Play API access token');
    err.status = 502;
    err.code = 'IAP_GOOGLE_AUTH_FAILED';
    throw err;
  }
  return token.token;
}

async function fetchGoogleSubscription(productId, purchaseToken, accessToken) {
  const packageName = googlePackageName();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const err = new Error(`Google subscription verify HTTP ${response.status}`);
    err.status = response.status === 404 ? 400 : 502;
    err.code = response.status === 404 ? 'IAP_GOOGLE_INVALID' : 'IAP_GOOGLE_HTTP_ERROR';
    throw err;
  }
  return response.json();
}

async function fetchGoogleProduct(productId, purchaseToken, accessToken) {
  const packageName = googlePackageName();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const err = new Error(`Google product verify HTTP ${response.status}`);
    err.status = response.status === 404 ? 400 : 502;
    err.code = response.status === 404 ? 'IAP_GOOGLE_INVALID' : 'IAP_GOOGLE_HTTP_ERROR';
    throw err;
  }
  return response.json();
}

function assertGooglePurchaseState(payload, productType) {
  if (productType === 'subscription') {
    const paymentState = Number(payload?.paymentState ?? -1);
    if (![1, 2].includes(paymentState)) {
      const err = new Error('Google subscription is not active');
      err.status = 400;
      err.code = 'IAP_GOOGLE_NOT_ACTIVE';
      throw err;
    }
    return;
  }
  const purchaseState = Number(payload?.purchaseState ?? -1);
  if (purchaseState !== 0) {
    const err = new Error('Google purchase is not completed');
    err.status = 400;
    err.code = 'IAP_GOOGLE_NOT_COMPLETED';
    throw err;
  }
}

export async function verifyGooglePurchase({ productId, purchaseToken, productType }) {
  if (!purchaseToken) {
    const err = new Error('purchaseToken is required for Android purchases');
    err.status = 400;
    err.code = 'IAP_TOKEN_REQUIRED';
    throw err;
  }
  const accessToken = await getGoogleAccessToken();
  const payload =
    productType === 'subscription'
      ? await fetchGoogleSubscription(productId, purchaseToken, accessToken)
      : await fetchGoogleProduct(productId, purchaseToken, accessToken);
  assertGooglePurchaseState(payload, productType);

  return {
    platform: 'android',
    productId,
    transactionId: String(payload.orderId || purchaseToken),
    purchaseToken,
    environment: payload?.purchaseType === 0 ? 'test' : 'production',
    raw: {
      orderId: payload?.orderId ?? null,
      acknowledgementState: payload?.acknowledgementState ?? null,
    },
  };
}

export async function verifyStorePurchase({ platform, productId, productType, receiptData, purchaseToken, transactionId }) {
  if (!isIapVerificationConfigured(platform)) {
    const err = new Error(`IAP verification for ${platform} is not configured on the server`);
    err.status = 503;
    err.code = 'IAP_NOT_CONFIGURED';
    throw err;
  }
  if (platform === 'ios') {
    return verifyApplePurchase({ receiptData, productId, transactionId });
  }
  if (platform === 'android') {
    return verifyGooglePurchase({ productId, purchaseToken, productType });
  }
  const err = new Error('Unsupported IAP platform');
  err.status = 400;
  err.code = 'IAP_UNSUPPORTED_PLATFORM';
  throw err;
}

export function getIapVerificationStatus() {
  return {
    ios: isIapVerificationConfigured('ios'),
    android: isIapVerificationConfigured('android'),
  };
}
