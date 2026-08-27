import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCareServicesReturnScreen,
  resolveCoreCareReturnScreen,
  resolveHealthCheckReturnScreen,
} from '../src/utils/careServicesNavigation.ts';

test('care hub back returns to home from pets list or pet profile when opened there', () => {
  assert.equal(resolveCareServicesReturnScreen('home'), 'home');
  assert.equal(resolveCareServicesReturnScreen('pet-profile'), 'pet-profile');
  assert.equal(resolveCareServicesReturnScreen('account'), 'home');
});

test('core care back remembers care hub when opened from services prompt', () => {
  assert.equal(
    resolveCoreCareReturnScreen('onboarding-health-prompt', 'pet-profile'),
    'onboarding-health-prompt',
  );
  assert.equal(
    resolveCoreCareReturnScreen('core-care', 'onboarding-health-prompt'),
    'onboarding-health-prompt',
  );
  assert.equal(resolveCoreCareReturnScreen('pet-profile', 'home'), 'pet-profile');
  assert.equal(resolveCoreCareReturnScreen('home', 'pet-profile'), 'home');
  assert.equal(
    resolveCoreCareReturnScreen('core-care', 'home', 'onboarding-health-prompt'),
    'onboarding-health-prompt',
  );
});

test('health check back returns to care hub when launched from services', () => {
  assert.equal(
    resolveHealthCheckReturnScreen('onboarding-health-prompt'),
    'onboarding-health-prompt',
  );
  assert.equal(
    resolveHealthCheckReturnScreen('home', { fromCareHub: true }),
    'onboarding-health-prompt',
  );
  assert.equal(
    resolveHealthCheckReturnScreen('pet-profile', { returnToProfile: true }),
    'pet-profile',
  );
  assert.equal(resolveHealthCheckReturnScreen('home'), 'home');
});
