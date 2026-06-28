import assert from 'node:assert/strict';
import test from 'node:test';
import { getIapProduct, listIapCatalog } from '../src/config/iapCatalog.js';

test('iap catalog includes premium monthly subscription', () => {
  const product = getIapProduct('com.pethealthcare.app.premium.monthly');
  assert.ok(product);
  assert.equal(product.type, 'subscription');
  assert.equal(product.monthlyCredits, 60);
});

test('iap catalog lists consumable packs', () => {
  const products = listIapCatalog();
  const starter = products.find((item) => item.productId === 'com.pethealthcare.app.credits.starter5');
  assert.ok(starter);
  assert.equal(starter.credits, 5);
});
