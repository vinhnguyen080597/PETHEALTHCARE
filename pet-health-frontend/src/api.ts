import { Platform } from 'react-native';
import { API_BASE_URL, API_HEALTH_URL } from './config';
import { BREED_RECOGNITION_SLOT_ORDER } from './constants/petBreedRecognitionSlots';
import type {
  Analysis,
  AiCreditAccount,
  AiEconomicsConfig,
  AccountProfile,
  AdminCreateAccountPayload,
  AdminUpdateAccountPayload,
  AnalyzeResponse,
  AuthPayload,
  AuthResponse,
  BreedRecognitionResult,
  CoreCareRecord,
  CoreCareSummary,
  CreatePetPayload,
  CreateCoreCareRecordPayload,
  CreatePetFeedPostMedia,
  CreatePetFeedPostPayload,
  BreederProfile,
  Pet,
  PetFeedPost,
  PetFeedReport,
  UpdatePetPayload,
  UpsertBreederProfilePayload,
} from './types';

/**
 * Extra headers for public tunnels:
 * - localtunnel (`*.loca.lt`): interstitial bypass
 * - ngrok free (`*.ngrok-free.app`, `*.ngrok-free.dev`, etc.): HTML warning bypass for API/fetch
 */
function tunnelHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (API_BASE_URL.includes('loca.lt')) {
    h['Bypass-Tunnel-Reminder'] = 'true';
  }
  if (/ngrok-free\.(app|dev)|\.ngrok\.io|\.ngrok\.app/i.test(API_BASE_URL)) {
    h['ngrok-skip-browser-warning'] = 'true';
  }
  return h;
}

/**
 * Web `FormData` does not accept RN's `{ uri, name, type }` — it becomes `[object Object]`.
 * Native keeps that shape; web fetches the blob/data URL and appends a real `Blob`.
 */
async function appendImageFileToFormData(
  formData: FormData,
  fieldName: string,
  imageUri: string,
  filenameBase: string,
  mimeHint: string,
) {
  if (Platform.OS === 'web') {
    const res = await fetch(imageUri);
    const blob = await res.blob();
    const type = blob.type && blob.type !== 'application/octet-stream' ? blob.type : mimeHint;
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    formData.append(fieldName, blob, `${filenameBase}.${ext}`);
    return;
  }
  formData.append(fieldName, {
    uri: imageUri,
    name: `${filenameBase}.jpg`,
    type: mimeHint,
  } as any);
}

async function appendVideoFileToFormData(
  formData: FormData,
  fieldName: string,
  videoUri: string,
  filenameBase: string,
  mimeHint: string = 'video/mp4',
) {
  if (Platform.OS === 'web') {
    const res = await fetch(videoUri);
    const blob = await res.blob();
    const type = blob.type && blob.type.startsWith('video/') ? blob.type : mimeHint;
    const ext = type.includes('webm') ? 'webm' : type.includes('quicktime') ? 'mov' : 'mp4';
    formData.append(fieldName, blob, `${filenameBase}.${ext}`);
    return;
  }
  formData.append(fieldName, {
    uri: videoUri,
    name: `${filenameBase}.mp4`,
    type: mimeHint,
  } as any);
}

function mergeHeaders(init?: HeadersInit): Record<string, string> {
  const out: Record<string, string> = { ...tunnelHeaders() };
  if (!init) return out;
  if (init instanceof Headers) {
    init.forEach((value, key) => {
      if (value) out[key] = value;
    });
    return out;
  }
  if (Array.isArray(init)) {
    for (const [key, value] of init) {
      if (value) out[key] = value;
    }
    return out;
  }
  for (const [key, value] of Object.entries(init)) {
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

export class ApiRequestError extends Error {
  status?: number;
  code?: string;
  retryAfterSeconds?: number;
  creditBalance?: number;
  creditCost?: number;
  monthlyResetAt?: string;
}

function parseErrorMessage(response: Response, body: unknown): string {
  if (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string') {
    return (body as { error: string }).error;
  }
  return `Request failed (${response.status})`;
}

function buildApiRequestError(response: Response, body: unknown, fallback: string): ApiRequestError {
  const err = new ApiRequestError(
    body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
      ? (body as { error: string }).error
      : fallback,
  );
  err.status = response.status;
  if (body && typeof body === 'object') {
    const b = body as {
      code?: unknown;
      retryAfterSeconds?: unknown;
      creditBalance?: unknown;
      creditCost?: unknown;
      monthlyResetAt?: unknown;
    };
    if (typeof b.code === 'string') err.code = b.code;
    if (typeof b.retryAfterSeconds === 'number') err.retryAfterSeconds = b.retryAfterSeconds;
    if (typeof b.creditBalance === 'number') err.creditBalance = b.creditBalance;
    if (typeof b.creditCost === 'number') err.creditCost = b.creditCost;
    if (typeof b.monthlyResetAt === 'string') err.monthlyResetAt = b.monthlyResetAt;
  }
  return err;
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: mergeHeaders(options.headers),
  });
  const contentType = response.headers.get('content-type') || '';

  let body: unknown = null;
  if (response.status !== 204) {
    const text = await response.text();
    if (text.length > 0 && contentType.includes('application/json')) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        body = text;
      }
    } else if (text.length > 0) {
      body = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null ? parseErrorMessage(response, body) : `Request failed (${response.status})`;
    throw buildApiRequestError(response, body, message);
  }

  if (response.status === 204) {
    return null as T;
  }

  return body as T;
}

