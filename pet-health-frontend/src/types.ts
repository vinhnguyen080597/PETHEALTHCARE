export type Severity = 'low' | 'medium' | 'high';

export type AuthPayload = {
  email: string;
  password: string;
};

export type AuthResponse = {
  user: {
    id: string;
    email: string;
  } | null;
  session: {
    access_token: string;
  } | null;
};

export type Pet = {
  id: string;
  user_id: string;
  name: string;
  species: string;
  breed: string | null;
  age: number | null;
  avatar_url: string | null;
  created_at: string;
};

export type CreatePetPayload = {
  name: string;
  species: string;
  breed?: string;
  age?: number;
  avatarUrl?: string;
};

/** Partial fields for PUT `/api/v1/pets/:petId` */
export type UpdatePetPayload = {
  name?: string;
  species?: string;
  breed?: string | null;
  age?: number | null;
  avatarUrl?: string | null;
};

export type Analysis = {
  id: string;
  user_id: string;
  pet_id: string;
  diagnosis: string;
  severity: Severity;
  symptoms: string[];
  treatment: string;
  confidence: number;
  disclaimer: string;
  image_url: string | null;
  created_at: string;
};

export type AnalyzeResponse = {
  data: Analysis;
  metadata: {
    fileType: string;
    fileSize: number;
  };
  warnings?: string[];
};
