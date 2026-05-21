import type { Page, Route } from '@playwright/test';

type Pet = {
  id: string;
  user_id: string;
  name: string;
  species: string;
  breed: string | null;
  age: number | null;
  gender: string | null;
  avatar_url: string | null;
  created_at: string;
};

type CareRecord = {
  id: string;
  user_id: string;
  pet_id: string;
  type: 'diary' | 'reminder' | 'vet_visit' | 'document';
  title: string;
  note: string;
  occurred_at: string;
  due_at: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type MockApiState = {
  token: string;
  pets: Pet[];
  careRecords: CareRecord[];
  creditBalance: number;
  ledger: Array<Record<string, unknown>>;
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function bodyJson(route: Route) {
  const raw = route.request().postData();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function summarize(records: CareRecord[]) {
  return {
    diary: records.filter((r) => r.type === 'diary').length,
    vet_visit: records.filter((r) => r.type === 'vet_visit').length,
    document: records.filter((r) => r.type === 'document').length,
    reminder: records.filter((r) => r.type === 'reminder').length,
    pendingReminders: records.filter((r) => r.type === 'reminder' && r.status === 'pending').length,
    overdueReminders: 0,
  };
}

function defaultCreditAccount(state: MockApiState) {
  return {
    userId: 'e2e-user',
    planTier: 'free',
    creditBalance: state.creditBalance,
    monthlyAllowance: 0,
    monthlyResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export async function installMockApi(page: Page, initial?: Partial<MockApiState>) {
  const state: MockApiState = {
    token: 'e2e-token',
    pets: [],
    careRecords: [],
    creditBalance: 2,
    ledger: [],
    ...initial,
  };

  await page.route('**/health', (route) => json(route, { status: 'ok', service: 'mock' }));

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    const method = route.request().method();

    if (method === 'POST' && (path === '/auth/login' || path === '/auth/signup')) {
      return json(route, {
        data: {
          user: { id: 'e2e-user', email: 'e2e@example.com' },
          session: { access_token: state.token },
        },
      });
    }

    if (method === 'GET' && path === '/pets') {
      return json(route, { data: state.pets });
    }

    if (method === 'POST' && path === '/pets') {
      const payload = await bodyJson(route);
      const pet: Pet = {
        id: `pet-${state.pets.length + 1}`,
        user_id: 'e2e-user',
        name: String(payload.name ?? 'Buddy'),
        species: String(payload.species ?? 'dog'),
        breed: payload.breed ? String(payload.breed) : null,
        age: Number.isFinite(Number(payload.age)) ? Number(payload.age) : null,
        gender: payload.gender ? String(payload.gender) : 'male',
        avatar_url: null,
        created_at: new Date().toISOString(),
      };
      state.pets.unshift(pet);
      return json(route, { data: pet }, 201);
    }

    const petMatch = path.match(/^\/pets\/([^/]+)$/);
    if (method === 'GET' && petMatch) {
      const pet = state.pets.find((p) => p.id === decodeURIComponent(petMatch[1]));
      return pet ? json(route, { data: pet }) : json(route, { error: 'Pet not found' }, 404);
    }

    const analysisListMatch = path.match(/^\/analysis\/([^/]+)$/);
    if (method === 'GET' && analysisListMatch) {
      return json(route, { data: [] });
    }

    if (method === 'GET' && path === '/ai-credits/summary') {
      return json(route, {
        data: {
          account: defaultCreditAccount(state),
          config: {
            freeMonthlyCredits: 0,
            initialTrialCredits: 2,
            defaultPlanTier: 'free',
            features: {
              health_analysis: { feature: 'health_analysis', creditCost: 1, estimatedInputTokens: 1, estimatedOutputTokens: 1, estimatedCostUsd: 0.001 },
              breed_recognition: { feature: 'breed_recognition', creditCost: 1, estimatedInputTokens: 1, estimatedOutputTokens: 1, estimatedCostUsd: 0.001 },
            },
          },
        },
      });
    }

    if (method === 'GET' && path === '/ai-credits/ledger') {
      return json(route, { data: state.ledger });
    }

    if (method === 'POST' && path === '/ai-credits/rewarded-ad') {
      state.creditBalance += 1;
      state.ledger.unshift({ id: `ledger-${state.ledger.length + 1}`, reason: 'ad_reward', delta: 1 });
      return json(route, {
        data: {
          grantedCredits: 1,
          remainingToday: 2,
          account: defaultCreditAccount(state),
        },
      });
    }

    const recordsMatch = path.match(/^\/core-care\/pets\/([^/]+)\/records$/);
    if (recordsMatch && method === 'GET') {
      const petId = decodeURIComponent(recordsMatch[1]);
      const records = state.careRecords.filter((record) => record.pet_id === petId);
      return json(route, { data: records, summary: summarize(records) });
    }

    if (recordsMatch && method === 'POST') {
      const petId = decodeURIComponent(recordsMatch[1]);
      const payload = await bodyJson(route);
      const now = new Date().toISOString();
      const record: CareRecord = {
        id: `record-${state.careRecords.length + 1}`,
        user_id: 'e2e-user',
        pet_id: petId,
        type: payload.type ?? 'diary',
        title: String(payload.title ?? 'Care record'),
        note: String(payload.note ?? ''),
        occurred_at: String(payload.occurredAt ?? now),
        due_at: payload.dueAt ? String(payload.dueAt) : null,
        status: String(payload.status ?? (payload.type === 'reminder' ? 'pending' : 'active')),
        metadata: {},
        created_at: now,
        updated_at: now,
      };
      state.careRecords.unshift(record);
      return json(route, { data: record }, 201);
    }

    const recordMatch = path.match(/^\/core-care\/records\/([^/]+)$/);
    if (recordMatch && method === 'PUT') {
      const recordId = decodeURIComponent(recordMatch[1]);
      const payload = await bodyJson(route);
      const idx = state.careRecords.findIndex((record) => record.id === recordId);
      if (idx < 0) return json(route, { error: 'Record not found' }, 404);
      state.careRecords[idx] = { ...state.careRecords[idx], ...payload, updated_at: new Date().toISOString() };
      return json(route, { data: state.careRecords[idx] });
    }

    return json(route, { error: `Unhandled mock route: ${method} ${path}` }, 404);
  });

  return state;
}
