import { Platform } from 'react-native';
import { API_BASE_URL, API_HEALTH_URL } from './config';
import type {
  Analysis,
  AnalyzeResponse,
  AuthPayload,
  AuthResponse,
  CreatePetPayload,
  Pet,
  UpdatePetPayload,
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

function parseErrorMessage(response: Response, body: unknown): string {
  if (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string') {
    return (body as { error: string }).error;
  }
  return `Request failed (${response.status})`;
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
    throw new Error(message);
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

export async function listHistoryByPet(token: string, petId: string) {
  return requestJson<{ data: Analysis[] }>(`/analysis/${encodeURIComponent(petId)}`, {
    headers: authHeaders(token),
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
  /** MIME hint for the first image only (e.g. image/png). */
  primaryMimeHint?: string;
};

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
    primaryMimeHint = 'image/jpeg',
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

  await appendImageFileToFormData(formData, 'image', imageUris[0], `pet-primary-${Date.now()}`, primaryMimeHint);
  for (let i = 1; i < imageUris.length; i++) {
    await appendImageFileToFormData(formData, 'photos', imageUris[i], `pet-extra-${i}-${Date.now()}`, 'image/jpeg');
  }

  const v = videoUri?.trim();
  if (v) {
    await appendVideoFileToFormData(formData, 'video', v, `pet-vid-${Date.now()}`, 'video/mp4');
  }

  const response = await fetch(`${API_BASE_URL}/analysis`, {
    method: 'POST',
    headers: mergeHeaders(authHeaders(token)),
    body: formData,
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message = body?.error || `Analyze failed (${response.status})`;
    throw new Error(message);
  }

  return body as AnalyzeResponse;
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
