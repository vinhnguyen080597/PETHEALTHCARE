import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createAnalysisRouter } from '../src/routes/createAnalysisRouter.js';

function fakeJpegBytes(seed = 1) {
  const bytes = new Uint8Array(256);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  bytes[3] = 0xe0;
  bytes[4] = seed;
  bytes[254] = 0xff;
  bytes[255] = 0xd9;
  return bytes;
}

function buildDeps(overrides = {}) {
  return {
    requireUser: (req, _res, next) => {
      req.user = { id: 'u1' };
      req.accessToken = 'token';
      next();
    },
    analyzePetHealthImages: async () => ({
      diagnosis: 'ok',
      severity: 'low',
      symptoms: [],
      treatment: 'rest',
      confidence: 0.9,
      disclaimer: 'n/a',
      status: 'ok',
      red_flags: [],
      diagnosis_candidates: [],
      evidence: [],
      missing_data: [],
      next_action: { summary: '', ask_user_to_add: [] },
    }),
    buildHealthContextAppendix: () => '',
    validateImageFile: () => {},
    validateVideoFile: () => {},
    createAnalysisRecord: async (payload) => ({ id: 'a1', user_id: payload.userId, pet_id: payload.petId, ...payload }),
    getAnalysisByIdForUser: async (_userId, id) => ({ id, user_id: 'u1', pet_id: 'p1', output_locale: 'en' }),
    listAnalysesByPet: async (_userId, petId, displayLocale) => [{ id: 'a1', pet_id: petId, displayLocale }],
    mergeAnalysisDisplayTranslation: async () => ({}),
    mergeDisplayLocaleRow: (row) => row,
    extractTranslatablePayload: () => ({ diagnosis: 'Ear infection' }),
    translateAnalysisFieldsToVietnamese: async () => ({ diagnosis: 'Viem tai' }),
    translateManyAnalysisRecordsToVietnamese: async (records) =>
      records.map((r) => ({ id: r.id, diagnosis: `vi-${r.id}` })),
    getPetByIdForUser: async () => ({ id: 'p1' }),
    storeDiagnosisImage: async () => 'https://img',
    storeDiagnosisVideo: async () => 'https://vid',
    buildAnalysisCacheKey: () => 'cache-key',
    getCachedAnalysis: () => null,
    setCachedAnalysis: () => {},
    getAnalysisProgress: () => null,
    setAnalysisProgress: () => {},
    acquireAnalysisLock: () => ({ ok: true, key: 'k1' }),
    checkAnalysisCooldown: () => ({ ok: true }),
    checkUserAnalysisRateLimit: () => ({ ok: true, kept: [] }),
    getAnalysisGuardConfig: () => ({ hourlyLimit: 10, dailyLimit: 40 }),
    markAnalysisCompleted: () => {},
    markUserAnalysisAttempt: () => {},
    releaseAnalysisLock: () => {},
    ...overrides,
  };
}