export async function healthCheck() {
  const res = await fetch(API_HEALTH_URL, { headers: mergeHeaders() });
  if (!res.ok) {
    throw new Error('Backend health check failed');
  }
  return res.json() as Promise<{ status: string; service?: string; timestamp?: string }>;
}

export async function signUp(payload: AuthPayload) {
  return requestJson<{ data: AuthResponse }>('/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function login(payload: AuthPayload) {
  return requestJson<{ data: AuthResponse }>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getMe(token: string) {
  return requestJson<{ data: AccountProfile }>('/auth/me', {
    headers: authHeaders(token),
  });
}

export async function deleteMyAccount(token: string) {
  await requestJson<null>('/auth/me', {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export async function oauthGoogle(idToken: string) {
  return requestJson<{ data: AuthResponse }>('/auth/oauth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
}

export async function oauthApple(idToken: string, nonce: string) {
  return requestJson<{ data: AuthResponse }>('/auth/oauth/apple', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, nonce }),
  });
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function listPets(token: string) {
  return requestJson<{ data: Pet[] }>('/pets', {
    headers: authHeaders(token),
  });
}

export async function getPet(token: string, petId: string) {
  return requestJson<{ data: Pet }>(`/pets/${encodeURIComponent(petId)}`, {
    headers: authHeaders(token),
  });
}

export async function createPet(token: string, payload: CreatePetPayload) {
  return requestJson<{ data: Pet }>('/pets', {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function updatePet(token: string, petId: string, payload: UpdatePetPayload) {
  return requestJson<{ data: Pet }>(`/pets/${encodeURIComponent(petId)}`, {
    method: 'PUT',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function deletePet(token: string, petId: string) {
  await requestJson<null>(`/pets/${encodeURIComponent(petId)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export async function listPetFeedPosts(token: string) {
  return requestJson<{ data: PetFeedPost[] }>('/pet-feed/posts', {
    headers: authHeaders(token),
  });
}

export async function listVerifiedBreederProfiles(token: string) {
  return requestJson<{ data: BreederProfile[] }>('/pet-feed/breeders', {
    headers: authHeaders(token),
  });
}

export async function listMyPetFeedPosts(token: string) {
  return requestJson<{ data: PetFeedPost[] }>('/pet-feed/my-posts', {
    headers: authHeaders(token),
  });
}

export async function getMyBreederProfile(token: string) {
  return requestJson<{ data: BreederProfile | null }>('/pet-feed/breeder-profile/me', {
    headers: authHeaders(token),
  });
}

export async function upsertMyBreederProfile(token: string, payload: UpsertBreederProfilePayload) {
  return requestJson<{ data: BreederProfile }>('/pet-feed/breeder-profile/me', {
    method: 'PUT',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function createPetFeedPost(token: string, payload: CreatePetFeedPostPayload, media?: CreatePetFeedPostMedia) {
  if (media) {
    const formData = new FormData();
    formData.append('payload', JSON.stringify(payload));
    for (let i = 0; i < media.photoUris.length; i++) {
      await appendImageFileToFormData(formData, 'photos', media.photoUris[i], `pet-feed-photo-${i}-${Date.now()}`, 'image/jpeg');
    }
    await appendVideoFileToFormData(formData, 'video', media.videoUri, `pet-feed-video-${Date.now()}`, 'video/mp4');
    return requestJson<{ data: PetFeedPost }>('/pet-feed/posts', {
      method: 'POST',
      headers: authHeaders(token),
      body: formData,
    });
  }
  return requestJson<{ data: PetFeedPost }>('/pet-feed/posts', {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function favoritePetFeedPost(token: string, postId: string) {
  await requestJson<null>(`/pet-feed/posts/${encodeURIComponent(postId)}/favorite`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export async function unfavoritePetFeedPost(token: string, postId: string) {
  await requestJson<null>(`/pet-feed/posts/${encodeURIComponent(postId)}/favorite`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export async function reportPetFeedPost(token: string, postId: string, payload: { reason: string; note?: string }) {
  return requestJson<{ data: PetFeedReport }>(`/pet-feed/posts/${encodeURIComponent(postId)}/report`, {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function reportBreederProfile(token: string, profileId: string, payload: { reason: string; note?: string }) {
  return requestJson<{ data: PetFeedReport }>(`/pet-feed/breeders/${encodeURIComponent(profileId)}/report`, {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function blockBreederProfile(token: string, profileId: string) {
  await requestJson<null>(`/pet-feed/breeders/${encodeURIComponent(profileId)}/block`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export async function unblockBreederProfile(token: string, profileId: string) {
  await requestJson<null>(`/pet-feed/breeders/${encodeURIComponent(profileId)}/block`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export async function listAdminAccounts(token: string, search: string = '') {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return requestJson<{ data: AccountProfile[] }>(`/admin/accounts${qs}`, {
    headers: authHeaders(token),
  });
}

export async function createAdminAccount(token: string, payload: AdminCreateAccountPayload) {
  return requestJson<{ data: AccountProfile }>('/admin/accounts', {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function updateAdminAccount(token: string, userId: string, payload: AdminUpdateAccountPayload) {
  return requestJson<{ data: AccountProfile }>(`/admin/accounts/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function listAdminBreederProfiles(token: string, status: string = '') {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return requestJson<{ data: BreederProfile[] }>(`/admin/breeder-profiles${qs}`, {
    headers: authHeaders(token),
  });
}

export async function updateAdminBreederProfileStatus(token: string, userId: string, verificationStatus: string) {
  return requestJson<{ data: BreederProfile }>(`/admin/breeder-profiles/${encodeURIComponent(userId)}/status`, {
    method: 'PUT',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ verificationStatus }),
  });
}

export async function listAdminPetFeedPosts(token: string, status: string = 'pending_review') {
  return requestJson<{ data: PetFeedPost[] }>(`/admin/pet-feed/posts?status=${encodeURIComponent(status)}`, {
    headers: authHeaders(token),
  });
}

export async function updateAdminPetFeedPostStatus(token: string, postId: string, status: string) {
  return requestJson<{ data: PetFeedPost }>(`/admin/pet-feed/posts/${encodeURIComponent(postId)}/status`, {
    method: 'PUT',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
}

export async function listAdminPetFeedReports(token: string, status: string = 'open') {
  return requestJson<{ data: PetFeedReport[] }>(`/admin/pet-feed/reports?status=${encodeURIComponent(status)}`, {
    headers: authHeaders(token),
  });
}

export async function updateAdminPetFeedReportStatus(token: string, reportId: string, status: string) {
  return requestJson<{ data: PetFeedReport }>(`/admin/pet-feed/reports/${encodeURIComponent(reportId)}/status`, {
    method: 'PUT',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
}

export async function getAiCreditSummary(token: string) {
  return requestJson<{ data: { account: AiCreditAccount; config: AiEconomicsConfig } }>('/ai-credits/summary', {
    headers: authHeaders(token),
  });
}

export async function listAiCreditLedger(token: string) {
  return requestJson<{ data: Array<Record<string, unknown>> }>('/ai-credits/ledger', {
    headers: authHeaders(token),
  });
}

export async function claimRewardedAdCredit(token: string) {
  return requestJson<{ data: { grantedCredits: number; remainingToday: number; account: AiCreditAccount } }>(
    '/ai-credits/rewarded-ad',
    {
      method: 'POST',
      headers: authHeaders(token),
    },
  );
}

export async function listCoreCareRecords(token: string, petId: string, type?: string) {
  const qs = type ? `?type=${encodeURIComponent(type)}` : '';
  return requestJson<{ data: CoreCareRecord[]; summary: CoreCareSummary }>(
    `/core-care/pets/${encodeURIComponent(petId)}/records${qs}`,
    {
      headers: authHeaders(token),
    },
  );
}

export async function createCoreCareRecord(token: string, petId: string, payload: CreateCoreCareRecordPayload) {
  return requestJson<{ data: CoreCareRecord }>(`/core-care/pets/${encodeURIComponent(petId)}/records`, {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function updateCoreCareRecord(token: string, recordId: string, payload: Partial<CreateCoreCareRecordPayload>) {
  return requestJson<{ data: CoreCareRecord }>(`/core-care/records/${encodeURIComponent(recordId)}`, {
    method: 'PUT',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

/** Multipart upload → Supabase Storage; returns public `avatarUrl` for `createPet` / `updatePet`. */
export async function uploadPetAvatar(token: string, imageUri: string, mimeHint: string = 'image/jpeg') {
  const formData = new FormData();
  await appendImageFileToFormData(formData, 'image', imageUri, `avatar-${Date.now()}`, mimeHint);

  const response = await fetch(`${API_BASE_URL}/pets/upload-avatar`, {
    method: 'POST',
    headers: mergeHeaders(authHeaders(token)),
    body: formData,
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message = (body && typeof body === 'object' && 'error' in body && typeof (body as { error: string }).error === 'string')
      ? (body as { error: string }).error
      : `Upload failed (${response.status})`;
    throw new Error(message);
  }

  return body as { data: { avatarUrl: string } };
}

export async function requestBreedRecognition(
  token: string,
  params: { petId: string; slotUris: Record<string, string>; locale?: string },
): Promise<{ data: BreedRecognitionResult }> {
  const formData = new FormData();
  formData.append('petId', params.petId);
  if (params.locale?.trim()) {
    formData.append('locale', params.locale.trim().slice(0, 16));
  }
  for (const slot of BREED_RECOGNITION_SLOT_ORDER) {
    const uri = params.slotUris[slot]?.trim();
    if (uri) {
      await appendImageFileToFormData(formData, slot, uri, `breed-${slot}-${Date.now()}`, 'image/jpeg');
    }
  }

  const response = await fetch(`${API_BASE_URL}/breed-recognition`, {
    method: 'POST',
    headers: mergeHeaders(authHeaders(token)),
    body: formData,
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof (body as { error: string }).error === 'string'
        ? (body as { error: string }).error
        : `Request failed (${response.status})`;
    throw buildApiRequestError(response, body, message);
  }

  return body as { data: BreedRecognitionResult };
}

export async function listHistoryByPet(
  token: string,
  petId: string,
  options?: { displayLocale?: string },
) {
  const loc = options?.displayLocale?.trim();
  const qs = loc ? `?displayLocale=${encodeURIComponent(loc)}` : '';
  return requestJson<{ data: Analysis[] }>(`/analysis/${encodeURIComponent(petId)}${qs}`, {
    headers: authHeaders(token),
  });
}

export async function translateAnalysesDisplay(
  token: string,
  payload: { analysisIds: string[]; petId?: string; targetLocale?: string },
) {
  return requestJson<{ data: Analysis[] }>('/analysis/translate-display', {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      analysisIds: payload.analysisIds,
      petId: payload.petId,
      targetLocale: payload.targetLocale ?? 'vi',
    }),
  });
}

export type AnalyzeHealthCheckParams = {
  token: string;
  petId: string;
  /** First image = primary for storage + model; rest sent as `photos` (max 5 extras server-side). */
  imageUris: string[];
  videoUri?: string | null;
  weightKg?: string;
  vaccinated?: 'yes' | 'no' | '';
  vaccineType?: string;
  neutered?: 'yes' | 'no' | '';
  medicalHistory?: string;
  symptomDescription?: string;
  requestId?: string;
  onProgressStage?: (progress: {
    stage: 'uploading' | 'analyzing' | 'saving' | 'done' | 'failed';
    message?: string;
  }) => void;
  /** MIME hint for the first image only (e.g. image/png). */
  primaryMimeHint?: string;
  /** Matches app UI language (`en` | `vi`); Gemini returns readable fields in this language. */
  locale?: string;
};

type AnalysisProgressResponse = {
  data: {
    stage: 'analyzing' | 'saving' | 'done' | 'failed';
    status: 'processing' | 'done' | 'failed';
    updatedAt: number;
    message?: string;
  };
};

async function getAnalysisProgress(token: string, requestId: string) {
  return requestJson<AnalysisProgressResponse>(`/analysis/progress/${encodeURIComponent(requestId)}`, {
    headers: authHeaders(token),
  });
}

export class AnalyzeRequestError extends Error {
  status?: number;
  code?: string;
  retryAfterSeconds?: number;
  creditBalance?: number;
  creditCost?: number;
  monthlyResetAt?: string;
}

export async function analyzePetHealthCheck(params: AnalyzeHealthCheckParams): Promise<AnalyzeResponse> {
  const {
    token,
    petId,
    imageUris,
    videoUri,
    weightKg = '',
    vaccinated = '',
    vaccineType = '',
    neutered = '',
    medicalHistory = '',
    symptomDescription = '',
    requestId = '',
    onProgressStage,
    primaryMimeHint = 'image/jpeg',
    locale,
  } = params;

  if (!imageUris.length) {
    throw new Error('At least one photo is required');
  }

  const formData = new FormData();
  formData.append('petId', petId);
  formData.append('weightKg', weightKg);
  formData.append('vaccinated', vaccinated);
  formData.append('vaccineType', vaccineType);
  formData.append('neutered', neutered);
  formData.append('medicalHistory', medicalHistory);
  formData.append('symptomDescription', symptomDescription);
  const loc = locale?.trim();
  if (loc) {
    formData.append('locale', loc.slice(0, 16));
  }
  if (requestId.trim()) {
    formData.append('requestId', requestId.trim());
  }

  await appendImageFileToFormData(formData, 'image', imageUris[0], `pet-primary-${Date.now()}`, primaryMimeHint);
  for (let i = 1; i < imageUris.length; i++) {
    await appendImageFileToFormData(formData, 'photos', imageUris[i], `pet-extra-${i}-${Date.now()}`, 'image/jpeg');
  }

  const v = videoUri?.trim();
  if (v) {
    await appendVideoFileToFormData(formData, 'video', v, `pet-vid-${Date.now()}`, 'video/mp4');
  }

  onProgressStage?.({ stage: 'uploading' });
  const progressId = requestId.trim();
  let timer: ReturnType<typeof setInterval> | null = null;
  if (progressId) {
    timer = setInterval(() => {
      void getAnalysisProgress(token, progressId)
        .then((p) => {
          onProgressStage?.({ stage: p.data.stage, message: p.data.message });
        })
        .catch(() => {
          // Progress endpoint may briefly not exist yet; ignore and continue polling.
        });
    }, 900);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/analysis`, {
      method: 'POST',
      headers: mergeHeaders(authHeaders(token)),
      body: formData,
    });

    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await response.json() : null;

    if (!response.ok) {
      onProgressStage?.({ stage: 'failed', message: body?.error });
      const message = body?.error || `Analyze failed (${response.status})`;
      const err = new AnalyzeRequestError(message);
      err.status = response.status;
      if (body && typeof body === 'object') {
        if (typeof (body as { code?: unknown }).code === 'string') {
          err.code = (body as { code: string }).code;
        }
        if (typeof (body as { retryAfterSeconds?: unknown }).retryAfterSeconds === 'number') {
          err.retryAfterSeconds = (body as { retryAfterSeconds: number }).retryAfterSeconds;
        }
        if (typeof (body as { creditBalance?: unknown }).creditBalance === 'number') {
          err.creditBalance = (body as { creditBalance: number }).creditBalance;
        }
        if (typeof (body as { creditCost?: unknown }).creditCost === 'number') {
          err.creditCost = (body as { creditCost: number }).creditCost;
        }
        if (typeof (body as { monthlyResetAt?: unknown }).monthlyResetAt === 'string') {
          err.monthlyResetAt = (body as { monthlyResetAt: string }).monthlyResetAt;
        }
      }
      throw err;
    }

    onProgressStage?.({ stage: 'done' });
    return body as AnalyzeResponse;
  } catch (error) {
    if (!(error instanceof AnalyzeRequestError)) {
      onProgressStage?.({ stage: 'failed' });
    }
    throw error;
  } finally {
    if (timer) clearInterval(timer);
  }
}

/** Single-image analysis (backwards compatible with older clients). */
export async function analyzePetImage(token: string, petId: string, imageUri: string, mimeHint: string = 'image/jpeg') {
  return analyzePetHealthCheck({
    token,
    petId,
    imageUris: [imageUri],
    videoUri: null,
    weightKg: '',
    vaccinated: '',
    vaccineType: '',
    neutered: '',
    medicalHistory: '',
    symptomDescription: '',
    primaryMimeHint: mimeHint,
  });
}
