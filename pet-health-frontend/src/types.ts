export type Severity = 'low' | 'medium' | 'high';
export type AnalysisStatus = 'ok' | 'need_more_data' | 'not_pet_or_unclear' | 'emergency_flag';
export type AiHealthUrgency = 'self_monitor' | 'book_vet' | 'urgent_vet' | 'emergency_vet';

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

export type AiCreditAccount = {
  userId: string;
  planTier: string;
  creditBalance: number;
  monthlyAllowance: number;
  monthlyResetAt: string;
  updatedAt?: string;
};

export type AiEconomicsConfig = {
  freeMonthlyCredits: number;
  initialTrialCredits?: number;
  defaultPlanTier: string;
  features: Record<
    string,
    {
      feature: string;
      creditCost: number;
      estimatedInputTokens: number;
      estimatedOutputTokens: number;
      estimatedCostUsd: number;
    }
  >;
};

export type CoreCareRecordType = 'diary' | 'vet_visit' | 'document' | 'reminder' | 'vaccine' | 'weight';

export type CoreCareRecord = {
  id: string;
  user_id: string;
  pet_id: string;
  type: CoreCareRecordType;
  title: string;
  note: string;
  occurred_at: string;
  due_at?: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
};

export type CoreCareSummary = {
  diary: number;
  vet_visit: number;
  document: number;
  reminder: number;
  vaccine: number;
  weight: number;
  pendingReminders: number;
  overdueReminders: number;
};

export type CreateCoreCareRecordPayload = {
  type: CoreCareRecordType;
  title: string;
  note?: string;
  occurredAt?: string;
  dueAt?: string | null;
  status?: string;
  metadata?: Record<string, unknown>;
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
  schema_version?: 'breed_recognition.v2';
  primary?: {
    breed_name: string;
    phenotype_label?: string;
    confidence: number;
    summary: string;
  };
  breed_profile?: {
    origin?: string;
    size?: string;
    coat?: string;
    temperament?: string[];
    activity_level?: 'low' | 'medium' | 'high';
    grooming_needs?: 'low' | 'medium' | 'high';
  };
  visual_evidence?: {
    trait?: string;
    observation: string;
    source_slot?: string;
  }[];
  care_overview?: {
    title: string;
    body: string;
  }[];
  sources?: {
    title: string;
    url: string;
  }[];
  primary_hypothesis: string;
  confidence: number;
  alternatives: { label: string; confidence: number; reason?: string }[];
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
    next_action?: { summary?: string; ask_user_to_add?: string[]; urgency?: AiHealthUrgency };
    assessment?: AiHealthAssessmentV1;
  };
};

export type AiHealthAssessmentV1 = {
  schema_version: 'health_assessment.v1';
  output_locale: 'en' | 'vi';
  status: AnalysisStatus;
  severity: Severity;
  confidence: number;
  possible_finding: string;
  observed_signs: string[];
  visual_evidence: string[];
  missing_data: string[];
  care_guidance: string;
  red_flags: string[];
  next_action: {
    urgency: AiHealthUrgency;
    summary: string;
    ask_user_to_add: string[];
  };
  candidates: {
    name: string;
    confidence: number;
    rationale?: string;
  }[];
  safety: {
    is_definitive_diagnosis: false;
    contains_medication_dosage: false;
    requires_vet_attention: boolean;
    disclaimer: string;
    policy_fallback?: boolean;
    reason?: string;
  };
};

export type Analysis = {
  id: string;
  user_id: string;
  pet_id: string;
  diagnosis: string;
  assessment?: AiHealthAssessmentV1 | null;
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
    urgency?: AiHealthUrgency;
  } | null;
  media?: {
    image_url: string | null;
    extra_image_urls: string[];
    video_url: string | null;
  };
  input_context?: {
    weight_kg: number | null;
    vaccination_status: 'yes' | 'no' | null;
    vaccine_type: string | null;
    neutering_status: 'yes' | 'no' | null;
    medical_history: string | null;
    symptom_description: string | null;
  };
};

export type AnalyzeResponse = {
  data: Analysis;
  metadata: {
    fileType: string;
    fileSize: number;
    file_type?: string;
    file_size?: number;
    extraPhotos?: number;
    extra_photos?: number;
    hasVideo?: boolean;
    has_video?: boolean;
    cached?: boolean;
    requestId?: string;
    request_id?: string;
  };
  warnings?: string[];
};