async function withServer(router, run) {
  const app = express();
  app.use(express.json());
  app.use('/analysis', router);
  app.use((err, _req, res, _next) =>
    res.status(err?.status || 500).json({ error: err?.message || 'internal', ...(err?.code ? { code: err.code } : {}) }),
  );
  const server = app.listen(0);
  try {
    const port = server.address().port;
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
}

test('GET /analysis/:petId forwards displayLocale to repository', async () => {
  let capturedOptions = null;
  const router = createAnalysisRouter(
    buildDeps({
      listAnalysesByPet: async (_u, _p, options) => {
        capturedOptions = options;
        return { data: [{ id: 'a1' }], nextCursor: null, totalCount: 1 };
      },
    }),
  );
  await withServer(router, async (base) => {
    const res = await fetch(`${base}/analysis/p1?displayLocale=vi&limit=10`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(Array.isArray(body.data), true);
    assert.equal(body.data[0].id, 'a1');
    assert.equal(body.nextCursor, null);
    assert.equal(body.totalCount, 1);
  });
  assert.equal(capturedOptions?.displayLocale, 'vi');
  assert.equal(capturedOptions?.limit, '10');
});

test('POST /analysis/translate-display validates locale', async () => {
  const router = createAnalysisRouter(buildDeps());
  await withServer(router, async (base) => {
    const res = await fetch(`${base}/analysis/translate-display`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysisIds: ['a1'], targetLocale: 'en' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, 'UNSUPPORTED_LOCALE');
  });
});

test('POST /analysis/translate-display translates and returns merged rows', async () => {
  const previousCredits = process.env.AI_CREDITS_ANALYSIS_TRANSLATION;
  process.env.AI_CREDITS_ANALYSIS_TRANSLATION = '0';
  const rows = new Map([
    ['a1', { id: 'a1', pet_id: 'p1', output_locale: 'en' }],
    ['a2', { id: 'a2', pet_id: 'p1', output_locale: 'en' }],
  ]);
  try {
    const router = createAnalysisRouter(
      buildDeps({
        getAnalysisByIdForUser: async (_u, id) => rows.get(id) ?? null,
        mergeAnalysisDisplayTranslation: async (_u, id, _loc, vi) => {
          const prev = rows.get(id);
          rows.set(id, { ...prev, display_translations: { vi } });
        },
        mergeDisplayLocaleRow: (row, locale) => ({
          ...row,
          diagnosis: locale === 'vi' ? row.display_translations?.vi?.diagnosis ?? row.diagnosis : row.diagnosis,
        }),
        translateManyAnalysisRecordsToVietnamese: async (records) =>
          records.map((r) => ({ id: r.id, diagnosis: `vi-${r.id}` })),
      }),
    );

    await withServer(router, async (base) => {
      const res = await fetch(`${base}/analysis/translate-display`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisIds: ['a1', 'a2'], targetLocale: 'vi', petId: 'p1' }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.length, 2);
      assert.equal(body.data[0].diagnosis.startsWith('vi-'), true);
    });
  } finally {
    if (previousCredits === undefined) delete process.env.AI_CREDITS_ANALYSIS_TRANSLATION;
    else process.env.AI_CREDITS_ANALYSIS_TRANSLATION = previousCredits;
  }
});

test('POST /analysis returns cached response when cache hit', async () => {
  let analyzeCalled = false;
  const router = createAnalysisRouter(
    buildDeps({
      getCachedAnalysis: () => ({ analysis: { id: 'cached' }, ageMs: 1000 }),
      analyzePetHealthImages: async () => {
        analyzeCalled = true;
        return {};
      },
    }),
  );

  await withServer(router, async (base) => {
    const form = new FormData();
    form.append('petId', 'p1');
    form.append('image', new Blob([fakeJpegBytes()], { type: 'image/jpeg' }), 'img.jpg');
    const res = await fetch(`${base}/analysis`, { method: 'POST', body: form });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.metadata.cached, true);
    assert.equal(body.data.id, 'cached');
  });

  assert.equal(analyzeCalled, false);
});

test('POST /analysis rejects duplicate photos before AI call', async () => {
  let analyzeCalled = false;
  const router = createAnalysisRouter(
    buildDeps({
      analyzePetHealthImages: async () => {
        analyzeCalled = true;
        return {};
      },
    }),
  );

  await withServer(router, async (base) => {
    const form = new FormData();
    const duplicate = fakeJpegBytes(7);
    form.append('petId', 'p1');
    form.append('image', new Blob([duplicate], { type: 'image/jpeg' }), 'img.jpg');
    form.append('photos', new Blob([duplicate], { type: 'image/jpeg' }), 'same.jpg');
    const res = await fetch(`${base}/analysis`, { method: 'POST', body: form });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, 'AI_PAYLOAD_DUPLICATE_IMAGE');
  });

  assert.equal(analyzeCalled, false);
});

