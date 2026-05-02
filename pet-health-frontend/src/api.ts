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

function parseErrorMessage(response: Response, body: unknown): string {
  if (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string') {
    return (body as { error: string }).error;
  }
  return `Request failed (${response.status})`;
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
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
  const res = await fetch(API_HEALTH_URL);
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

export async function listHistoryByPet(token: string, petId: string) {
  return requestJson<{ data: Analysis[] }>(`/analysis/${encodeURIComponent(petId)}`, {
    headers: authHeaders(token),
  });
}

export async function analyzePetImage(token: string, petId: string, imageUri: string, mimeHint: string = 'image/jpeg') {
  const formData = new FormData();
  formData.append('petId', petId);
  formData.append('image', {
    uri: imageUri,
    name: `pet-${Date.now()}.jpg`,
    type: mimeHint,
  } as any);

  const response = await fetch(`${API_BASE_URL}/analysis`, {
    method: 'POST',
    headers: authHeaders(token),
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
