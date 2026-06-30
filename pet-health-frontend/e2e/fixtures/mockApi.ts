import type { Page, Route } from '@playwright/test';

type Pet = {
  id: string;
  user_id: string;
  name: string;
  species: string;
  breed: string | null;
  age: number | null;
  birth_date?: string | null;
  gender: string | null;
  avatar_url: string | null;
  created_at: string;
};

function ageMonthsFromBirthDate(birthDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return 0;
  const birth = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

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

type Analysis = {
  id: string;
  user_id: string;
  pet_id: string;
  diagnosis: string;
  assessment?: Record<string, unknown> | null;
  severity: 'low' | 'medium' | 'high';
  symptoms: string[];
  treatment: string;
  confidence: number;
  disclaimer: string;
  output_locale?: string | null;
  display_translations?: Record<string, unknown> | null;
  image_url: string | null;
  created_at: string;
  extra_image_urls?: string[] | null;
  video_url?: string | null;
  weight_kg?: number | null;
  vaccination_status?: string | null;
  vaccine_type?: string | null;
  neutering_status?: string | null;
  medical_history?: string | null;
  symptom_description?: string | null;
  status?: 'ok' | 'need_more_data' | 'not_pet_or_unclear' | 'emergency_flag';
  red_flags?: string[] | null;
  diagnosis_candidates?: { name: string; confidence: number }[] | null;
  evidence?: string[] | null;
  missing_data?: string[] | null;
  next_action?: {
    summary?: string;
    ask_user_to_add?: string[];
  } | null;
};

type MockApiState = {
  token: string;
  account: {
    user_id: string;
    email: string | null;
    login_identifier: string;
    display_name: string;
    primary_role: 'sen' | 'breeder' | 'admin' | 'vet';
    account_status: 'active' | 'suspended';
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  };
  pets: Pet[];
  careRecords: CareRecord[];
  analyses: Analysis[];
  creditBalance: number;
  featureTrialBalance: { health_analysis: number; breed_recognition: number };
  ledger: Array<Record<string, unknown>>;
  accountPassword: string;
  pendingNewEmail: string | null;
  pendingPasswordRecovery: boolean;
  featureFlags: {
    breed_recognition: boolean;
    health_analysis: boolean;
    rewarded_ads: boolean;
    subscription: boolean;
  };
};

const API_DELAY_MS = Number(process.env.E2E_API_DELAY_MS ?? 0);
export const MOCK_E2E_OTP = '12345678';
const MOCK_ACCOUNT_PASSWORD = 'password123';

function isValidOtp(otp: unknown) {
  return String(otp ?? '').trim() === MOCK_E2E_OTP;
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function delay(ms: number) {
  if (ms > 0) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
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

function deductMockCredits(state: MockApiState, feature: 'health_analysis' | 'breed_recognition', amount = 1) {
  const trials = { ...state.featureTrialBalance };
  let remaining = amount;
  const trialAvailable = Number(trials[feature] ?? 0);
  if (trialAvailable > 0) {
    const used = Math.min(trialAvailable, remaining);
    trials[feature] = trialAvailable - used;
    remaining -= used;
  }
  if (remaining > 0) {
    state.creditBalance = Math.max(0, state.creditBalance - remaining);
  }
  state.featureTrialBalance = trials;
}

function defaultCreditAccount(state: MockApiState) {
  return {
    userId: 'e2e-user',
    planTier: 'free',
    creditBalance: state.creditBalance,
    featureTrialBalance: { ...state.featureTrialBalance },
    monthlyAllowance: 0,
    monthlyResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

function createAnalysis(state: MockApiState, petId: string): Analysis {
  const now = new Date().toISOString();
  const analysis: Analysis = {
    id: `analysis-${state.analyses.length + 1}`,
    user_id: 'e2e-user',
    pet_id: petId,
    diagnosis: 'Routine wellness baseline',
    assessment: {
      schema_version: 'health_assessment.v1',
      output_locale: 'en',
      status: 'ok',
      severity: 'low',
      confidence: 0.91,
      possible_finding: 'Routine wellness baseline',
      observed_signs: ['Bright eyes', 'Normal appetite'],
      visual_evidence: ['No urgent visual concerns in the submitted photos.'],
      missing_data: [],
      care_guidance: 'Continue routine care, monitor hydration, and contact a veterinarian if signs change.',
      red_flags: [],
      next_action: {
        urgency: 'self_monitor',
        summary: 'Keep watching for any behavior changes.',
        ask_user_to_add: ['Add a note if appetite or energy changes.'],
      },
      candidates: [],
      safety: {
        is_definitive_diagnosis: false,
        contains_medication_dosage: false,
        requires_vet_attention: false,
        disclaimer:
          'This information is for reference only and does not replace diagnosis or treatment from a licensed veterinarian.',
      },
    },
    severity: 'low',
    symptoms: ['Bright eyes', 'Normal appetite'],
    treatment: 'Continue routine care, monitor hydration, and contact a veterinarian if signs change.',
    confidence: 0.91,
    disclaimer:
      'This AI wellness screening is for early guidance only and is not a veterinary diagnosis. Consult a licensed veterinarian for medical decisions.',
    output_locale: 'en',
    image_url: null,
    created_at: now,
    status: 'ok',
    red_flags: [],
    evidence: ['No urgent visual concerns in the submitted photos.'],
    missing_data: [],
    next_action: {
      summary: 'Keep watching for any behavior changes.',
      ask_user_to_add: ['Add a note if appetite or energy changes.'],
    },
  };
  state.analyses.unshift(analysis);
  deductMockCredits(state, 'health_analysis', 1);
  state.ledger.unshift({ id: `ledger-${state.ledger.length + 1}`, reason: 'health_analysis', delta: -1 });
  return analysis;
}

export async function installMockApi(page: Page, initial?: Partial<MockApiState>) {
  const state: MockApiState = {
    token: 'e2e-token',
    account: {
      user_id: 'e2e-user',
      email: 'e2e@example.com',
      login_identifier: "Luna's parent",
      display_name: "Luna's parent",
      primary_role: 'sen',
      account_status: 'active',
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    pets: [],
    careRecords: [],
    analyses: [],
    creditBalance: 0,
    featureTrialBalance: { health_analysis: 1, breed_recognition: 1 },
    ledger: [],
    accountPassword: MOCK_ACCOUNT_PASSWORD,
    pendingNewEmail: null,
    pendingPasswordRecovery: false,
    featureFlags: { breed_recognition: true, health_analysis: true, rewarded_ads: true, subscription: true },
    ...initial,
  };

  await page.route('**/health', (route) => json(route, { status: 'ok', service: 'mock' }));

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    const method = route.request().method();

    if (method === 'POST' && path === '/auth/signup') {
      const payload = await bodyJson(route);
      const email = String(payload.email ?? 'e2e@example.com');
      return json(route, {
        data: {
          otpSent: true,
          email,
        },
      });
    }

    if (method === 'POST' && path === '/auth/signup/verify-otp') {
      const payload = await bodyJson(route);
      const email = String(payload.email ?? 'e2e@example.com');
      if (!isValidOtp(payload.otp)) {
        return json(route, { error: 'Incorrect or expired OTP.', code: 'otp_invalid' }, 400);
      }
      state.account.primary_role = 'sen';
      state.account.email = email;
      state.account.login_identifier = email;
      state.account.display_name = email.split('@')[0] || email;
      state.account.updated_at = new Date().toISOString();
      return json(route, {
        data: {
          user: { id: 'e2e-user', email },
          session: { access_token: state.token },
          account: state.account,
        },
      });
    }

    if (method === 'POST' && path === '/auth/login') {
      return json(route, {
        data: {
          user: { id: 'e2e-user', email: 'e2e@example.com' },
          session: { access_token: state.token },
          account: state.account,
        },
      });
    }

    if (method === 'GET' && path === '/auth/me') {
      return json(route, { data: state.account });
    }

    if (method === 'DELETE' && path === '/auth/me') {
      return route.fulfill({ status: 204 });
    }

    if (method === 'POST' && path === '/auth/account/verify-request') {
      const payload = await bodyJson(route);
      const type = String(payload.type ?? '');

      if (type === 'update_email') {
        const currentPassword = String(payload.currentPassword ?? '');
        const newEmail = String(payload.newEmail ?? '').trim().toLocaleLowerCase('en-US');
        if (currentPassword !== state.accountPassword) {
          return json(route, { error: 'Current password is incorrect.', code: 'WRONG_PASSWORD' }, 400);
        }
        if (!newEmail) {
          return json(route, { error: 'newEmail is required' }, 400);
        }
        state.pendingNewEmail = newEmail;
        state.account.metadata = {
          ...state.account.metadata,
          pending_email_change_to: newEmail,
        };
        return json(route, { data: { otpSent: true, email: newEmail } });
      }

      if (type === 'update_password') {
        const currentPassword = String(payload.currentPassword ?? '');
        const newPassword = String(payload.newPassword ?? '');
        if (currentPassword !== state.accountPassword) {
          return json(route, { error: 'Current password is incorrect.', code: 'WRONG_PASSWORD' }, 400);
        }
        if (newPassword.length < 6) {
          return json(route, { error: 'password must be at least 6 characters', code: 'PASSWORD_TOO_SHORT' }, 400);
        }
        return json(route, { data: { verified: true } });
      }

      if (type === 'recover_password') {
        const email = state.account.email;
        if (!email) {
          return json(route, { error: 'Please update your email before recovering your password.', code: 'UPDATE_EMAIL_FIRST' }, 400);
        }
        state.pendingPasswordRecovery = true;
        state.account.metadata = {
          ...state.account.metadata,
          pending_password_recovery_to: email,
        };
        return json(route, { data: { otpSent: true, email } });
      }

      return json(route, { error: 'Unsupported verification type', code: 'INVALID_INPUT' }, 400);
    }

    if (method === 'POST' && path === '/auth/account/apply-update') {
      const payload = await bodyJson(route);
      const type = String(payload.type ?? '');

      if (type === 'update_email') {
        const currentPassword = String(payload.currentPassword ?? '');
        const newEmail = String(payload.newEmail ?? '').trim().toLocaleLowerCase('en-US');
        if (currentPassword !== state.accountPassword) {
          return json(route, { error: 'Current password is incorrect.', code: 'WRONG_PASSWORD' }, 400);
        }
        if (!isValidOtp(payload.otp) || !state.pendingNewEmail || state.pendingNewEmail !== newEmail) {
          return json(route, { error: 'Incorrect or expired OTP.', code: 'otp_invalid' }, 400);
        }
        state.account.email = newEmail;
        state.account.login_identifier = newEmail;
        state.account.display_name = newEmail.split('@')[0] || newEmail;
        state.account.updated_at = new Date().toISOString();
        state.pendingNewEmail = null;
        state.account.metadata = { ...state.account.metadata };
        delete state.account.metadata.pending_email_change_to;
        return json(route, { data: { account: state.account, accessToken: state.token } });
      }

      if (type === 'update_password') {
        const currentPassword = String(payload.currentPassword ?? '');
        const newPassword = String(payload.newPassword ?? '');
        if (currentPassword !== state.accountPassword) {
          return json(route, { error: 'Current password is incorrect.', code: 'WRONG_PASSWORD' }, 400);
        }
        if (newPassword.length < 6) {
          return json(route, { error: 'password must be at least 6 characters', code: 'PASSWORD_TOO_SHORT' }, 400);
        }
        state.accountPassword = newPassword;
        return json(route, { data: { success: true, accessToken: state.token } });
      }

      if (type === 'recover_password') {
        const newPassword = String(payload.newPassword ?? '');
        if (!state.pendingPasswordRecovery || !isValidOtp(payload.otp)) {
          return json(route, { error: 'Incorrect or expired OTP.', code: 'otp_invalid' }, 400);
        }
        if (newPassword.length < 6) {
          return json(route, { error: 'password must be at least 6 characters', code: 'PASSWORD_TOO_SHORT' }, 400);
        }
        state.accountPassword = newPassword;
        state.pendingPasswordRecovery = false;
        state.account.metadata = { ...state.account.metadata };
        delete state.account.metadata.pending_password_recovery_to;
        return json(route, { data: { success: true, accessToken: state.token } });
      }

      return json(route, { error: 'Unsupported update type', code: 'INVALID_INPUT' }, 400);
    }

    if (method === 'GET' && path === '/pet-feed/posts') {
      return json(route, {
        data: [
          {
            id: 'feed-post-1',
            user_id: 'breeder-user-1',
            breeder_profile_id: 'breeder-1',
            title: 'British Shorthair kitten looking for a caring home',
            species: 'cat',
            breed: 'British Shorthair',
            gender: 'female',
            age_months: 4,
            location: 'Ho Chi Minh City',
            price_note: 'Contact breeder',
            description: 'Raised indoors with daily socialization. Please verify documents and meet the breeder directly.',
            personality: ['calm', 'friendly'],
            vaccine_status: 'First vaccine recorded by breeder',
            deworming_status: 'Deworming record available',
            paperwork: ['Vaccine book'],
            media_urls: [],
            contact: { facebook: 'https://facebook.com/example' },
            status: 'published',
            metadata: {},
            is_favorited: false,
            breeder_profile: {
              id: 'breeder-1',
              user_id: 'breeder-user-1',
              display_name: 'Mai Cattery',
              bio: 'Small home breeder focused on transparent care records.',
              location: 'Ho Chi Minh City',
              avatar_url: null,
              contact: { facebook: 'https://facebook.com/example' },
              primary_species: ['cat'],
              main_breeds: ['British Shorthair'],
              care_environment: 'Raised indoors with daily handling and routine vet care.',
              verification_status: 'verified',
              metadata: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      });
    }

    if (method === 'GET' && path === '/pet-feed/breeders') {
      return json(route, {
        data: [
          {
            id: 'breeder-1',
            user_id: 'breeder-user-1',
            display_name: 'Mai Cattery',
            bio: 'Small home breeder focused on transparent care records.',
            location: 'Ho Chi Minh City',
            avatar_url: null,
            contact: { facebook: 'https://facebook.com/example' },
            primary_species: ['cat'],
            main_breeds: ['British Shorthair'],
            care_environment: 'Raised indoors with daily handling and routine vet care.',
            verification_status: 'verified',
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      });
    }

    if ((method === 'POST' || method === 'DELETE') && path.match(/^\/pet-feed\/posts\/[^/]+\/favorite$/)) {
      return route.fulfill({ status: 204 });
    }

    if (method === 'GET' && path === '/pets') {
      return json(route, { data: state.pets });
    }

    if (method === 'POST' && path === '/pets') {
      const payload = await bodyJson(route);
      const birthDate = payload.birthDate ? String(payload.birthDate).slice(0, 10) : null;
      const pet: Pet = {
        id: `pet-${state.pets.length + 1}`,
        user_id: 'e2e-user',
        name: String(payload.name ?? 'Buddy'),
        species: String(payload.species ?? 'cat'),
        breed: payload.breed ? String(payload.breed) : null,
        birth_date: birthDate,
        age: birthDate ? ageMonthsFromBirthDate(birthDate) : Number.isFinite(Number(payload.age)) ? Number(payload.age) : null,
        gender: payload.gender ? String(payload.gender) : 'male',
        avatar_url: payload.avatarUrl ? String(payload.avatarUrl) : null,
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

    if (method === 'PUT' && petMatch) {
      const petId = decodeURIComponent(petMatch[1]);
      const idx = state.pets.findIndex((p) => p.id === petId);
      if (idx < 0) return json(route, { error: 'Pet not found' }, 404);
      const payload = await bodyJson(route);
      const birthDate = payload.birthDate !== undefined
        ? (payload.birthDate === null ? null : String(payload.birthDate).slice(0, 10))
        : state.pets[idx].birth_date ?? null;
      state.pets[idx] = {
        ...state.pets[idx],
        name: payload.name !== undefined ? String(payload.name) : state.pets[idx].name,
        species: payload.species !== undefined ? String(payload.species) : state.pets[idx].species,
        breed: payload.breed !== undefined ? (payload.breed === null ? null : String(payload.breed)) : state.pets[idx].breed,
        birth_date: birthDate,
        age: birthDate
          ? ageMonthsFromBirthDate(birthDate)
          : payload.age !== undefined && payload.age !== null
            ? Number(payload.age)
            : payload.age === null
              ? null
              : state.pets[idx].age,
        gender: payload.gender !== undefined ? String(payload.gender) : state.pets[idx].gender,
        avatar_url: payload.avatarUrl !== undefined ? (payload.avatarUrl === null ? null : String(payload.avatarUrl)) : state.pets[idx].avatar_url,
      };
      return json(route, { data: state.pets[idx] });
    }

    if (method === 'DELETE' && petMatch) {
      const petId = decodeURIComponent(petMatch[1]);
      state.pets = state.pets.filter((p) => p.id !== petId);
      state.careRecords = state.careRecords.filter((record) => record.pet_id !== petId);
      state.analyses = state.analyses.filter((analysis) => analysis.pet_id !== petId);
      return route.fulfill({ status: 204 });
    }

    if (method === 'POST' && path === '/pets/upload-avatar') {
      return json(route, {
        data: {
          avatarUrl: 'https://example.test/avatar.jpg',
          avatarStorageUrl: 'storage://e2e/avatar.jpg',
        },
      });
    }

    if (method === 'GET' && path.startsWith('/analysis/progress/')) {
      return json(route, {
        data: {
          stage: 'done',
          status: 'done',
          updatedAt: Date.now(),
          message: 'Analysis complete',
        },
      });
    }

    if (method === 'POST' && path === '/analysis') {
      await delay(API_DELAY_MS);
      const petId = state.pets[0]?.id ?? 'pet-1';
      const analysis = createAnalysis(state, petId);
      return json(route, {
        data: analysis,
        metadata: { fileType: 'image/jpeg', fileSize: 1024 },
        warnings: [],
      });
    }

    const analysisListMatch = path.match(/^\/analysis\/([^/]+)$/);
    if (method === 'GET' && analysisListMatch) {
      const petId = decodeURIComponent(analysisListMatch[1]);
      return json(route, { data: state.analyses.filter((analysis) => analysis.pet_id === petId) });
    }

    if (method === 'POST' && path === '/analysis/translate-display') {
      return json(route, { data: state.analyses });
    }

    if (method === 'POST' && path === '/breed-recognition') {
      await delay(API_DELAY_MS);
      deductMockCredits(state, 'breed_recognition', 1);
      state.ledger.unshift({ id: `ledger-${state.ledger.length + 1}`, reason: 'breed_recognition', delta: -1 });
      return json(route, {
        data: {
          schema_version: 'breed_recognition.v2',
          primary: {
            breed_name: 'British Shorthair mix',
            phenotype_label: 'Blue short coat',
            confidence: 0.87,
            summary: 'Mai sees a round face, dense blue short coat, and compact body proportions that can fit a British Shorthair mix.',
          },
          breed_profile: {
            origin: 'United Kingdom',
            size: 'Medium',
            coat: 'Short, dense coat',
            temperament: ['Calm', 'Gentle', 'Independent'],
            activity_level: 'medium',
            grooming_needs: 'low',
          },
          visual_evidence: [
            { trait: 'Face shape', observation: 'Round face and full cheeks.', source_slot: 'face' },
            { trait: 'Coat', observation: 'Dense blue short coat.', source_slot: 'coat' },
          ],
          care_overview: [
            { title: 'Coat care', body: 'Short dense coats usually need regular brushing, especially during shedding seasons.' },
            { title: 'Breed certainty', body: 'Official confirmation still depends on pedigree records, breeder documents, or registry review.' },
          ],
          sources: [{ title: 'TICA cat registration guidance', url: 'https://tica.org/how-do-i-register-my-cat/' }],
          primary_hypothesis: 'British Shorthair mix',
          confidence: 0.87,
          alternatives: [{ label: 'Domestic Shorthair', confidence: 0.55, reason: 'Similar short coat and common mixed background.' }],
          visible_clues: ['Round face', 'Dense coat'],
          missing_for_better_id: ['Pedigree document'],
          notes_for_owner: 'Treat this as a visual estimate, not a pedigree certificate.',
          disclaimer: 'Breed recognition is an AI estimate and may be wrong.',
        },
      });
    }

    if (method === 'GET' && path === '/feature-flags') {
      return json(route, { data: state.featureFlags });
    }

    if (method === 'GET' && path === '/admin/feature-flags') {
      return json(route, { data: state.featureFlags });
    }

    if (method === 'PUT' && path === '/admin/feature-flags') {
      const payload = await bodyJson(route);
      if ('breed_recognition' in payload) {
        state.featureFlags.breed_recognition = payload.breed_recognition !== false;
      }
      if ('health_analysis' in payload) {
        state.featureFlags.health_analysis = payload.health_analysis !== false;
      }
      if ('rewarded_ads' in payload) {
        state.featureFlags.rewarded_ads = payload.rewarded_ads !== false;
      }
      if ('subscription' in payload) {
        state.featureFlags.subscription = payload.subscription !== false;
      }
      return json(route, { data: state.featureFlags });
    }

    if (method === 'GET' && path === '/ai-credits/summary') {
      return json(route, {
        data: {
          account: defaultCreditAccount(state),
          config: {
            freeMonthlyCredits: 0,
            initialTrialCredits: 0,
            featureTrialCredits: { health_analysis: 1, breed_recognition: 1 },
            defaultPlanTier: 'free',
            rewardedAd: { creditsPerAd: 1, unlimited: true },
            pricingExperiment: {
              subscriptionTrial: { monthlyCredits: 60, priceVnd: 99000, label: 'Premium beta' },
            },
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

    if (method === 'POST' && path === '/iap/verify') {
      state.creditBalance = 60;
      return json(route, {
        data: {
          ok: true,
          alreadyProcessed: false,
          productId: 'com.pethealthcare.app.premium.monthly',
          transactionId: 'e2e-txn',
          productType: 'subscription',
          grantedCredits: 60,
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
