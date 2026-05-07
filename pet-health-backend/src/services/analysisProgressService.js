const PROGRESS_TTL_MS = 30 * 60 * 1000;

/** @type {Map<string, { userId: string, stage: string, status: string, updatedAt: number, message?: string }>} */
const progressMap = new Map();

function pruneExpired() {
  const now = Date.now();
  for (const [key, value] of progressMap.entries()) {
    if (now - value.updatedAt > PROGRESS_TTL_MS) {
      progressMap.delete(key);
    }
  }
}

export function setAnalysisProgress({ requestId, userId, stage, status = 'processing', message }) {
  if (!requestId || !userId) return;
  pruneExpired();
  progressMap.set(requestId, {
    userId,
    stage,
    status,
    updatedAt: Date.now(),
    ...(message ? { message } : {}),
  });
}

export function getAnalysisProgress({ requestId, userId }) {
  pruneExpired();
  const entry = progressMap.get(requestId);
  if (!entry || entry.userId !== userId) return null;
  return entry;
}

