import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const appConfig = require('../app.config.js');

function sha256(relPath: string): string {
  return createHash('sha256').update(readFileSync(path.join(root, relPath))).digest('hex');
}

test('mobile store icons use the marketplace brand avatar', () => {
  const brand = 'assets/brand/PetMarketAvatar.png';
  assert.ok(existsSync(path.join(root, brand)), 'missing PetMarketAvatar.png');
  const brandHash = sha256(brand);

  assert.equal(appConfig.expo.icon, './assets/brand/PetMarketAvatar.png');
  assert.equal(appConfig.expo.splash.image, './assets/brand/PetMarketAvatar.png');
  assert.equal(
    appConfig.expo.android.adaptiveIcon.foregroundImage,
    './assets/brand/PetMarketAvatar.png',
  );
  assert.equal(sha256('assets/icon.png'), brandHash);
  assert.equal(sha256('assets/adaptive-icon.png'), brandHash);
  assert.equal(sha256('assets/splash-icon.png'), brandHash);
});
