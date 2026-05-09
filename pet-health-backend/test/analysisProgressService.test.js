import test from 'node:test';
import assert from 'node:assert/strict';
import { getAnalysisProgress, setAnalysisProgress } from '../src/services/analysisProgressService.js';

test('set/get progress returns entry for matching user', () => {
  const requestId = `r-${Date.now()}`;
  const userId = 'user-a';

  setAnalysisProgress({
    requestId,
    userId,
    stage: 'analyzing',
    status: 'processing',
    message: 'running',
  });

  const entry = getAnalysisProgress({ requestId, userId });
  assert.ok(entry);
  assert.equal(entry.stage, 'analyzing');
  assert.equal(entry.status, 'processing');
  assert.equal(entry.message, 'running');
});

test('progress is not visible to another user', () => {
  const requestId = `r-other-${Date.now()}`;
  setAnalysisProgress({
    requestId,
    userId: 'owner-1',
    stage: 'saving',
    status: 'processing',
  });

  const entry = getAnalysisProgress({ requestId, userId: 'owner-2' });
  assert.equal(entry, null);
});

