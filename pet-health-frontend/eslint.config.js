const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'web-build/**',
      'android/**',
      'ios/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  {
    rules: {
      // Primary guard: JSX component used without import.
      'react/jsx-no-undef': 'error',
      // TypeScript resolves symbols; no-undef false-positives on DOM/TS types (HeadersInit, etc.).
      'no-undef': 'off',
      // Existing screens use setState-in-effect patterns; tighten in a follow-up pass.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      // Optional native module excluded from Expo autolinking in this repo.
      'import/no-unresolved': ['error', { ignore: ['^react-native-iap$'] }],
    },
  },
  {
    files: ['test/**/*.{ts,tsx}', 'e2e/**/*.{ts,tsx}', 'scripts/**/*.{js,mjs}'],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
