export type Severity = 'low' | 'medium' | 'high';
export type AnalysisStatus = 'ok' | 'need_more_data' | 'not_pet_or_unclear' | 'emergency_flag';

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

/** POST /breed-recognition — preliminary breed / phenotype guess (supported species: cat, dog). */
export type BreedRecognitionResult = {
  primary_hypothesis: string;
  confidence: number;
  alternatives: { label: string; confidence: number }[];
  visible_clues: string[];
  missing_for_better_id: string[];
  notes_for_owner: string;
  disclaimer: string;
};

/** Cached UI translations for analyses (e.g. English rows shown in Vietnamese). */
export type AnalysisDisplayTranslations = {
  vi?: {
    diagnosis?: string;
    symptoms?: string[];
    treatment?: string;
    disclaimer?: string;
    red_flags?: string[];
    evidence?: string[];
    missing_data?: string[];
    diagnosis_candidates?: { name: string; confidence: number }[];
    next_action?: { summary?: string; ask_user_to_add?: string[] };
  };
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
  /** Language the model originally used for diagnosis/treatment strings (`en`, `vi`, …). */
  output_locale?: string | null;
  display_translations?: AnalysisDisplayTranslations | null;
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
  status?: AnalysisStatus;
  red_flags?: string[] | null;
  diagnosis_candidates?: { name: string; confidence: number }[] | null;
  evidence?: string[] | null;
  missing_data?: string[] | null;
  next_action?: {
    summary?: string;
    ask_user_to_add?: string[];
  } | null;
};

export type AnalyzeResponse = {
  data: Analysis;
  metadata: {
    fileType: string;
    fileSize: number;
  };
  warnings?: string[];
};
