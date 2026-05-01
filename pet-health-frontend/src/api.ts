import { API_BASE_URL, API_HEALTH_URL } from './config';
import type {
  Analysis,
  AnalyzeResponse,
  AuthPayload,
  AuthResponse,
  CreatePetPayload,
  Pet,
} from './types';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message = body?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return body as T;
}

export async function healthCheck() {
  const res = await fetch(API_HEALTH_URL);
  if (!res.ok) {
    throw new Error('Backend health check failed');
  }
  return res.json();
}

export async function signUp(payload: AuthPayload) {
  return request<{ data: AuthResponse }>('/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function login(payload: AuthPayload) {
  return request<{ data: AuthResponse }>('/auth/login', {
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
  return request<{ data: Pet[] }>('/pets', {
    headers: authHeaders(token),
  });
}

export async function createPet(token: string, payload: CreatePetPayload) {
  return request<{ data: Pet }>('/pets', {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function listHistoryByPet(token: string, petId: string) {
  return request<{ data: Analysis[] }>(`/analysis/${petId}`, {
    headers: authHeaders(token),
  });
}

export async function analyzePetImage(token: string, petId: string, imageUri: string) {
  const formData = new FormData();
  formData.append('petId', petId);
  formData.append('image', {
    uri: imageUri,
    name: `pet-${Date.now()}.jpg`,
    type: 'image/jpeg',
  } as any);

  return request<AnalyzeResponse>('/analysis', {
    method: 'POST',
    headers: authHeaders(token),
    body: formData,
  });
}
