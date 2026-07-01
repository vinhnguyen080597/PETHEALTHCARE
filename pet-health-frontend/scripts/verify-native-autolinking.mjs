#!/usr/bin/env node
/**
 * Free local gate before EAS iOS builds.
 * Runs Android prebuild (works on Windows) and fails if monetization native modules are linked.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const androidDir = path.join(root, 'android');

const BANNED_PATTERNS = [
  /google-mobile-ads/i,
  /react-native-iap/i,
  /nitro-modules/i,
  /RNGoogleMobileAds/i,
  /RNIap/i,
];

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function scanDir(dir) {
  const hits = [];
  if (!fs.existsSync(dir)) return hits;

  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.gradle') continue;
        stack.push(fullPath);
        continue;
      }
      if (!/\.(gradle|kts|xml|properties|cmake|txt)$/i.test(entry.name)) continue;
      const text = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of BANNED_PATTERNS) {
        if (pattern.test(text)) {
          hits.push({ file: path.relative(root, fullPath), pattern: pattern.source });
        }
      }
    }
  }
  return hits;
}

console.log('Verifying monetization native modules are excluded from autolinking...');

if (fs.existsSync(androidDir)) {
  fs.rmSync(androidDir, { recursive: true, force: true });
}

try {
  execSync('npx expo prebuild --platform android --no-install', {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, CI: '1' },
  });
} catch (error) {
  fail(`expo prebuild failed: ${error instanceof Error ? error.message : String(error)}`);
}

const packageJsonPath = path.join(root, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.scripts.android = 'expo start --android';
packageJson.scripts.ios = 'expo start --ios';
fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

const hits = scanDir(androidDir);
if (hits.length) {
  console.error('\nBanned native module references found in generated android/:');
  for (const hit of hits) {
    console.error(`  - ${hit.file} (matched ${hit.pattern})`);
  }
  fail('Monetization packages are still autolinked. Fix react-native.config.js before EAS build.');
}

console.log('OK  Android prebuild has no AdMob / IAP / nitro-modules autolinking.');
console.log('Note: iOS uses the same react-native.config.js on EAS — this is the best free check on Windows.');
