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
  gender?: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type CreatePetPayload = {
  name: string;
  species: string;
  breed?: string;
  age?: number;
  gender?: string;
  avatarUrl?: string;
};

/** Partial fields for PUT `/api/v1/pets/:petId` */
export type UpdatePetPayload = {
  name?: string;
  species?: string;
  breed?: string | null;
  age?: number | null;
  gender?: string | null;
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
  extra_image_urls?: string[] | null;
  video_url?: string | null;
  weight_kg?: number | null;
  vaccination_status?: string | null;
  vaccine_type?: string | null;
  neutering_status?: string | null;
  medical_history?: string | null;
  symptom_description?: string | null;
};

export type AnalyzeResponse = {
  data: Analysis;
  metadata: {
    fileType: string;
    fileSize: number;
  };
  warnings?: string[];
};
