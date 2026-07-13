export type Severity = 'low' | 'medium' | 'high';
export type AnalysisStatus = 'ok' | 'need_more_data' | 'not_pet_or_unclear' | 'emergency_flag';
export type AiHealthUrgency = 'self_monitor' | 'book_vet' | 'urgent_vet' | 'emergency_vet';
export type UserRole = 'sen' | 'breeder' | 'admin' | 'vet';
export type AccountStatus = 'active' | 'suspended';

export type AuthPayload = {
  email: string;
  password: string;
};

export type SignUpOtpRequestPayload = {
  email: string;
  password: string;
};

export type VerifySignUpOtpPayload = {
  email: string;
  otp: string;
  password: string;
};

export type SignUpOtpRequestResponse = {
  otpSent: boolean;
  email: string;
};

export type AccountProfile = {
  user_id: string;
  email: string | null;
  login_identifier: string;
  display_name: string;
  primary_role: UserRole;
  account_status: AccountStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
};

export type AppFeatureFlags = {
  breed_recognition: boolean;
  health_analysis: boolean;
  rewarded_ads: boolean;
  subscription: boolean;
  pet_feed_news: boolean;
  pet_feed_listings: boolean;
  pet_feed_breeders: boolean;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in?: number;
};

export type AuthResponse = {
  user: {
    id: string;
    email: string;
  } | null;
  session: AuthSession | null;
  account?: AccountProfile | null;
};

export type AiCreditAccount = {
  userId: string;
  planTier: string;
  creditBalance: number;
  featureTrialBalance?: Record<string, number>;
  monthlyAllowance: number;
  monthlyResetAt: string;
  updatedAt?: string;
};

export type AiEconomicsConfig = {
  freeMonthlyCredits: number;
  initialTrialCredits?: number;
  featureTrialCredits?: Record<string, number>;
  defaultPlanTier: string;
  rewardedAd?: {
    creditsPerAd: number;
    unlimited?: boolean;
  };
  iap?: {
    products: Array<{
      productId: string;
      type: 'subscription' | 'consumable';
      credits?: number;
      monthlyCredits?: number;
      planTier?: string;
      label: string;
    }>;
  };
  pricingExperiment?: {
    subscriptionTrial?: {
      monthlyCredits: number;
      priceVnd: number;
      label: string;
    };
  };
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

export type PetFeedPostStatus = 'draft' | 'pending_review' | 'published' | 'archived';
export type PostKind = 'listing' | 'announcement';
export type AnnouncementCategory = 'app_update' | 'health_tip' | 'community' | 'general';
export type BreederVerificationStatus = 'unverified' | 'pending_review' | 'verified' | 'rejected' | 'suspended';

export type BreederContact = {
  phone?: string;
  zalo?: string;
  facebook?: string;
};

export type BreederProfile = {
  id: string;
  user_id: string;
  display_name: string;
  bio: string;
  location: string;
  avatar_url: string | null;
  contact: BreederContact & Record<string, unknown>;
  primary_species: string[];
  main_breeds: string[];
  care_environment: string;
  verification_status: BreederVerificationStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
};

export type PetFeedPost = {
  id: string;
  user_id: string;
  breeder_profile_id: string | null;
  title: string;
  species: string;
  breed: string;
  gender: string;
  age_months: number | null;
  location: string;
  price_note: string;
  description: string;
  personality: string[];
  vaccine_status: string;
  deworming_status: string;
  paperwork: string[];
  media_urls: string[];
  video_url: string | null;
  contact: BreederContact & Record<string, unknown>;
  status: PetFeedPostStatus;
  post_kind?: PostKind;
  metadata: Record<string, unknown>;
  breeder_profile: BreederProfile | null;
  is_favorited: boolean;
  created_at: string;
  updated_at?: string;
};

export type PetFeedPostsPage = {
  data: PetFeedPost[];
  nextCursor: string | null;
};

export type PetFeedReport = {
  id: string;
  user_id: string;
  target_type: 'post' | 'breeder_profile';
  post_id: string | null;
  breeder_profile_id: string | null;
  breeder_profile?: BreederProfile | null;
  reason: string;
  note: string;
  status: 'open' | 'reviewed' | 'dismissed';
  created_at: string;
  updated_at?: string;
};

export type UpsertBreederProfilePayload = {
  displayName: string;
  bio?: string;
  location?: string;
  contact?: BreederContact;
  primarySpecies?: string[];
  mainBreeds?: string[];
  careEnvironment?: string;
  metadata?: Record<string, unknown>;
};

export type CreatePetFeedPostPayload = {
  title: string;
  species: string;
  breed?: string;
  gender?: string;
  ageMonths?: number | null;
  location?: string;
  priceNote?: string;
  description?: string;
  personality?: string[];
  vaccineStatus?: string;
  dewormingStatus?: string;
  paperwork?: string[];
  mediaUrls?: string[];
  videoUrl?: string | null;
  contact?: BreederContact;
  status?: PetFeedPostStatus;
};

export type CreatePetFeedPostMedia = {
  photoUris: string[];
  videoUri: string;
};

export type CreateAnnouncementPostPayload = {
  title: string;
  description: string;
  category: AnnouncementCategory;
  ctaLabel?: string;
  ctaUrl?: string;
};

export type CreateAnnouncementPostMedia = {
  photoUris: string[];
  videoUri?: string;
};

export type ManagedUser = {
  userId: string;
  displayName: string;
  role: UserRole;
};

export type AdminCreateAccountPayload = {
  email: string;
  password: string;
  displayName?: string;
  primaryRole: UserRole;
};

export type AdminUpdateAccountPayload = {
  displayName?: string;
  primaryRole?: UserRole;
  accountStatus?: AccountStatus;
};

export type Pet = {
  id: string;
  user_id: string;
  name: string;
  species: string;
  breed: string | null;
  age: number | null;
  birth_date?: string | null;
  gender?: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type CreatePetPayload = {
  name: string;
  species: string;
  breed?: string;
  age?: number;
  birthDate?: string;
  gender?: string;
  avatarUrl?: string;
};

/** Partial fields for PUT `/api/v1/pets/:petId` */
export type UpdatePetPayload = {
  name?: string;
  species?: string;
  breed?: string | null;
  age?: number | null;
  birthDate?: string | null;
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
  /** Present on paginated list rows when Vietnamese overlay already exists server-side. */
  has_vi_translation?: boolean;
  /** List endpoint omits full assessment/media; fetch `/analysis/item/:id` before Results. */
  list_incomplete?: boolean;
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
