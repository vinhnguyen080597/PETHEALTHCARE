import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acquireAnalysisLock,
  checkAnalysisCooldown,
  checkUserAnalysisRateLimit,
  getAnalysisGuardConfig,
  markAnalysisCompleted,
  markUserAnalysisAttempt,
  releaseAnalysisLock,
} from '../src/services/analysisTrafficGuardService.js';

test('lock acquisition blocks concurrent request until release', () => {
  const userId = `u-${Date.now()}`;
  const petId = 'pet-1';

  const first = acquireAnalysisLock(userId, petId);
  assert.equal(first.ok, true);
  assert.ok(first.key);

  const second = acquireAnalysisLock(userId, petId);
  assert.equal(second.ok, false);
  assert.ok(second.retryAfterSeconds >= 1);

  releaseAnalysisLock(first.key);
  const third = acquireAnalysisLock(userId, petId);
  assert.equal(third.ok, true);
  releaseAnalysisLock(third.key);
});

test('cooldown activates right after completion', () => {
  const userId = `u-cool-${Date.now()}`;
  const petId = 'pet-2';
  markAnalysisCompleted(userId, petId);

  const cooldown = checkAnalysisCooldown(userId, petId);
  assert.equal(cooldown.ok, false);
  assert.ok(cooldown.retryAfterSeconds >= 1);
});

test('rate-limit check is initially open', () => {
  const userId = `u-rate-${Date.now()}`;
  const first = checkUserAnalysisRateLimit(userId);
  assert.equal(first.ok, true);
  markUserAnalysisAttempt(userId, first.kept);
  const second = checkUserAnalysisRateLimit(userId);
  assert.equal(second.ok, true);
});

test('guard config exposes numeric thresholds', () => {
  const cfg = getAnalysisGuardConfig();
  assert.equal(typeof cfg.inFlightTtlSeconds, 'number');
  assert.equal(typeof cfg.cooldownSeconds, 'number');
  assert.equal(typeof cfg.hourlyLimit, 'number');
  assert.equal(typeof cfg.dailyLimit, 'number');
});

