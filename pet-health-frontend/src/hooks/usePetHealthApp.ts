import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { DEFAULT_PET_SPECIES } from '../constants/petSpecies';
import { RELEASE_MONETIZATION_ENABLED } from '../constants/releaseMonetization';
// v1 release: monetization disabled — re-enable imports when shipping ads + IAP.
// import { showRewardedAd } from '../services/rewardedAd';
// import { purchasePremiumSubscription } from '../services/iap';
import { birthDateToAgeMonths, isBirthDateInFuture, petBirthDateForForm } from '../utils/petAge';
import { debugCheck, debugLog } from '../utils/debugLog';
import {
  AnalyzeRequestError,
  ApiRequestError,
  analyzePetHealthCheck,
  blockBreederProfile,
  // claimRewardedAdCredit, // v1 release: rewarded ads disabled
  // verifyIapPurchase, // v1 release: IAP disabled
  createAdminAccount,
  createAdminUserPet,
  createAnnouncementPost,
  createCoreCareRecord,
  createAdminUserCoreCareRecord,
  createPetFeedPost,
  createPetFeedPostComment,
  deletePetFeedPostComment,
  createPet,
  cancelMyBreederVerificationRequest,
  deleteAdminUserCoreCareRecord,
  deleteMyAccount,
  getPetFeedPost,
  verifyAccountUpdateRequest,
  applyAccountUpdate,
  deletePet,
  favoritePetFeedPost,
  fetchFeatureFlags,
  getMe,
  getMyBreederProfile,
  getPet,
  healthCheck,
  getAiCreditSummary,
  listAdminPetFeedPosts,
  listAdminPetFeedReports,
  listAdminAccounts,
  listAdminBreederProfiles,
  listAdminUserAnalyses,
  listAdminUserCoreCareRecords,
  listAdminUserPets,
  listAnnouncementPosts,
  listHistoryByPet,
  getAnalysisById,
  listAiCreditLedger,
  listCoreCareRecords,
  getVaccinationDueSummary,
  listMyAnnouncementPosts,
  listMyPetFeedPosts,
  listPetFeedPostComments,
  listPetFeedPosts,
  listPets,
  listVerifiedBreederProfiles,
  reportBreederProfile,
  reportPetFeedComment,
  reportPetFeedPost,
  requestBreedRecognition,
  requestSignUpOtp,
  translateAnalysesDisplay,
  login,
  applyForgotPassword,
  requestPasswordRecovery,
  verifySignUpOtp,
  updateAdminUserCoreCareRecord,
  updateAdminUserPet,
  updateCoreCareRecord,
  updateAdminAccount,
  updateAdminFeatureFlags,
  updateAdminBreederProfileStatus,
  updateAdminPetFeedPostStatus,
  updateAdminPetFeedReportStatus,
  updateMyPetFeedDraft,
  updateMyPetFeedPost,
  updatePet,
  unfavoritePetFeedPost,
  upsertMyBreederProfile,
  uploadPetAvatar,
} from '../api';
import { preloadMaiOnboardingImages } from '../assets/maiOnboardingAssets';
import { preloadServicesOnboardingImages } from '../assets/servicesOnboardingAssets';
import { clearAppIconBadge, setAppIconBadgeCount } from '../services/appIconBadge';
import { PENDING_INITIAL_ONBOARDING_KEY } from '../constants/auth';
import { isBreedRecognitionSpecies, type BreedRecognitionSlot } from '../constants/petBreedRecognitionSlots';
import { normalizeAuthSession } from '../utils/authSession';
import {
  activateAuthSession,
  bindAuthSessionListener,
  clearAuthSession,
  ensureFreshAccessToken,
  getActiveAuthSession,
  hydrateAuthSessionFromStorage,
  teardownAuthSessionLifecycle,
} from '../utils/authSessionManager';
import type {
  AiCreditAccount,
  AiEconomicsConfig,
  Analysis,
  AccountProfile,
  AppFeatureFlags,
  AuthSession,
  AdminCreateAccountPayload,
  AdminUpdateAccountPayload,
  BreedRecognitionResult,
  CoreCareRecord,
  CoreCareSummary,
  CreateAnnouncementPostMedia,
  CreateAnnouncementPostPayload,
  CreateCoreCareRecordPayload,
  CreatePetFeedPostMedia,
  CreatePetFeedPostPayload,
  BreederProfile,
  ManagedUser,
  Pet,
  PetFeedPost,
  PetFeedComment,
  PetFeedReport,
  UpsertBreederProfilePayload,
  UserRole,
} from '../types';
import type { AppScreen } from '../screens/types';
import type { AnalysisProgressStage } from '../screens/AnalysisProgressScreen';
import i18n from '../i18n';
import { formatHealthCheckVaccineTypeForApi } from '../utils/formatHealthCheckVaccineType';
import {
  countVaccinationScheduleDue,
  totalVaccinationScheduleDue,
} from '../utils/vaccinationDueNotifications';
import {
  hasShownVaccinationDuePopupToday,
  markVaccinationDuePopupShownToday,
} from '../utils/vaccinationDuePopupStorage';
import { postsForBreeder } from '../utils/breederTrust';
import { getAnalyzeBlockReason, mapAnalyzeFriendlyMessage } from './usePetHealthApp.logic';

type BackendHealthStatus = 'checking' | 'online' | 'offline';
const PET_FEED_PAGE_SIZE = 12;
const HISTORY_PAGE_SIZE = 20;
const SIGNUP_OTP_LENGTH = 8;
const ACCOUNT_UPDATE_OTP_LENGTH = 8;
const SYNTHETIC_AUTH_EMAIL_PATTERN = /^login-[a-f0-9]{32}@/i;

export type AuthFieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

function mergePetFeedPosts(current: PetFeedPost[], incoming: PetFeedPost[]) {
  const byId = new Map(current.map((post) => [post.id, post]));
  const merged = [...current];
  incoming.forEach((post) => {
    const index = merged.findIndex((item) => item.id === post.id);
    if (index >= 0) {
      const existing = byId.get(post.id);
      merged[index] = existing ? { ...existing, ...post } : post;
      return;
    }
    merged.push(post);
  });
  return merged;
}

function parseRetryAfterSeconds(error: ApiRequestError): number {
  if (typeof error.retryAfterSeconds === 'number') return error.retryAfterSeconds;
  const fromMessage = /after (\d+) seconds?/i.exec(error.message);
  return fromMessage ? Number(fromMessage[1]) : 60;
}

function resolveSignUpOtpErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.code === 'otp_expired') return i18n.t('signupOtp.errors.otpExpired');
    if (error.code === 'otp_invalid' || error.code === 'invalid_otp') {
      return i18n.t('signupOtp.errors.otpInvalid');
    }
    if (error.code === 'over_email_send_rate_limit') {
      return i18n.t('signupOtp.errors.rateLimit', { seconds: parseRetryAfterSeconds(error) });
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return i18n.t('signupOtp.errors.generic');
}

function resolveAccountUpdateErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) {
      return i18n.t('account.updateAccount.errors.sessionExpired');
    }
    if (error.code === 'invalid_credentials') {
      return i18n.t('account.updateAccount.errors.wrongPassword');
    }
    if (error.message?.toLowerCase().includes('auth session missing')) {
      return i18n.t('common.somethingWentWrong');
    }
    if (error.code === 'otp_expired' || error.code === 'otp_invalid' || error.code === 'invalid_otp') {
      return i18n.t('account.updateAccount.errors.otpInvalidOrExpired');
    }
    if (error.code === 'EMAIL_ALREADY_REGISTERED') {
      return i18n.t('login.errors.emailAlreadyRegistered');
    }
    if (error.code === 'INVALID_EMAIL_FORMAT') {
      return i18n.t('login.errors.invalidEmailFormat');
    }
    if (error.code === 'EMAIL_UNCHANGED') {
      return i18n.t('account.updateAccount.emailUnchanged');
    }
    if (error.code === 'UPDATE_EMAIL_FIRST') {
      return i18n.t('account.updateAccount.updateEmailFirst');
    }
    if (error.code === 'PASSWORD_TOO_SHORT' || error.code === 'weak_password') {
      return i18n.t('login.fieldErrors.passwordTooShort');
    }
    if (error.code === 'over_email_send_rate_limit') {
      return i18n.t('signupOtp.errors.rateLimit', { seconds: parseRetryAfterSeconds(error) });
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return i18n.t('common.unknownError');
}

function resolveAuthErrorMessage(error: unknown, isSignUp: boolean): string {
  if (error instanceof ApiRequestError) {
    if (!isSignUp) {
      if (error.status === 503) {
        return i18n.t('login.errors.signInFailed');
      }
      if (error.code === 'SIGNUP_OTP_PENDING') {
        return i18n.t('login.errors.signupOtpPending');
      }
      return i18n.t('login.errors.invalidCredentials');
    }
    if (error.code === 'over_email_send_rate_limit') {
      return i18n.t('login.errors.signUpRateLimit', { seconds: parseRetryAfterSeconds(error) });
    }
    if (error.code === 'EMAIL_ALREADY_REGISTERED') {
      return i18n.t('login.errors.emailAlreadyRegistered');
    }
    if (error.code === 'INVALID_EMAIL_FORMAT') {
      return i18n.t('login.errors.invalidEmailFormat');
    }
    if (error.code === 'invalid_credentials') {
      return i18n.t('login.errors.invalidCredentials');
    }
    if (error.code === 'weak_password' || error.code === 'PASSWORD_TOO_SHORT') {
      return i18n.t('login.errors.weakPassword');
    }
    if (error.code === 'INVALID_AUTH_IDENTIFIER') {
      return i18n.t('login.errors.invalidEmailFormat');
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return isSignUp ? i18n.t('login.errors.signUpFailed') : i18n.t('login.errors.invalidCredentials');
}

export function usePetHealthApp() {
  const [screen, setScreen] = useState<AppScreen>('login');
  /** True until stored session is checked on cold start — avoids flashing the login screen. */
  const [sessionBootstrapping, setSessionBootstrapping] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [backendHealth, setBackendHealth] = useState<BackendHealthStatus>('checking');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authFieldErrors, setAuthFieldErrors] = useState<AuthFieldErrors>({});
  const [signUpOtp, setSignUpOtp] = useState('');
  const [signUpOtpError, setSignUpOtpError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [pendingSignUpEmail, setPendingSignUpEmail] = useState('');
  const [pendingSignUpPassword, setPendingSignUpPassword] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('');
  const [forgotPasswordFieldErrors, setForgotPasswordFieldErrors] = useState<{ email?: string }>({});
  const [forgotPasswordOtpOpen, setForgotPasswordOtpOpen] = useState(false);
  const [forgotPasswordPendingEmail, setForgotPasswordPendingEmail] = useState('');
  const [forgotPasswordOtp, setForgotPasswordOtp] = useState('');
  const [forgotPasswordNewPassword, setForgotPasswordNewPassword] = useState('');
  const [forgotPasswordConfirmPassword, setForgotPasswordConfirmPassword] = useState('');
  const [forgotPasswordOtpError, setForgotPasswordOtpError] = useState('');
  const [forgotPasswordOtpLoading, setForgotPasswordOtpLoading] = useState(false);
  const [forgotPasswordRateLimitUntilMs, setForgotPasswordRateLimitUntilMs] = useState(0);
  const [forgotPasswordRateLimitSeconds, setForgotPasswordRateLimitSeconds] = useState(0);
  const [forgotPasswordRecoverFieldErrors, setForgotPasswordRecoverFieldErrors] = useState<{
    otp?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [updateAccountNewLogin, setUpdateAccountNewLogin] = useState('');
  const [updateAccountChangeLoginError, setUpdateAccountChangeLoginError] = useState('');
  const [updateAccountChangeLoginFieldErrors, setUpdateAccountChangeLoginFieldErrors] = useState<{
    newEmail?: string;
    currentPassword?: string;
  }>({});
  const [updateAccountChangeLoginSuccess, setUpdateAccountChangeLoginSuccess] = useState('');
  const [updateAccountEmailChangePassword, setUpdateAccountEmailChangePassword] = useState('');
  const [updateAccountEmailOtpOpen, setUpdateAccountEmailOtpOpen] = useState(false);
  const [updateAccountPendingNewEmail, setUpdateAccountPendingNewEmail] = useState('');
  const [updateAccountEmailOtp, setUpdateAccountEmailOtp] = useState('');
  const [updateAccountEmailOtpError, setUpdateAccountEmailOtpError] = useState('');
  const [updateAccountEmailOtpLoading, setUpdateAccountEmailOtpLoading] = useState(false);
  const [updateAccountCurrentPassword, setUpdateAccountCurrentPassword] = useState('');
  const [updateAccountNewPassword, setUpdateAccountNewPassword] = useState('');
  const [updateAccountConfirmNewPassword, setUpdateAccountConfirmNewPassword] = useState('');
  const [updateAccountPasswordError, setUpdateAccountPasswordError] = useState('');
  const [updateAccountPasswordSuccess, setUpdateAccountPasswordSuccess] = useState('');
  const [updateAccountPasswordFieldErrors, setUpdateAccountPasswordFieldErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [updateAccountRecoverError, setUpdateAccountRecoverError] = useState('');
  const [updateAccountRecoverSuccess, setUpdateAccountRecoverSuccess] = useState('');
  const [updateAccountRecoverOtpOpen, setUpdateAccountRecoverOtpOpen] = useState(false);
  const [updateAccountRecoverPendingEmail, setUpdateAccountRecoverPendingEmail] = useState('');
  const [updateAccountRecoverOtp, setUpdateAccountRecoverOtp] = useState('');
  const [updateAccountRecoverNewPassword, setUpdateAccountRecoverNewPassword] = useState('');
  const [updateAccountRecoverConfirmPassword, setUpdateAccountRecoverConfirmPassword] = useState('');
  const [updateAccountRecoverOtpError, setUpdateAccountRecoverOtpError] = useState('');
  const [updateAccountRecoverOtpLoading, setUpdateAccountRecoverOtpLoading] = useState(false);
  const [updateAccountRecoverFieldErrors, setUpdateAccountRecoverFieldErrors] = useState<{
    otp?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [token, setToken] = useState<string | null>(null);
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  /** True during first-run flow until user skips health or taps Finish on results. */
  const [initialOnboarding, setInitialOnboarding] = useState(false);

  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);

  const [petName, setPetName] = useState('');
  const [petSpecies, setPetSpecies] = useState<string>(DEFAULT_PET_SPECIES);
  const [petBreed, setPetBreed] = useState('');
  const [petBirthDate, setPetBirthDate] = useState('');
  const [petGender, setPetGender] = useState('');
  const [petAvatarUrl, setPetAvatarUrl] = useState('');
  const [petAvatarStorageUrl, setPetAvatarStorageUrl] = useState('');

  /** Health check intake (Figma) — only first photo is sent to the analysis API today. */
  const [healthCheckPhotos, setHealthCheckPhotos] = useState<string[]>([]);
  const [healthCheckVideoUri, setHealthCheckVideoUri] = useState<string | null>(null);
  const [healthCheckWeightKg, setHealthCheckWeightKg] = useState('');
  const [healthCheckVaccinated, _setHealthCheckVaccinated] = useState<'yes' | 'no'>('yes');
  const [healthCheckVaccineIds, setHealthCheckVaccineIds] = useState<string[]>([]);
  const [healthCheckVaccineOther, setHealthCheckVaccineOther] = useState('');
  const setHealthCheckVaccinated = useCallback((v: 'yes' | 'no') => {
    _setHealthCheckVaccinated(v);
    if (v === 'no') {
      setHealthCheckVaccineIds([]);
      setHealthCheckVaccineOther('');
    }
  }, []);
  const [healthCheckNeutered, setHealthCheckNeutered] = useState<'yes' | 'no'>('no');
  const [healthCheckMedicalHistory, setHealthCheckMedicalHistory] = useState('');
  const [healthCheckSymptoms, setHealthCheckSymptoms] = useState('');

  const [currentResult, setCurrentResult] = useState<Analysis | null>(null);
  const [resultImageUri, setResultImageUri] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [history, setHistory] = useState<Analysis[]>([]);
  const [historyNextCursor, setHistoryNextCursor] = useState<string | null>(null);
  const [historyTotalCount, setHistoryTotalCount] = useState<number | null>(null);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [aiCredits, setAiCredits] = useState<AiCreditAccount | null>(null);
  const [aiEconomicsConfig, setAiEconomicsConfig] = useState<AiEconomicsConfig | null>(null);
  const [appFeatureFlags, setAppFeatureFlags] = useState<AppFeatureFlags | null>(null);
  const [featureFlagsLoading, setFeatureFlagsLoading] = useState(false);
  const [featureFlagSavingKey, setFeatureFlagSavingKey] = useState<keyof AppFeatureFlags | null>(null);
  const [creditLedger, setCreditLedger] = useState<Array<Record<string, unknown>>>([]);
  const [coreCareRecords, setCoreCareRecords] = useState<CoreCareRecord[]>([]);
  const [coreCareSummary, setCoreCareSummary] = useState<CoreCareSummary | null>(null);
  const [petVaccinationDueCounts, setPetVaccinationDueCounts] = useState<Record<string, number>>({});
  const [vaccinationDuePopupVisible, setVaccinationDuePopupVisible] = useState(false);
  const vaccinationDuePopupOfferedRef = useRef(false);
  const [petFeedPosts, setPetFeedPosts] = useState<PetFeedPost[]>([]);
  const [topBreederProfiles, setTopBreederProfiles] = useState<BreederProfile[]>([]);
  const [petFeedInitialLoading, setPetFeedInitialLoading] = useState(false);
  const [petFeedInitialError, setPetFeedInitialError] = useState('');
  const [petFeedLoadingMore, setPetFeedLoadingMore] = useState(false);
  const [petFeedNextCursor, setPetFeedNextCursor] = useState<string | null>(null);
  const [petFeedLoadMoreError, setPetFeedLoadMoreError] = useState('');
  const [announcementPosts, setAnnouncementPosts] = useState<PetFeedPost[]>([]);
  const [announcementInitialLoading, setAnnouncementInitialLoading] = useState(false);
  const [announcementInitialError, setAnnouncementInitialError] = useState('');
  const [announcementLoadingMore, setAnnouncementLoadingMore] = useState(false);
  const [announcementNextCursor, setAnnouncementNextCursor] = useState<string | null>(null);
  const [announcementLoadMoreError, setAnnouncementLoadMoreError] = useState('');
  const [myPetFeedPosts, setMyPetFeedPosts] = useState<PetFeedPost[]>([]);
  const [managedUser, setManagedUser] = useState<ManagedUser | null>(null);
  const [adminSelectedAccount, setAdminSelectedAccount] = useState<AccountProfile | null>(null);
  const [adminUserPets, setAdminUserPets] = useState<Pet[]>([]);
  const [adminUserPetsLoading, setAdminUserPetsLoading] = useState(false);
  const [adminAddPetForUserId, setAdminAddPetForUserId] = useState<string | null>(null);
  const [breederProfile, setBreederProfile] = useState<BreederProfile | null>(null);
  const [selectedBreederProfileId, setSelectedBreederProfileId] = useState<string | null>(null);
  const [adminAccounts, setAdminAccounts] = useState<AccountProfile[]>([]);
  const [adminBreederProfiles, setAdminBreederProfiles] = useState<BreederProfile[]>([]);
  const [adminFeedPosts, setAdminFeedPosts] = useState<PetFeedPost[]>([]);
  const [adminFeedReports, setAdminFeedReports] = useState<PetFeedReport[]>([]);
  /** After saving pet form opened from profile, return to pet profile instead of home. */
  const [petFormReturnToProfile, setPetFormReturnToProfile] = useState(false);
  /** Return target after leaving create-pet-feed-post (Account vs registration form). */
  const [createPetFeedReturnScreen, setCreatePetFeedReturnScreen] = useState<AppScreen>('account');
  const [editingPetFeedPost, setEditingPetFeedPost] = useState<PetFeedPost | null>(null);
  /** Where to go when closing the results screen opened from history vs profile vs default home. */
  const [resultsReturnScreen, setResultsReturnScreen] = useState<'home' | 'history' | 'pet-profile' | null>(
    null,
  );
  /** Health check opened from pet profile — back / results return to profile, not home. */
  const [healthCheckReturnToProfile, setHealthCheckReturnToProfile] = useState(false);
  const [analysisProgressStage, setAnalysisProgressStage] = useState<AnalysisProgressStage>('uploading');
  const [analysisProgressMessage, setAnalysisProgressMessage] = useState('');
  const [healthCheckInlineError, setHealthCheckInlineError] = useState('');
  const [analysisCooldownUntilMs, setAnalysisCooldownUntilMs] = useState(0);
  const [analysisCooldownSeconds, setAnalysisCooldownSeconds] = useState(0);
  const [analysisSubmitting, setAnalysisSubmitting] = useState(false);
  const [breedRecognitionSlotUris, setBreedRecognitionSlotUris] = useState<Record<string, string>>({});
  const [breedRecognitionResult, setBreedRecognitionResult] = useState<BreedRecognitionResult | null>(null);
  const [breedRecognitionLoading, setBreedRecognitionLoading] = useState(false);
  const [breedRecognitionReturnScreen, setBreedRecognitionReturnScreen] = useState<
    'health-check' | 'onboarding-health-check' | 'onboarding-health-prompt' | 'pet-profile' | null
  >(null);
  const selectedPet = useMemo(() => pets.find((pet) => pet.id === selectedPetId) ?? null, [pets, selectedPetId]);
  const selectedBreederPosts = useMemo(
    () => selectedBreederProfileId ? postsForBreeder(petFeedPosts, selectedBreederProfileId) : [],
    [petFeedPosts, selectedBreederProfileId],
  );
  const selectedBreederProfile = selectedBreederPosts[0]?.breeder_profile
    ?? topBreederProfiles.find((profile) => profile.id === selectedBreederProfileId || profile.user_id === selectedBreederProfileId)
    ?? null;

  const petFormMode = editingPetId ? 'edit' : 'create';

  function clearPetForm() {
    setPetName('');
    setPetSpecies(DEFAULT_PET_SPECIES);
    setPetBreed('');
    setPetBirthDate('');
    setPetGender('');
    setPetAvatarUrl('');
    setPetAvatarStorageUrl('');
    setEditingPetId(null);
  }

  function petPayloadFromBirthDate(birthDate: string) {
    const trimmed = birthDate.trim();
    if (!trimmed) return {};
    return {
      birthDate: trimmed,
      age: birthDateToAgeMonths(trimmed),
    };
  }

  function clearHealthCheckForm() {
    setHealthCheckPhotos([]);
    setHealthCheckVideoUri(null);
    setHealthCheckWeightKg('');
    setHealthCheckVaccinated('yes');
    setHealthCheckVaccineIds([]);
    setHealthCheckVaccineOther('');
    setHealthCheckNeutered('no');
    setHealthCheckMedicalHistory('');
    setHealthCheckSymptoms('');
  }

  const fetchPets = useCallback(async (accessToken: string, targetUserId?: string | null): Promise<Pet[]> => {
    const effectiveUserId = targetUserId ?? managedUser?.userId ?? null;
    const response = effectiveUserId
      ? await listAdminUserPets(accessToken, effectiveUserId)
      : await listPets(accessToken);
    setPets(response.data);
    if (response.data.length > 0) {
      setSelectedPetId((previous) => previous ?? response.data[0].id);
    } else {
      setSelectedPetId(null);
    }
    return response.data;
  }, [managedUser?.userId]);

  const refreshAiCredits = useCallback(async (accessToken: string) => {
    try {
      const [summary, ledger] = await Promise.all([
        getAiCreditSummary(accessToken),
        listAiCreditLedger(accessToken, { limit: 20 }),
      ]);
      setAiCredits(summary.data.account);
      setAiEconomicsConfig(summary.data.config);
      setCreditLedger(ledger.data);
    } catch {
      // Credits are advisory in the UI; backend remains the source of truth.
    }
  }, []);

  const fetchAccountProfile = useCallback(async (accessToken: string) => {
    const response = await getMe(accessToken);
    setAccountProfile(response.data);
    return response.data;
  }, []);

  const offerVaccinationDuePopupIfNeeded = useCallback(
    async (counts: Record<string, number>, userId?: string | null) => {
      if (vaccinationDuePopupOfferedRef.current) return;
      if (totalVaccinationScheduleDue(counts) <= 0) return;

      const effectiveUserId = userId ?? managedUser?.userId ?? accountProfile?.user_id ?? null;
      if (!effectiveUserId) return;

      try {
        if (await hasShownVaccinationDuePopupToday(effectiveUserId)) {
          vaccinationDuePopupOfferedRef.current = true;
          return;
        }
      } catch {
        // If storage read fails, still offer once this session.
      }

      vaccinationDuePopupOfferedRef.current = true;
      setVaccinationDuePopupVisible(true);
      void markVaccinationDuePopupShownToday(effectiveUserId);
    },
    [accountProfile?.user_id, managedUser?.userId],
  );

  const dismissVaccinationDuePopup = useCallback(() => {
    setVaccinationDuePopupVisible(false);
    const userId = managedUser?.userId ?? accountProfile?.user_id ?? null;
    if (userId) {
      void markVaccinationDuePopupShownToday(userId);
    }
  }, [accountProfile?.user_id, managedUser?.userId]);

  const refreshVaccinationDueCounts = useCallback(
    async (petsToCheck?: Pet[], accessToken?: string | null, userId?: string | null) => {
      // Prefer explicit token — state `token` is still null right after setToken() on login.
      const effectiveToken = accessToken ?? token;
      if (!effectiveToken) return;
      const targetPets = petsToCheck ?? pets;
      if (targetPets.length === 0) {
        setPetVaccinationDueCounts({});
        await clearAppIconBadge();
        return;
      }

      const effectiveUserId = userId ?? managedUser?.userId ?? accountProfile?.user_id ?? null;

      try {
        if (!managedUser) {
          const response = await getVaccinationDueSummary(effectiveToken);
          const counts: Record<string, number> = {};
          for (const pet of targetPets) {
            counts[pet.id] = response.data[pet.id] ?? 0;
          }
          setPetVaccinationDueCounts(counts);
          void offerVaccinationDuePopupIfNeeded(counts, effectiveUserId);
          await setAppIconBadgeCount(totalVaccinationScheduleDue(counts));
          return;
        }

        const responses = await Promise.all(
          targetPets.map(async (pet) => {
            const response = await listAdminUserCoreCareRecords(effectiveToken, managedUser.userId, pet.id);
            return { petId: pet.id, records: response.data };
          }),
        );
        const counts = Object.fromEntries(
          responses.map(({ petId, records }) => [petId, countVaccinationScheduleDue(records)]),
        );
        setPetVaccinationDueCounts(counts);
        void offerVaccinationDuePopupIfNeeded(counts, effectiveUserId);
        await setAppIconBadgeCount(totalVaccinationScheduleDue(counts));
      } catch {
        // Keep the last known counts when a background refresh fails.
      }
    },
    [accountProfile?.user_id, managedUser, offerVaccinationDuePopupIfNeeded, pets, token],
  );

  const refreshCoreCare = useCallback(
    async (petId: string = selectedPetId ?? '') => {
      if (!token || !petId) return;
      const response = managedUser
        ? await listAdminUserCoreCareRecords(token, managedUser.userId, petId)
        : await listCoreCareRecords(token, petId);
      setCoreCareRecords(response.data);
      setCoreCareSummary(response.summary);
      const count = countVaccinationScheduleDue(response.data);
      setPetVaccinationDueCounts((previous) => {
        const next = { ...previous, [petId]: count };
        void setAppIconBadgeCount(totalVaccinationScheduleDue(next));
        return next;
      });
    },
    [managedUser, selectedPetId, token],
  );

  const refreshPets = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      const nextPets = await fetchPets(token);
      void refreshVaccinationDueCounts(nextPets);
    } finally {
      setRefreshing(false);
    }
  }, [token, fetchPets, refreshVaccinationDueCounts]);

  const loadPetFeedFirstPage = useCallback(async (
    accessToken: string,
    options: { showFeedInitialLoading?: boolean; showAnnouncementInitialLoading?: boolean } = {},
  ) => {
    if (options.showFeedInitialLoading) setPetFeedInitialLoading(true);
    if (options.showAnnouncementInitialLoading) setAnnouncementInitialLoading(true);
    setPetFeedInitialError('');
    setAnnouncementInitialError('');
    setPetFeedLoadMoreError('');
    try {
      const [postsResponse, announcementsResponse, breedersResponse] = await Promise.all([
        listPetFeedPosts(accessToken, { limit: PET_FEED_PAGE_SIZE, kind: 'listing' }),
        listAnnouncementPosts(accessToken, { limit: PET_FEED_PAGE_SIZE }),
        listVerifiedBreederProfiles(accessToken),
      ]);
      setPetFeedPosts(postsResponse.data);
      setPetFeedNextCursor(postsResponse.nextCursor ?? null);
      setAnnouncementPosts(announcementsResponse.data);
      setAnnouncementNextCursor(announcementsResponse.nextCursor ?? null);
      setTopBreederProfiles(breedersResponse.data);
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      if (options.showFeedInitialLoading) setPetFeedInitialError(message);
      if (options.showAnnouncementInitialLoading) setAnnouncementInitialError(message);
      return false;
    } finally {
      if (options.showFeedInitialLoading) setPetFeedInitialLoading(false);
      if (options.showAnnouncementInitialLoading) setAnnouncementInitialLoading(false);
    }
  }, []);

  const refreshPetFeed = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      await loadPetFeedFirstPage(token);
    } finally {
      setRefreshing(false);
    }
  }, [loadPetFeedFirstPage, token]);

  const loadMorePetFeed = useCallback(async () => {
    if (!token || petFeedLoadingMore || !petFeedNextCursor) return;
    setPetFeedLoadingMore(true);
    setPetFeedLoadMoreError('');
    try {
      const response = await listPetFeedPosts(token, { limit: PET_FEED_PAGE_SIZE, cursor: petFeedNextCursor });
      setPetFeedPosts((current) => mergePetFeedPosts(current, response.data));
      setPetFeedNextCursor(response.nextCursor ?? null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      setPetFeedLoadMoreError(message);
    } finally {
      setPetFeedLoadingMore(false);
    }
  }, [petFeedLoadingMore, petFeedNextCursor, token]);

  const loadMoreAnnouncements = useCallback(async () => {
    if (!token || announcementLoadingMore || !announcementNextCursor) return;
    setAnnouncementLoadingMore(true);
    setAnnouncementLoadMoreError('');
    try {
      const response = await listAnnouncementPosts(token, { limit: PET_FEED_PAGE_SIZE, cursor: announcementNextCursor });
      setAnnouncementPosts((current) => mergePetFeedPosts(current, response.data));
      setAnnouncementNextCursor(response.nextCursor ?? null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      setAnnouncementLoadMoreError(message);
    } finally {
      setAnnouncementLoadingMore(false);
    }
  }, [announcementLoadingMore, announcementNextCursor, token]);

  /** History rows merged for current UI language; English-only archives get one-time Gemini translation via API. */
  const fetchPetHistoryMerged = useCallback(
    async (
      petId: string,
      options?: { cursor?: string | null; append?: boolean },
    ): Promise<{ data: Analysis[]; nextCursor: string | null; totalCount: number | null }> => {
      if (!token) return { data: [], nextCursor: null, totalCount: null };
      const wantVi = Boolean(i18n.language?.startsWith('vi'));
      const locale = wantVi ? 'vi' : undefined;
      const res = managedUser
        ? await listAdminUserAnalyses(token, managedUser.userId, petId, {
            displayLocale: locale,
            limit: HISTORY_PAGE_SIZE,
            cursor: options?.cursor ?? null,
            view: 'list',
          })
        : await listHistoryByPet(token, petId, {
            displayLocale: locale,
            limit: HISTORY_PAGE_SIZE,
            cursor: options?.cursor ?? null,
            view: 'list',
          });
      let rows = res.data;
      if (wantVi) {
        const pending = rows.filter((a) => {
          const ol = String(a.output_locale ?? '').toLowerCase();
          if (ol.startsWith('vi')) return false;
          if (a.has_vi_translation) return false;
          return !(a.display_translations?.vi && typeof a.display_translations.vi === 'object');
        });

        if (pending.length > 0) {
          try {
            const tr = await translateAnalysesDisplay(token, {
              analysisIds: pending.map((p) => p.id),
              petId,
              targetLocale: 'vi',
            });
            const merged = new Map(tr.data.map((r) => [r.id, r]));
            rows = rows.map((h) => {
              const full = merged.get(h.id);
              if (!full) return h;
              // Keep list card fields; mark incomplete so detail still fetches full row.
              return {
                ...h,
                diagnosis: full.diagnosis ?? h.diagnosis,
                severity: full.severity ?? h.severity,
                confidence: full.confidence ?? h.confidence,
                assessment: full.assessment
                  ? {
                      ...(h.assessment ?? {}),
                      ...full.assessment,
                      possible_finding: full.assessment.possible_finding ?? h.assessment?.possible_finding,
                      severity: full.assessment.severity ?? h.assessment?.severity,
                      confidence: full.assessment.confidence ?? h.assessment?.confidence,
                      safety: full.assessment.safety ?? h.assessment?.safety,
                    }
                  : h.assessment,
                has_vi_translation: true,
                list_incomplete: true,
              } as Analysis;
            });
            void refreshAiCredits(token);
          } catch {
            /* offline or translate failure — leave English snippets */
          }
        }
      }

      return {
        data: rows,
        nextCursor: res.nextCursor ?? null,
        totalCount: res.totalCount ?? null,
      };
    },
    [managedUser, token, i18n.language, refreshAiCredits],
  );

  const loadMorePetHistory = useCallback(async () => {
    if (!token || !selectedPetId || historyLoadingMore || !historyNextCursor) return;
    setHistoryLoadingMore(true);
    try {
      const page = await fetchPetHistoryMerged(selectedPetId, { cursor: historyNextCursor, append: true });
      setHistory((current) => {
        const seen = new Set(current.map((row) => row.id));
        return [...current, ...page.data.filter((row) => !seen.has(row.id))];
      });
      setHistoryNextCursor(page.nextCursor);
      if (page.totalCount != null) setHistoryTotalCount(page.totalCount);
    } catch {
      // Keep existing history when pagination fails.
    } finally {
      setHistoryLoadingMore(false);
    }
  }, [token, selectedPetId, historyLoadingMore, historyNextCursor, fetchPetHistoryMerged]);

  const applyHistoryPage = useCallback((page: { data: Analysis[]; nextCursor: string | null; totalCount: number | null }) => {
    setHistory(page.data);
    setHistoryNextCursor(page.nextCursor);
    setHistoryTotalCount(page.totalCount);
  }, []);

  const hadActiveSessionRef = useRef(false);
  const adminReviewLoadedRef = useRef(false);
  const adminReviewInFlightRef = useRef<Promise<void> | null>(null);
  const adminReviewLoadGenRef = useRef(0);

  useEffect(() => {
    bindAuthSessionListener((session) => {
      setToken(session?.access_token ?? null);
      if (hadActiveSessionRef.current && !session) {
        setScreen('login');
      }
      hadActiveSessionRef.current = Boolean(session);
    });
    return () => {
      bindAuthSessionListener(null);
      teardownAuthSessionLifecycle();
    };
  }, []);

  useEffect(() => {
    void initializeApp();
  }, []);

  useEffect(() => {
    if (!analysisCooldownUntilMs || analysisCooldownUntilMs <= Date.now()) {
      setAnalysisCooldownSeconds(0);
      return;
    }
    const tick = () => {
      const remain = Math.max(0, Math.ceil((analysisCooldownUntilMs - Date.now()) / 1000));
      setAnalysisCooldownSeconds(remain);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [analysisCooldownUntilMs]);

  useEffect(() => {
    if (!token) return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refreshVaccinationDueCounts();
      }
    });
    return () => subscription.remove();
  }, [token, refreshVaccinationDueCounts]);

  // Backfill due badges if Home opens before login-time refresh finished (stale token race).
  useEffect(() => {
    if (screen !== 'home' || !token || pets.length === 0) return;
    const missing = pets.some((pet) => !(pet.id in petVaccinationDueCounts));
    if (!missing) return;
    void refreshVaccinationDueCounts(pets, token);
  }, [screen, token, pets, petVaccinationDueCounts, refreshVaccinationDueCounts]);

  // Admin Home needs review catalogs, but never block cold start / first paint on them.
  useEffect(() => {
    if (!token || managedUser) return;
    if (accountProfile?.primary_role !== 'admin') return;
    if (screen !== 'home' && screen !== 'admin-review' && screen !== 'admin-hub') return;
    void ensureAdminReviewLoaded(token);
  }, [screen, token, accountProfile?.primary_role, managedUser]);

  useEffect(() => {
    if (!forgotPasswordRateLimitUntilMs || forgotPasswordRateLimitUntilMs <= Date.now()) {
      setForgotPasswordRateLimitSeconds(0);
      return;
    }
    const tick = () => {
      const remain = Math.max(0, Math.ceil((forgotPasswordRateLimitUntilMs - Date.now()) / 1000));
      setForgotPasswordRateLimitSeconds(remain);
      if (remain > 0) {
        setForgotPasswordError(i18n.t('login.forgotPasswordRateLimit', { seconds: remain }));
      } else {
        setForgotPasswordError('');
        setForgotPasswordRateLimitUntilMs(0);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [forgotPasswordRateLimitUntilMs]);

  async function clearInvalidSession() {
    await clearAuthSession();
    await AsyncStorage.removeItem(PENDING_INITIAL_ONBOARDING_KEY);
    setToken(null);
    setInitialOnboarding(false);
    vaccinationDuePopupOfferedRef.current = false;
    setVaccinationDuePopupVisible(false);
    setScreen('login');
  }

  async function loadFeatureFlags(accessToken: string) {
    setFeatureFlagsLoading(true);
    try {
      const res = await fetchFeatureFlags(accessToken);
      setAppFeatureFlags(res.data);
    } catch {
      setAppFeatureFlags({
        breed_recognition: true,
        health_analysis: true,
        rewarded_ads: RELEASE_MONETIZATION_ENABLED,
        subscription: RELEASE_MONETIZATION_ENABLED,
        pet_feed_news: true,
        pet_feed_listings: true,
        pet_feed_breeders: true,
      });
    } finally {
      setFeatureFlagsLoading(false);
    }
  }

  function isFeatureEnabled(key: keyof AppFeatureFlags) {
    if (!RELEASE_MONETIZATION_ENABLED && (key === 'rewarded_ads' || key === 'subscription')) {
      return false;
    }
    if (accountProfile?.primary_role === 'admin') return true;
    return appFeatureFlags?.[key] !== false;
  }

  async function loadAuthenticatedUserData(accessToken: string, profile: AccountProfile) {
    // Critical path for first paint: pets only. Defer badges, credits, flags, admin catalogs.
    const loadedPets = await fetchPets(accessToken);
    void refreshVaccinationDueCounts(loadedPets, accessToken, profile.user_id);
    void refreshAiCredits(accessToken);
    void loadFeatureFlags(accessToken);
    if (profile.primary_role === 'admin') {
      void loadAccountDashboard(accessToken, profile.primary_role);
    }
  }

  async function navigateAfterAuthenticatedSession(options?: { startInitialOnboarding?: boolean }) {
    if (options?.startInitialOnboarding) {
      await AsyncStorage.setItem(PENDING_INITIAL_ONBOARDING_KEY, '1');
      setInitialOnboarding(true);
      clearPetForm();
      try {
        await preloadMaiOnboardingImages();
      } catch {
        /* still show intro */
      }
      setScreen('onboarding-intro');
      return;
    }

    const pending = await AsyncStorage.getItem(PENDING_INITIAL_ONBOARDING_KEY);
    if (pending === '1') {
      setInitialOnboarding(true);
      try {
        await preloadMaiOnboardingImages();
      } catch {
        /* still show intro; image may decode on mount */
      }
      setScreen('onboarding-intro');
      return;
    }

    setInitialOnboarding(false);
    setScreen('home');
  }

  function probeBackendHealth() {
    void healthCheck({ timeoutMs: 2000 })
      .then(() => {
        setBackendHealth('online');
        debugLog('STARTUP', 'usePetHealthApp.healthCheck.ok');
      })
      .catch((error) => {
        setBackendHealth('offline');
        debugLog('STARTUP', 'usePetHealthApp.healthCheck.fail', {
          message: error instanceof Error ? error.message : String(error),
        });
      });
  }

  async function initializeApp() {
    debugLog('STARTUP', 'usePetHealthApp.initializeApp.enter');
    try {
      // Do not block first paint on /health (Render cold starts).
      probeBackendHealth();

      const savedSession = await hydrateAuthSessionFromStorage();
      debugLog('STARTUP', 'usePetHealthApp.hydrateAuthSessionFromStorage', {
        hasSession: Boolean(savedSession?.access_token),
        hasRefreshToken: Boolean(savedSession?.refresh_token),
      });

      if (!savedSession?.access_token) {
        debugLog('STARTUP', 'usePetHealthApp.initializeApp.exit', { screen: 'login', reason: 'no_saved_session' });
        return;
      }

      const accessToken = await ensureFreshAccessToken({ preferMemory: true });
      if (!accessToken) {
        await clearInvalidSession();
        debugLog('STARTUP', 'usePetHealthApp.initializeApp.exit', { screen: 'login', reason: 'expired_session' });
        return;
      }

      setToken(accessToken);
      try {
        const profile = await fetchAccountProfile(accessToken);
        debugLog('STARTUP', 'usePetHealthApp.fetchAccountProfile.ok', {
          role: profile.primary_role,
        });
        await loadAuthenticatedUserData(accessToken, profile);
        await navigateAfterAuthenticatedSession();
        debugLog('STARTUP', 'usePetHealthApp.initializeApp.exit', { screen: 'authenticated' });
      } catch (error) {
        debugCheck('STARTUP', 'usePetHealthApp.restore_session', false, {
          message: error instanceof Error ? error.message : String(error),
        });
        await clearInvalidSession();
        debugLog('STARTUP', 'usePetHealthApp.initializeApp.exit', { screen: 'login', reason: 'invalid_session' });
      }
    } finally {
      setSessionBootstrapping(false);
      debugLog('STARTUP', 'usePetHealthApp.sessionBootstrapping.false');
    }
  }

  async function completeInitialOnboarding() {
    await AsyncStorage.removeItem(PENDING_INITIAL_ONBOARDING_KEY);
    setInitialOnboarding(false);
  }

  const applySession = useCallback(
    async (sessionInput: AuthSession | null | undefined, options?: { startInitialOnboarding?: boolean }) => {
      const session = normalizeAuthSession(sessionInput ?? null);
      if (!session) {
        throw new Error('Missing auth session');
      }
      await activateAuthSession(session);
      setToken(session.access_token);
      const profile = await fetchAccountProfile(session.access_token);
      await loadAuthenticatedUserData(session.access_token, profile);
      await navigateAfterAuthenticatedSession(options);
    },
    [fetchAccountProfile, fetchPets, refreshAiCredits],
  );

  function toggleLoginSignUpMode() {
    setIsSignUp((prev) => {
      if (prev) {
        setConfirmPassword('');
        setSignUpOtp('');
        setSignUpOtpError('');
        setPendingSignUpEmail('');
        setPendingSignUpPassword('');
      }
      setAuthError('');
      setAuthSuccess('');
      setAuthFieldErrors({});
      return !prev;
    });
  }

  function clearAuthFieldError(field: keyof AuthFieldErrors) {
    setAuthFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function changeEmail(value: string) {
    setEmail(value);
    if (authError) setAuthError('');
    if (authSuccess) setAuthSuccess('');
    clearAuthFieldError('email');
  }

  function changePassword(value: string) {
    setPassword(value);
    if (authError) setAuthError('');
    clearAuthFieldError('password');
    clearAuthFieldError('confirmPassword');
  }

  function changeConfirmPassword(value: string) {
    setConfirmPassword(value);
    if (authError) setAuthError('');
    clearAuthFieldError('confirmPassword');
  }

  function changeSignUpOtp(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, SIGNUP_OTP_LENGTH);
    setSignUpOtp(digits);
    if (signUpOtpError) setSignUpOtpError('');
  }

  async function submitAuth() {
    const fieldErrors: AuthFieldErrors = {};
    if (!email.trim()) {
      fieldErrors.email = i18n.t('login.fieldErrors.emailRequired');
    }
    if (!password) {
      fieldErrors.password = i18n.t('login.fieldErrors.passwordRequired');
    }
    if (isSignUp && !confirmPassword) {
      fieldErrors.confirmPassword = i18n.t('login.fieldErrors.confirmPasswordRequired');
    }
    if (isSignUp && password && password.length < 6) {
      fieldErrors.password = i18n.t('login.fieldErrors.passwordTooShort');
    }
    if (Object.keys(fieldErrors).length > 0) {
      setAuthFieldErrors(fieldErrors);
      setAuthError('');
      return;
    }
    setAuthFieldErrors({});
    if (isSignUp && password !== confirmPassword) {
      setAuthFieldErrors({ confirmPassword: i18n.t('login.fieldErrors.confirmPasswordMismatch') });
      setAuthError('');
      return;
    }
    if (isSignUp && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setAuthError(i18n.t('login.errors.invalidEmailFormat'));
      return;
    }
    setLoading(true);
    setAuthError('');
    try {
      if (isSignUp) {
        const signUpEmail = email.trim();
        await requestSignUpOtp({ email: signUpEmail, password });
        setPendingSignUpEmail(signUpEmail);
        setPendingSignUpPassword(password);
        setSignUpOtp('');
        setSignUpOtpError('');
        setAuthError('');
        setScreen('signup-otp-verification');
        return;
      }

      const response = await login({ email: email.trim(), password });
      const session = normalizeAuthSession(response.data.session ?? null);
      if (!session) {
        setAuthError(i18n.t('alerts.loginNoToken.message'));
        return;
      }
      await applySession(session);
    } catch (error: unknown) {
      if (
        !isSignUp &&
        error instanceof ApiRequestError &&
        error.code === 'SIGNUP_OTP_PENDING' &&
        password &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ) {
        try {
          const signUpEmail = email.trim();
          await requestSignUpOtp({ email: signUpEmail, password });
          setPendingSignUpEmail(signUpEmail);
          setPendingSignUpPassword(password);
          setSignUpOtp('');
          setSignUpOtpError('');
          setAuthError('');
          setScreen('signup-otp-verification');
          return;
        } catch (resendError: unknown) {
          setAuthError(resolveAuthErrorMessage(resendError, true));
          return;
        }
      }
      if (
        isSignUp &&
        error instanceof ApiRequestError &&
        (error.code === 'PASSWORD_TOO_SHORT' || error.code === 'weak_password')
      ) {
        setAuthFieldErrors({ password: i18n.t('login.fieldErrors.passwordTooShort') });
        setAuthError('');
      } else {
        setAuthError(resolveAuthErrorMessage(error, isSignUp));
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitSignUpOtpVerification() {
    if (!pendingSignUpEmail || !pendingSignUpPassword) {
      setSignUpOtpError(i18n.t('common.somethingWentWrong'));
      return;
    }
    if (!signUpOtp.trim()) {
      setSignUpOtpError(i18n.t('signupOtp.otpRequired'));
      return;
    }
    if (signUpOtp.trim().length !== SIGNUP_OTP_LENGTH) {
      setSignUpOtpError(i18n.t('signupOtp.otpInvalidLength'));
      return;
    }
    setLoading(true);
    setSignUpOtpError('');
    try {
      const signUpRes = await verifySignUpOtp({
        email: pendingSignUpEmail,
        otp: signUpOtp.trim(),
        password: pendingSignUpPassword,
      });
      const signUpSession = normalizeAuthSession(signUpRes.data.session ?? null);
      if (!signUpSession) {
        setSignUpOtpError(i18n.t('alerts.verifyEmail.message'));
        return;
      }
      setSignUpOtp('');
      setSignUpOtpError('');
      setPendingSignUpEmail('');
      setPendingSignUpPassword('');
      setConfirmPassword('');
      await applySession(signUpSession, { startInitialOnboarding: true });
    } catch (error: unknown) {
      setSignUpOtpError(resolveSignUpOtpErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function backToSignUpFromOtpVerification() {
    setSignUpOtp('');
    setSignUpOtpError('');
    setAuthError('');
    setScreen('login');
  }

  function resetForgotPasswordForm() {
    setForgotPasswordError('');
    setForgotPasswordSuccess('');
    setForgotPasswordFieldErrors({});
    setForgotPasswordOtpOpen(false);
    setForgotPasswordPendingEmail('');
    setForgotPasswordOtp('');
    setForgotPasswordNewPassword('');
    setForgotPasswordConfirmPassword('');
    setForgotPasswordOtpError('');
    setForgotPasswordOtpLoading(false);
    setForgotPasswordRateLimitUntilMs(0);
    setForgotPasswordRateLimitSeconds(0);
    setForgotPasswordRecoverFieldErrors({});
  }

  function openForgotPassword() {
    resetForgotPasswordForm();
    setScreen('forgot-password');
  }

  function backToLoginFromForgotPassword() {
    resetForgotPasswordForm();
    setScreen('login');
  }

  function changeForgotPasswordEmail(value: string) {
    setEmail(value);
    // Keep rate-limit countdown visible while waiting; only clear non-rate-limit errors.
    if (forgotPasswordError && forgotPasswordRateLimitSeconds <= 0) {
      setForgotPasswordError('');
    }
    if (forgotPasswordFieldErrors.email) {
      setForgotPasswordFieldErrors((prev) => {
        const next = { ...prev };
        delete next.email;
        return next;
      });
    }
  }

  function changeForgotPasswordOtp(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, ACCOUNT_UPDATE_OTP_LENGTH);
    setForgotPasswordOtp(digits);
    if (forgotPasswordOtpError) setForgotPasswordOtpError('');
    if (forgotPasswordRecoverFieldErrors.otp) {
      setForgotPasswordRecoverFieldErrors((prev) => {
        const next = { ...prev };
        delete next.otp;
        return next;
      });
    }
  }

  function closeForgotPasswordOtpModal() {
    setForgotPasswordOtpOpen(false);
    setForgotPasswordOtp('');
    setForgotPasswordNewPassword('');
    setForgotPasswordConfirmPassword('');
    setForgotPasswordOtpError('');
    setForgotPasswordRecoverFieldErrors({});
    setForgotPasswordOtpLoading(false);
  }

  async function submitForgotPasswordSendOtp() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setForgotPasswordFieldErrors({ email: i18n.t('login.fieldErrors.emailRequired') });
      if (forgotPasswordRateLimitSeconds <= 0) setForgotPasswordError('');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setForgotPasswordFieldErrors({ email: i18n.t('login.errors.invalidEmailFormat') });
      if (forgotPasswordRateLimitSeconds <= 0) setForgotPasswordError('');
      return;
    }
    if (forgotPasswordRateLimitSeconds > 0) {
      setForgotPasswordError(i18n.t('login.forgotPasswordRateLimit', { seconds: forgotPasswordRateLimitSeconds }));
      return;
    }

    setLoading(true);
    setForgotPasswordFieldErrors({});
    setForgotPasswordError('');
    setForgotPasswordSuccess('');
    try {
      const { data } = await requestPasswordRecovery(trimmedEmail);
      const pendingEmail = typeof data.email === 'string' ? data.email : trimmedEmail;
      setForgotPasswordPendingEmail(pendingEmail);
      setForgotPasswordOtp('');
      setForgotPasswordNewPassword('');
      setForgotPasswordConfirmPassword('');
      setForgotPasswordOtpError('');
      setForgotPasswordRecoverFieldErrors({});
      setForgotPasswordRateLimitUntilMs(0);
      setForgotPasswordRateLimitSeconds(0);
      setForgotPasswordOtpOpen(true);
    } catch (error: unknown) {
      if (
        error instanceof ApiRequestError &&
        (error.code === 'over_email_send_rate_limit' || /after \d+ seconds?/i.test(error.message))
      ) {
        const seconds = parseRetryAfterSeconds(error);
        setForgotPasswordRateLimitUntilMs(Date.now() + seconds * 1000);
        setForgotPasswordRateLimitSeconds(seconds);
        setForgotPasswordError(i18n.t('login.forgotPasswordRateLimit', { seconds }));
      } else {
        setForgotPasswordError(
          error instanceof ApiRequestError && error.message
            ? error.message
            : i18n.t('login.forgotPasswordSendFailed'),
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitForgotPasswordApply() {
    const trimmedEmail = email.trim();
    const fieldErrors: { otp?: string; newPassword?: string; confirmPassword?: string } = {};
    if (forgotPasswordOtp.trim().length !== ACCOUNT_UPDATE_OTP_LENGTH) {
      fieldErrors.otp = i18n.t('signupOtp.otpInvalidLength');
    }
    if (!forgotPasswordNewPassword) {
      fieldErrors.newPassword = i18n.t('login.fieldErrors.passwordRequired');
    } else if (forgotPasswordNewPassword.length < 6) {
      fieldErrors.newPassword = i18n.t('login.fieldErrors.passwordTooShort');
    }
    if (!forgotPasswordConfirmPassword) {
      fieldErrors.confirmPassword = i18n.t('login.fieldErrors.confirmPasswordRequired');
    } else if (forgotPasswordNewPassword !== forgotPasswordConfirmPassword) {
      fieldErrors.confirmPassword = i18n.t('login.fieldErrors.confirmPasswordMismatch');
    }
    if (Object.keys(fieldErrors).length > 0) {
      setForgotPasswordRecoverFieldErrors(fieldErrors);
      setForgotPasswordOtpError('');
      return;
    }

    setForgotPasswordOtpLoading(true);
    setForgotPasswordRecoverFieldErrors({});
    setForgotPasswordOtpError('');
    try {
      const { data } = await applyForgotPassword({
        email: trimmedEmail,
        otp: forgotPasswordOtp.trim(),
        newPassword: forgotPasswordNewPassword,
      });
      const refreshedSession = normalizeAuthSession(data.session ?? null);
      setPassword('');
      if (refreshedSession) {
        // Keep OTP modal open until session is ready so we don't flash the forgot-password form.
        await applySession(refreshedSession);
        closeForgotPasswordOtpModal();
        resetForgotPasswordForm();
        return;
      }
      closeForgotPasswordOtpModal();
      resetForgotPasswordForm();
      setAuthError('');
      setAuthSuccess(i18n.t('login.forgotPasswordSuccess'));
      setScreen('login');
    } catch (error: unknown) {
      setForgotPasswordOtpError(resolveAccountUpdateErrorMessage(error));
    } finally {
      setForgotPasswordOtpLoading(false);
    }
  }

  async function openCareServices(petId: string) {
    setSelectedPetId(petId);
    try {
      await preloadServicesOnboardingImages();
    } catch {
      /* show screen even if preload fails */
    }
    setScreen('onboarding-health-prompt');
  }

  function closeCareServices() {
    setScreen('home');
  }

  async function showServicesPromptForNewPet(petId: string) {
    await openCareServices(petId);
  }

  async function handleAddPet() {
    if (!token) return;
    if (!petName.trim() || !petSpecies.trim() || !petBirthDate.trim() || !petGender.trim()) {
      Alert.alert(i18n.t('alerts.missingPetInfo.title'), i18n.t('alerts.missingPetInfo.message'));
      return;
    }
    if (isBirthDateInFuture(petBirthDate)) {
      Alert.alert(i18n.t('alerts.missingPetInfo.title'), i18n.t('addPet.fieldErrors.birthDateFuture'));
      return;
    }

    setLoading(true);
    try {
      if (adminAddPetForUserId && token) {
        await createAdminUserPet(token, adminAddPetForUserId, {
          name: petName.trim(),
          species: petSpecies.trim().toLowerCase(),
          breed: petBreed.trim() || undefined,
          ...petPayloadFromBirthDate(petBirthDate),
          gender: petGender,
          ...(petAvatarStorageUrl ? { avatarUrl: petAvatarStorageUrl } : {}),
        });
        await loadAdminUserPets(adminAddPetForUserId);
        setAdminAddPetForUserId(null);
        clearPetForm();
        setScreen('admin-user-detail');
        return;
      }
      const { data: created } = await createPet(token, {
        name: petName.trim(),
        species: petSpecies.trim().toLowerCase(),
        breed: petBreed.trim() || undefined,
        ...petPayloadFromBirthDate(petBirthDate),
        gender: petGender,
        ...(petAvatarStorageUrl ? { avatarUrl: petAvatarStorageUrl } : {}),
      });
      await fetchPets(token);
      await showServicesPromptForNewPet(created.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('alerts.createPetFailed.title'), i18n.t('alerts.createPetFailed.message', { message }));
    } finally {
      setLoading(false);
    }
  }

  /** Same flow as handleAddPet — used from first-run onboarding pet form. */
  async function handleOnboardingAddPet() {
    await handleAddPet();
  }

  async function startInitialOnboardingFromIntro() {
    await completeInitialOnboarding();
    setScreen('home');
    if (token) void fetchPets(token);
  }

  function cancelOnboardingAddPet() {
    Alert.alert(i18n.t('alerts.exitSetup.title'), i18n.t('alerts.exitSetup.message'), [
      { text: i18n.t('common.stay'), style: 'cancel' },
      {
        text: i18n.t('common.signOut'),
        style: 'destructive',
        onPress: () => void signOutFromOnboarding(),
      },
    ]);
  }

  async function signOutFromOnboarding() {
    await logout();
  }

  function goToHealthCheckFromServicesPrompt() {
    if (!selectedPetId || !isFeatureEnabled('health_analysis')) return;
    clearHealthCheckForm();
    setScreen(initialOnboarding ? 'onboarding-health-check' : 'health-check');
  }

  async function goToCoreCareFromServicesPrompt() {
    if (!selectedPetId) return;
    await openCoreCare(selectedPetId);
  }

  /** @deprecated Use goToHealthCheckFromServicesPrompt */
  function goToOnboardingHealthCheckFromPrompt() {
    goToHealthCheckFromServicesPrompt();
  }

  async function dismissServicesPrompt() {
    if (initialOnboarding) {
      await completeInitialOnboarding();
    }
    clearHealthCheckForm();
    setScreen('home');
    if (token) void fetchPets(token);
  }

  /** @deprecated Use dismissServicesPrompt */
  async function skipInitialHealthOnboarding() {
    await dismissServicesPrompt();
  }

  async function finishInitialOnboardingAfterResults() {
    await completeInitialOnboarding();
    setScreen('home');
    if (token) await fetchPets(token);
  }

  async function handleUpdatePet() {
    if (!token || !editingPetId) return;
    if (!petName.trim() || !petSpecies.trim() || !petBirthDate.trim() || !petGender.trim()) {
      Alert.alert(i18n.t('alerts.missingPetInfo.title'), i18n.t('alerts.missingPetInfo.message'));
      return;
    }
    if (isBirthDateInFuture(petBirthDate)) {
      Alert.alert(i18n.t('alerts.missingPetInfo.title'), i18n.t('addPet.fieldErrors.birthDateFuture'));
      return;
    }

    setLoading(true);
    try {
      const avatarPatch = petAvatarStorageUrl ? { avatarUrl: petAvatarStorageUrl } : petAvatarUrl.trim() ? {} : { avatarUrl: null };
      const payload = {
        name: petName.trim(),
        species: petSpecies.trim().toLowerCase(),
        breed: petBreed.trim() || null,
        gender: petGender,
        ...avatarPatch,
      };
      if (managedUser) {
        await updateAdminUserPet(token, managedUser.userId, editingPetId, payload);
      } else {
        await updatePet(token, editingPetId, payload);
      }
      const returnToProfile = petFormReturnToProfile;
      const updatedPetId = editingPetId;
      clearPetForm();
      setPetFormReturnToProfile(false);
      await fetchPets(token);
      if (returnToProfile && updatedPetId && token) {
        try {
          const mergedHistory = await fetchPetHistoryMerged(updatedPetId);
          applyHistoryPage(mergedHistory);
        } catch {
          setHistory([]);
          setHistoryNextCursor(null);
          setHistoryTotalCount(null);
        }
        setSelectedPetId(updatedPetId);
        setScreen('pet-profile');
      } else {
        setScreen('home');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('alerts.updatePetFailed.title'), i18n.t('alerts.updatePetFailed.message', { message }));
    } finally {
      setLoading(false);
    }
  }

  function openCreatePet() {
    clearPetForm();
    setScreen('add-pet');
  }

  async function openEditPet(petId: string, opts?: { returnToProfile?: boolean }) {
    if (!token) return;
    setPetFormReturnToProfile(Boolean(opts?.returnToProfile));
    setLoading(true);
    try {
      const { data } = await getPet(token, petId);
      setEditingPetId(data.id);
      setPetName(data.name);
      setPetSpecies(data.species);
      setPetBreed(data.breed ?? '');
      setPetBirthDate(petBirthDateForForm(data));
      setPetGender(data.gender === 'female' || data.gender === 'male' ? data.gender : 'male');
      setPetAvatarUrl(data.avatar_url ?? '');
      setPetAvatarStorageUrl('');
      setScreen('edit-pet');
    } catch (error: unknown) {
      setPetFormReturnToProfile(false);
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('alerts.loadPetFailed.title'), i18n.t('alerts.loadPetFailed.message', { message }));
    } finally {
      setLoading(false);
    }
  }

  async function openPetProfile(petId: string) {
    if (!token) return;
    setSelectedPetId(petId);
    setLoading(true);
    try {
      const [historyResult, coreCareResult] = await Promise.allSettled([
        fetchPetHistoryMerged(petId),
        refreshCoreCare(petId),
      ]);
      if (historyResult.status === 'fulfilled') {
        applyHistoryPage(historyResult.value);
      } else {
        applyHistoryPage({ data: [], nextCursor: null, totalCount: 0 });
      }
      setScreen('pet-profile');
      const firstError =
        historyResult.status === 'rejected'
          ? historyResult.reason
          : coreCareResult.status === 'rejected'
            ? coreCareResult.reason
            : null;
      if (firstError) {
        const message = firstError instanceof Error ? firstError.message : i18n.t('common.unknownError');
        Alert.alert(i18n.t('alerts.loadProfileFailed.title'), i18n.t('alerts.loadProfileFailed.message', { message }));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('alerts.loadProfileFailed.title'), i18n.t('alerts.loadProfileFailed.message', { message }));
    } finally {
      setLoading(false);
    }
  }

  function closePetProfile() {
    setScreen('home');
  }

  async function refreshPetProfile() {
    if (!token || !selectedPetId) return;
    setRefreshing(true);
    try {
      await fetchPets(token);
      const mergedHistory = await fetchPetHistoryMerged(selectedPetId);
      applyHistoryPage(mergedHistory);
      await refreshCoreCare(selectedPetId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('alerts.refreshFailed.title'), i18n.t('alerts.refreshFailed.message', { message }));
    } finally {
      setRefreshing(false);
    }
  }

  async function openCoreCare(petId: string = selectedPetId ?? '') {
    if (!token || !petId) {
      Alert.alert(i18n.t('alerts.selectPet.title'), i18n.t('alerts.selectPet.message'));
      return;
    }
    setSelectedPetId(petId);
    setLoading(true);
    try {
      await refreshCoreCare(petId);
      await refreshAiCredits(token);
      setScreen('core-care');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('alerts.loadProfileFailed.title'), i18n.t('alerts.loadProfileFailed.message', { message }));
    } finally {
      setLoading(false);
    }
  }

  function closeCoreCare() {
    setScreen('pet-profile');
  }

  function openCoreCareInfo() {
    setScreen('core-care-info');
  }

  function closeCoreCareInfo() {
    setScreen('core-care');
  }

  async function openVetSummary(petId: string = selectedPetId ?? '') {
    if (!token || !petId) {
      Alert.alert(i18n.t('alerts.selectPet.title'), i18n.t('alerts.selectPet.message'));
      return;
    }
    setSelectedPetId(petId);
    setLoading(true);
    try {
      await refreshCoreCare(petId);
      const merged = await fetchPetHistoryMerged(petId);
      applyHistoryPage(merged);
      setScreen('vet-summary');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('alerts.loadProfileFailed.title'), i18n.t('alerts.loadProfileFailed.message', { message }));
    } finally {
      setLoading(false);
    }
  }

  function closeVetSummary() {
    setScreen('pet-profile');
  }

  async function createCoreCareEntry(payload: CreateCoreCareRecordPayload) {
    if (!token || !selectedPetId) return;
    if (managedUser) {
      await createAdminUserCoreCareRecord(token, managedUser.userId, selectedPetId, payload);
    } else {
      await createCoreCareRecord(token, selectedPetId, payload);
    }
    await refreshCoreCare(selectedPetId);
  }

  async function markReminderDone(record: CoreCareRecord) {
    if (!token) return;
    if (managedUser) {
      await updateAdminUserCoreCareRecord(token, managedUser.userId, record.id, { status: 'done' });
    } else {
      await updateCoreCareRecord(token, record.id, { status: 'done' });
    }
    await refreshCoreCare(record.pet_id);
  }

  async function openPetFeed() {
    if (!token) return;
    if (screen === 'pet-feed') return;
    setSelectedBreederProfileId(null);
    setScreen('pet-feed');
    await loadPetFeedFirstPage(token, {
      showFeedInitialLoading: petFeedPosts.length === 0,
      showAnnouncementInitialLoading: announcementPosts.length === 0,
    });
  }

  function openBreederDetail(profileId: string) {
    setSelectedBreederProfileId(profileId);
    setScreen('breeder-detail');
  }

  function closeBreederDetail() {
    setScreen('pet-feed');
  }

  async function loadAccountDashboard(accessToken: string, role: UserRole | undefined = accountProfile?.primary_role) {
    try {
      const profileRes = await getMyBreederProfile(accessToken);
      setBreederProfile(profileRes.data);
    } catch {
      setBreederProfile(null);
    }
    if (role === 'admin' || role === 'breeder') {
      try {
        if (role === 'admin') {
          const postsRes = await listMyAnnouncementPosts(accessToken);
          setMyPetFeedPosts(postsRes.data);
          // Admin review catalogs load lazily when Home/Admin screens need them.
        } else {
          const postsRes = await listMyPetFeedPosts(accessToken);
          setMyPetFeedPosts(postsRes.data);
        }
      } catch {
        // Account dashboard can still render with the data already in memory.
      }
    }
  }

  function openAccount() {
    if (screen === 'account') return;
    setScreen('account');
    if (!token) return;

    void (async () => {
      try {
        const freshAccount = await fetchAccountProfile(token);
        if (freshAccount.primary_role === 'admin') {
          setScreen('home');
        }
        await loadAccountDashboard(token, freshAccount.primary_role);
      } catch {
        // Keep the account tab responsive even if the dashboard refresh is slow/offline.
      }
    })();
  }

  function hasAccountRole(...roles: UserRole[]) {
    const role = accountProfile?.primary_role;
    return Boolean(role && roles.includes(role));
  }

  async function openBreederProfile() {
    if (!token) return;
    setLoading(true);
    try {
      const profileRes = await getMyBreederProfile(token);
      setBreederProfile(profileRes.data);
      if (hasAccountRole('breeder', 'admin')) {
        const postsRes = await listMyPetFeedPosts(token);
        setMyPetFeedPosts(postsRes.data);
      } else {
        setMyPetFeedPosts([]);
      }
      setScreen('breeder-profile');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('petFeed.breederProfile'), message);
    } finally {
      setLoading(false);
    }
  }

  function closeBreederProfile() {
    setScreen(accountProfile?.primary_role === 'admin' ? 'home' : 'account');
  }

  async function saveBreederProfile(payload: UpsertBreederProfilePayload) {
    if (!token) return;
    const response = await upsertMyBreederProfile(token, payload);
    setBreederProfile(response.data);
    if (hasAccountRole('breeder', 'admin')) {
      const postsRes = await listMyPetFeedPosts(token);
      setMyPetFeedPosts(postsRes.data);
    }
  }

  async function cancelBreederVerificationRequest() {
    if (!token) return;
    try {
      const response = await cancelMyBreederVerificationRequest(token);
      setBreederProfile(response.data);
      Alert.alert(i18n.t('common.ok'), i18n.t('account.senIntro.cancelSuccess'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('account.senIntro.cancelFailed'), message);
    }
  }

  function openCreatePetFeedPost() {
    if (hasAccountRole('admin')) {
      openCreateAdminPost();
      return;
    }
    if (!hasAccountRole('breeder') || breederProfile?.verification_status !== 'verified') {
      Alert.alert(i18n.t('account.roleRequiredTitle'), i18n.t('account.breederOnly'));
      return;
    }
    setEditingPetFeedPost(null);
    setCreatePetFeedReturnScreen(screen === 'breeder-profile' ? 'breeder-profile' : 'account');
    setScreen('create-pet-feed-post');
  }

  function openEditPetFeedDraft(post: PetFeedPost) {
    if (!hasAccountRole('breeder') || post.status !== 'draft') return;
    setEditingPetFeedPost(post);
    setCreatePetFeedReturnScreen('account');
    setScreen('create-pet-feed-post');
  }

  function openCreateAdminPost() {
    if (!hasAccountRole('admin')) return;
    setScreen('create-admin-post');
  }

  function closeCreateAdminPost() {
    setScreen('home');
  }

  async function submitAnnouncementPost(payload: CreateAnnouncementPostPayload, media: CreateAnnouncementPostMedia) {
    if (!token) return;
    await createAnnouncementPost(token, payload, media);
    const postsRes = await listMyAnnouncementPosts(token);
    setMyPetFeedPosts(postsRes.data);
    await loadPetFeedFirstPage(token);
    setScreen('home');
  }

  function closeCreatePetFeedPost() {
    setEditingPetFeedPost(null);
    setScreen(createPetFeedReturnScreen);
  }

  async function submitPetFeedPost(payload: CreatePetFeedPostPayload, media: CreatePetFeedPostMedia) {
    if (!token) return;
    await createPetFeedPost(token, payload, media);
    const postsRes = await listMyPetFeedPosts(token);
    setMyPetFeedPosts(postsRes.data);
    setEditingPetFeedPost(null);
    if (payload.status === 'draft') {
      Alert.alert(i18n.t('common.ok'), i18n.t('createPetFeedPost.draftSaved'));
    }
    setScreen(createPetFeedReturnScreen);
  }

  async function updatePetFeedDraft(
    postId: string,
    payload: CreatePetFeedPostPayload,
    media?: CreatePetFeedPostMedia,
  ) {
    if (!token) return;
    await updateMyPetFeedDraft(token, postId, payload, media);
    const postsRes = await listMyPetFeedPosts(token);
    setMyPetFeedPosts(postsRes.data);
    setEditingPetFeedPost(null);
    if (payload.status === 'draft') {
      Alert.alert(i18n.t('common.ok'), i18n.t('createPetFeedPost.draftSaved'));
    } else if (payload.status === 'pending_review') {
      Alert.alert(i18n.t('common.ok'), i18n.t('account.breederPosts.submitDraftSuccess'));
    }
    setScreen(createPetFeedReturnScreen);
  }

  async function submitPetFeedDraftForReview(post: PetFeedPost) {
    if (!token || post.status !== 'draft') return;
    const mediaCount = Array.isArray(post.media_urls) ? post.media_urls.filter(Boolean).length : 0;
    if (mediaCount === 0 || !post.video_url) {
      Alert.alert(
        i18n.t('account.breederPosts.submitDraftFailed'),
        i18n.t('account.breederPosts.submitDraftMediaRequired'),
      );
      return;
    }
    try {
      await updateMyPetFeedPost(token, post.id, {
        title: post.title,
        species: post.species,
        breed: post.breed,
        gender: post.gender,
        ageMonths: post.age_months,
        location: post.location,
        priceNote: post.price_note,
        description: post.description,
        personality: post.personality,
        vaccineStatus: post.vaccine_status,
        dewormingStatus: post.deworming_status,
        paperwork: post.paperwork,
        contact: post.contact ?? {},
        status: 'pending_review',
      });
      const postsRes = await listMyPetFeedPosts(token);
      setMyPetFeedPosts(postsRes.data);
      Alert.alert(i18n.t('common.ok'), i18n.t('account.breederPosts.submitDraftSuccess'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('account.breederPosts.submitDraftFailed'), message);
    }
  }

  async function submitPetFeedReport(post: PetFeedPost, reason: string, note?: string) {
    if (!token) return;
    try {
      await reportPetFeedPost(token, post.id, { reason, note });
      Alert.alert(i18n.t('common.ok'), i18n.t('petFeed.reportSuccess'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('petFeed.reportFailed'), message);
    }
  }

  const fetchPetFeedPostDetail = useCallback(async (postId: string): Promise<PetFeedPost | null> => {
    if (!token || !postId) return null;
    try {
      const response = await getPetFeedPost(token, postId);
      const post = response.data;
      setPetFeedPosts((current) =>
        current.map((item) => (item.id === post.id ? { ...item, is_favorited: post.is_favorited } : item)),
      );
      return post;
    } catch {
      return null;
    }
  }, [token]);

  const fetchPetFeedPostComments = useCallback(async (postId: string): Promise<PetFeedComment[]> => {
    if (!token || !postId) return [];
    try {
      const response = await listPetFeedPostComments(token, postId);
      return response.data ?? [];
    } catch {
      return [];
    }
  }, [token]);

  const submitPetFeedComment = useCallback(async (
    postId: string,
    body: string,
    parentId?: string | null,
  ): Promise<PetFeedComment | null> => {
    if (!token || !postId) return null;
    try {
      const response = await createPetFeedPostComment(token, postId, body, parentId);
      const created = response.data ?? null;
      if (created) {
        setPetFeedPosts((current) =>
          current.map((item) => (
            item.id === postId
              ? { ...item, comment_count: (item.comment_count ?? 0) + 1 }
              : item
          )),
        );
      }
      return created;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('petFeed.comments.submitFailed'), message);
      return null;
    }
  }, [token]);

  const deletePetFeedComment = useCallback(async (comment: PetFeedComment, removedCount = 1): Promise<boolean> => {
    if (!token || !comment?.id) return false;
    try {
      await deletePetFeedPostComment(token, comment.id);
      const delta = Math.max(1, removedCount);
      setPetFeedPosts((current) =>
        current.map((item) => {
          if (item.id !== comment.post_id) return item;
          const nextCount = Math.max(0, (item.comment_count ?? delta) - delta);
          return { ...item, comment_count: nextCount };
        }),
      );
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('petFeed.comments.deleteFailed'), message);
      return false;
    }
  }, [token]);

  const submitPetFeedCommentReport = useCallback(async (comment: PetFeedComment, reason: string, note?: string) => {
    if (!token || !comment?.id) return;
    try {
      await reportPetFeedComment(token, comment.id, { reason, note });
      Alert.alert(i18n.t('common.ok'), i18n.t('petFeed.comments.reportSuccess'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('petFeed.comments.reportFailed'), message);
    }
  }, [token]);

  async function submitBreederProfileReport(profile: BreederProfile, reason: string, note?: string) {
    if (!token) return;
    try {
      await reportBreederProfile(token, profile.id, { reason, note });
      Alert.alert(i18n.t('common.ok'), i18n.t('petFeed.reportSuccess'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('petFeed.reportFailed'), message);
    }
  }

  async function hideBreederProfile(profile: BreederProfile) {
    if (!token) return;
    try {
      await blockBreederProfile(token, profile.id);
      setPetFeedPosts((posts) => posts.filter((post) => post.breeder_profile_id !== profile.id));
      setTopBreederProfiles((profiles) => profiles.filter((item) => item.id !== profile.id));
      setSelectedBreederProfileId(null);
      setScreen('pet-feed');
      Alert.alert(i18n.t('common.ok'), i18n.t('petFeed.blockBreederSuccess'));
      await refreshPetFeed();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('petFeed.blockBreederFailed'), message);
    }
  }

  async function openAdminHub() {
    if (!hasAccountRole('admin') || !token) return;
    setLoading(true);
    try {
      await ensureAdminReviewLoaded(token);
      setScreen('admin-hub');
    } finally {
      setLoading(false);
    }
  }

  function closeAdminHub() {
    setScreen('home');
  }

  function openAdminFeatures() {
    if (!hasAccountRole('admin')) return;
    if (token) void loadFeatureFlags(token);
    setScreen('admin-features');
  }

  async function updateAdminFeatureFlag(key: keyof AppFeatureFlags, enabled: boolean) {
    if (!token || !hasAccountRole('admin')) return;
    setFeatureFlagSavingKey(key);
    try {
      const res = await updateAdminFeatureFlags(token, { [key]: enabled });
      setAppFeatureFlags(res.data);
    } finally {
      setFeatureFlagSavingKey(null);
    }
  }

  async function loadAdminUserPets(userId: string) {
    if (!token) return;
    setAdminUserPetsLoading(true);
    try {
      const response = await listAdminUserPets(token, userId);
      setAdminUserPets(response.data);
    } finally {
      setAdminUserPetsLoading(false);
    }
  }

  function openAdminUserDetail(account: AccountProfile) {
    setAdminSelectedAccount(account);
    setScreen('admin-user-detail');
    void loadAdminUserPets(account.user_id);
  }

  function closeAdminUserDetail() {
    setAdminSelectedAccount(null);
    setAdminUserPets([]);
    setScreen('admin-hub');
  }

  function openAdminAddPetForUser() {
    if (!adminSelectedAccount) return;
    clearPetForm();
    setAdminAddPetForUserId(adminSelectedAccount.user_id);
    setScreen('add-pet');
  }

  async function enterManagedUser(account: AccountProfile) {
    setManagedUser({
      userId: account.user_id,
      displayName: account.display_name || account.login_identifier,
      role: account.primary_role,
    });
    if (!token) return;
    setLoading(true);
    try {
      await fetchPets(token, account.user_id);
      setScreen('home');
    } finally {
      setLoading(false);
    }
  }

  function exitManagedUser() {
    setManagedUser(null);
    if (token) {
      void fetchPets(token);
    }
    setScreen('admin-user-detail');
  }

  async function openAdminReview() {
    if (!hasAccountRole('admin')) {
      Alert.alert(i18n.t('account.roleRequiredTitle'), i18n.t('account.adminOnly'));
      return;
    }
    if (!token) return;
    setScreen('admin-review');
    try {
      await ensureAdminReviewLoaded(token);
    } catch {
      // The admin screen can still show and let the user retry manually.
    }
  }

  function closeAdminReview() {
    setScreen(accountProfile?.primary_role === 'admin' ? 'home' : 'account');
  }

  async function loadAdminReview(accessToken: string | null = token) {
    if (!accessToken) return;
    const loadGen = ++adminReviewLoadGenRef.current;
    const [accountsRes, breedersRes, postsRes, reportsRes] = await Promise.all([
      listAdminAccounts(accessToken),
      listAdminBreederProfiles(accessToken),
      listAdminPetFeedPosts(accessToken, ''),
      listAdminPetFeedReports(accessToken, ''),
    ]);
    // Ignore out-of-order responses so a slower stale fetch cannot wipe a newer update.
    if (loadGen !== adminReviewLoadGenRef.current) return;
    setAdminAccounts(accountsRes.data);
    setAdminBreederProfiles(breedersRes.data);
    setAdminFeedPosts(postsRes.data);
    setAdminFeedReports(reportsRes.data);
    adminReviewLoadedRef.current = true;
  }

  async function ensureAdminReviewLoaded(accessToken: string | null = token, options?: { force?: boolean }) {
    if (!accessToken) return;
    if (!options?.force && adminReviewLoadedRef.current) return;
    // Wait out any in-flight load, then re-fetch when force so we never keep stale admin queues.
    if (adminReviewInFlightRef.current) {
      await adminReviewInFlightRef.current;
      if (!options?.force) return;
    }
    const inflight = loadAdminReview(accessToken).finally(() => {
      if (adminReviewInFlightRef.current === inflight) {
        adminReviewInFlightRef.current = null;
      }
    });
    adminReviewInFlightRef.current = inflight;
    await inflight;
  }

  async function createAdminManagedAccount(payload: AdminCreateAccountPayload) {
    if (!token) return;
    try {
      await createAdminAccount(token, payload);
      await ensureAdminReviewLoaded(token, { force: true });
      Alert.alert(i18n.t('common.ok'), i18n.t('adminHub.createAccountSuccess'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('adminHub.createAccountFailed'), message);
      throw error;
    }
  }

  async function updateAdminManagedAccount(userId: string, payload: AdminUpdateAccountPayload) {
    if (!token) return;
    await updateAdminAccount(token, userId, payload);
    await ensureAdminReviewLoaded(token, { force: true });
  }

  async function updateAdminBreederStatus(userId: string, verificationStatus: string) {
    if (!token) {
      throw new Error(i18n.t('adminReview.updateFailed'));
    }
    const safeUserId = typeof userId === 'string' ? userId.trim() : '';
    if (!safeUserId) {
      throw new Error(i18n.t('adminReview.updateFailed'));
    }
    const matchesProfile = (profile: BreederProfile) =>
      profile.user_id === safeUserId || profile.id === safeUserId;

    setAdminBreederProfiles((profiles) =>
      profiles.map((profile) =>
        matchesProfile(profile)
          ? { ...profile, verification_status: verificationStatus as BreederProfile['verification_status'] }
          : profile,
      ),
    );

    const response = await updateAdminBreederProfileStatus(token, safeUserId, verificationStatus);
    const updated = response.data;
    if (updated) {
      setAdminBreederProfiles((profiles) => {
        const next = profiles.map((profile) =>
          matchesProfile(profile) || profile.id === updated.id || profile.user_id === updated.user_id
            ? { ...profile, ...updated }
            : profile,
        );
        if (!next.some((profile) => profile.id === updated.id || profile.user_id === updated.user_id)) {
          return [updated, ...next];
        }
        return next;
      });
    }

    try {
      await ensureAdminReviewLoaded(token, { force: true });
    } catch {
      // Keep the verified (or rejected/suspended) state from the PUT response if refresh fails.
    }
  }

  async function updateAdminPostStatus(postId: string, status: string) {
    if (!token) return;
    await updateAdminPetFeedPostStatus(token, postId, status);
    await ensureAdminReviewLoaded(token, { force: true });
  }

  async function updateAdminReportStatus(reportId: string, status: string) {
    if (!token) return;
    await updateAdminPetFeedReportStatus(token, reportId, status);
    await ensureAdminReviewLoaded(token, { force: true });
  }

  async function togglePetFeedFavorite(post: PetFeedPost) {
    if (!token) return;
    setPetFeedPosts((prev) =>
      prev.map((item) => (item.id === post.id ? { ...item, is_favorited: !item.is_favorited } : item)),
    );
    try {
      if (post.is_favorited) {
        await unfavoritePetFeedPost(token, post.id);
      } else {
        await favoritePetFeedPost(token, post.id);
      }
    } catch (error: unknown) {
      setPetFeedPosts((prev) =>
        prev.map((item) => (item.id === post.id ? { ...item, is_favorited: post.is_favorited } : item)),
      );
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('petFeed.favoriteFailed'), message);
    }
  }

  async function watchRewardedAdForCredit(): Promise<boolean> {
    if (!RELEASE_MONETIZATION_ENABLED || !isFeatureEnabled('rewarded_ads')) return false;
    if (!token) return false;

    // v1 release: rewarded ads disabled — restore block below when enabling AdMob.
    return false;

    // const adResult = await showRewardedAd();
    // if (!adResult.earned) {
    //   return false;
    // }
    //
    // try {
    //   const response = await claimRewardedAdCredit(token);
    //   setAiCredits(response.data.account);
    //   await refreshAiCredits(token);
    //   Alert.alert(i18n.t('common.ok'), i18n.t('rewardedAd.claimSuccess', { credits: response.data.grantedCredits }));
    //   return true;
    // } catch (error: unknown) {
    //   const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
    //   Alert.alert(i18n.t('rewardedAd.title'), message);
    //   return false;
    // }
  }

  async function claimAdCredit() {
    if (!isFeatureEnabled('rewarded_ads')) return;
    await watchRewardedAdForCredit();
  }

  function openPremiumSubscription() {
    if (!RELEASE_MONETIZATION_ENABLED || !isFeatureEnabled('subscription')) return;
    if (!token) return;

    // v1 release: IAP disabled — restore block below when enabling subscriptions.
    return;

    // void (async () => {
    //   const trial = aiEconomicsConfig?.pricingExperiment?.subscriptionTrial;
    //   const monthlyCredits = trial?.monthlyCredits ?? 60;
    //
    //   const result = await purchasePremiumSubscription(async (payload) => {
    //     const response = await verifyIapPurchase(token, payload);
    //     setAiCredits(response.data.account);
    //   });
    //
    //   if (result.ok) {
    //     await refreshAiCredits(token);
    //     Alert.alert(i18n.t('premium.title'), i18n.t('premium.purchaseSuccess', { credits: monthlyCredits }));
    //     return;
    //   }
    //   if (result.cancelled) return;
    //
    //   if (result.message === 'IAP_UNAVAILABLE' || result.message === 'IAP_WEB_UNSUPPORTED') {
    //     const priceVnd = trial?.priceVnd ?? 99000;
    //     const priceLabel = new Intl.NumberFormat('vi-VN').format(priceVnd);
    //     Alert.alert(
    //       i18n.t('premium.title'),
    //       i18n.t('premium.mobileOnlyBody', { credits: monthlyCredits, price: priceLabel }),
    //     );
    //     return;
    //   }
    //
    //   Alert.alert(i18n.t('premium.title'), result.message || i18n.t('premium.purchaseFailed'));
    // })();
  }

  function cancelPetForm() {
    const backToProfile = petFormReturnToProfile;
    const adminTargetUserId = adminAddPetForUserId;
    clearPetForm();
    setPetFormReturnToProfile(false);
    setAdminAddPetForUserId(null);
    if (adminTargetUserId) {
      setScreen('admin-user-detail');
      return;
    }
    setScreen(backToProfile ? 'pet-profile' : 'home');
  }

  function handleDeletePet(pet: Pet) {
    if (!token) return;
    Alert.alert(
      i18n.t('alerts.deletePet.title'),
      i18n.t('alerts.deletePet.message', { name: pet.name }),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.delete'),
          style: 'destructive',
          onPress: () => void confirmDeletePet(pet.id),
        },
      ],
    );
  }

  async function confirmDeletePet(petId: string) {
    if (!token) return;
    setLoading(true);
    try {
      await deletePet(token, petId);
      if (selectedPetId === petId) {
        setSelectedPetId(null);
        setHistory([]);
        setHistoryNextCursor(null);
        setHistoryTotalCount(null);
        setCoreCareRecords([]);
        setCoreCareSummary(null);
        setScreen('home');
      }
      if (editingPetId === petId) {
        clearPetForm();
        setPetFormReturnToProfile(false);
        setScreen('home');
      }
      await fetchPets(token);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('alerts.deleteFailed.title'), i18n.t('alerts.deleteFailed.message', { message }));
    } finally {
      setLoading(false);
    }
  }

  async function pickPetAvatar() {
    if (!token) {
      Alert.alert(i18n.t('alerts.signInRequired.title'), i18n.t('alerts.signInRequired.message'));
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(i18n.t('alerts.permissionAvatar.title'), i18n.t('alerts.permissionAvatar.message'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setLoading(true);
    try {
      const resized = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 512 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );
      const { data } = await uploadPetAvatar(token, resized.uri);
      setPetAvatarUrl(resized.uri);
      setPetAvatarStorageUrl(data.avatarStorageUrl);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('alerts.avatarUploadFailed.title'), i18n.t('alerts.avatarUploadFailed.message', { message }));
    } finally {
      setLoading(false);
    }
  }

  async function uploadPetAvatarFromHome(petId: string) {
    if (!token) {
      Alert.alert(i18n.t('alerts.signInRequired.title'), i18n.t('alerts.signInRequired.message'));
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(i18n.t('alerts.permissionAvatar.title'), i18n.t('alerts.permissionAvatar.message'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setLoading(true);
    try {
      const resized = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 512 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );
      const { data } = await uploadPetAvatar(token, resized.uri);
      await updatePet(token, petId, { avatarUrl: data.avatarStorageUrl });
      await fetchPets(token);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('alerts.avatarUploadFailed.title'), i18n.t('alerts.avatarUploadFailed.message', { message }));
    } finally {
      setLoading(false);
    }
  }

  async function pickHealthCheckPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(i18n.t('alerts.permissionGallery.title'), i18n.t('alerts.permissionGallery.message'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 6,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;
    try {
      const newUris: string[] = [];
      for (const asset of result.assets) {
        const compressed = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
        );
        newUris.push(compressed.uri);
      }
      setHealthCheckPhotos((prev) => [...prev, ...newUris].slice(0, 6));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('alerts.photosError.title'), i18n.t('alerts.photosError.message', { message }));
    }
  }

  async function pickHealthCheckVideo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(i18n.t('alerts.permissionGallery.title'), i18n.t('alerts.permissionGallery.message'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 10,
      quality: 0.75,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setHealthCheckVideoUri(result.assets[0].uri);
  }

  async function analyzeHealthCheck() {
    const block = getAnalyzeBlockReason({
      hasPhotos: healthCheckPhotos.length > 0,
      hasToken: Boolean(token),
      hasSelectedPet: Boolean(selectedPetId),
      analysisSubmitting,
      analysisCooldownSeconds,
    });
    if (block === 'photos_required') {
      Alert.alert(i18n.t('alerts.photosRequired.title'), i18n.t('alerts.photosRequired.message'));
      return;
    }
    if (block === 'missing_session') {
      Alert.alert(i18n.t('alerts.missingData.title'), i18n.t('alerts.missingData.message'));
      return;
    }
    if (block === 'in_progress') {
      setHealthCheckInlineError(i18n.t('alerts.analysisInProgressFriendly.message'));
      return;
    }
    if (block === 'cooldown') {
      setHealthCheckInlineError(i18n.t('alerts.analysisCooldownFriendly.message', { seconds: analysisCooldownSeconds }));
      return;
    }
    setHealthCheckInlineError('');
    const safeToken = token;
    const safePetId = selectedPetId;
    if (!safeToken || !safePetId) {
      Alert.alert(i18n.t('alerts.missingData.title'), i18n.t('alerts.missingData.message'));
      return;
    }
    const screenAfterProgress: AppScreen = initialOnboarding ? 'onboarding-health-check' : 'health-check';
    setAnalysisSubmitting(true);
    setAnalysisProgressStage('uploading');
    setAnalysisProgressMessage('');
    setScreen('analysis-progress');
    const requestId = Crypto.randomUUID();
    try {
      const response = await analyzePetHealthCheck({
        token: safeToken,
        petId: safePetId,
        locale: i18n.language || 'en',
        imageUris: healthCheckPhotos,
        videoUri: healthCheckVideoUri,
        weightKg: healthCheckWeightKg.trim(),
        vaccinated: healthCheckVaccinated,
        vaccineType: selectedPet
          ? formatHealthCheckVaccineTypeForApi(selectedPet.species, healthCheckVaccineIds, healthCheckVaccineOther)
          : '',
        neutered: healthCheckNeutered,
        medicalHistory: healthCheckMedicalHistory.trim(),
        symptomDescription: healthCheckSymptoms.trim(),
        requestId,
        onProgressStage: (progress) => {
          if (progress.stage === 'analyzing' || progress.stage === 'saving' || progress.stage === 'failed') {
            setAnalysisProgressStage(progress.stage);
          }
          if (progress.message) {
            setAnalysisProgressMessage(progress.message);
          }
        },
      });
      void refreshAiCredits(safeToken);
      const assessment = response.data.assessment;
      const status = assessment?.status ?? response.data.status;
      if (status === 'need_more_data' || status === 'not_pet_or_unclear') {
        const nextSummary = assessment?.next_action?.summary?.trim() ?? response.data.next_action?.summary?.trim() ?? '';
        const askMore =
          assessment?.next_action?.ask_user_to_add?.filter(Boolean) ??
          response.data.next_action?.ask_user_to_add?.filter(Boolean) ??
          [];
        const missing = assessment?.missing_data?.filter(Boolean) ?? response.data.missing_data?.filter(Boolean) ?? [];
        const detailLines = [nextSummary, ...askMore, ...missing].filter(Boolean).slice(0, 4);
        const details = detailLines.length ? `\n\n- ${detailLines.join('\n- ')}` : '';
        const title =
          status === 'not_pet_or_unclear'
            ? i18n.t('alerts.analysisNeedBetterPetPhoto.title')
            : i18n.t('alerts.analysisNeedMoreData.title');
        const message =
          status === 'not_pet_or_unclear'
            ? i18n.t('alerts.analysisNeedBetterPetPhoto.message')
            : i18n.t('alerts.analysisNeedMoreData.message');
        setHealthCheckInlineError(`${title}\n${message}${details}`);
        setWarnings(response.warnings ?? []);
        setScreen(screenAfterProgress);
        return;
      }
      setAnalysisProgressStage('saving');
      setCurrentResult(response.data);
      setResultImageUri(healthCheckPhotos[0]);
      const redFlags = assessment?.red_flags?.filter(Boolean) ?? response.data.red_flags?.filter(Boolean) ?? [];
      const mergedWarnings = [...(response.warnings ?? []), ...redFlags];
      setWarnings(mergedWarnings);
      const returnToProfileAfterScan = healthCheckReturnToProfile;
      setHealthCheckReturnToProfile(false);
      setResultsReturnScreen(returnToProfileAfterScan ? 'pet-profile' : null);
      const mergedHistory = await fetchPetHistoryMerged(safePetId);
      applyHistoryPage(mergedHistory);
      setAnalysisCooldownUntilMs(Date.now() + 90 * 1000);
      clearHealthCheckForm();
      setScreen(initialOnboarding ? 'onboarding-results' : 'results');
    } catch (error: unknown) {
      let message = mapAnalyzeFriendlyMessage({
        error,
        analysisCooldownSeconds,
        t: (k, options) => i18n.t(k, options),
      });
      if (error instanceof AnalyzeRequestError) {
        if (error.code === 'AI_CREDITS_EXHAUSTED') {
          setAiCredits((prev) =>
            prev
              ? {
                  ...prev,
                  creditBalance: typeof error.creditBalance === 'number' ? error.creditBalance : prev.creditBalance,
                  featureTrialBalance:
                    error.featureTrialBalance && typeof error.featureTrialBalance === 'object'
                      ? { ...(prev.featureTrialBalance ?? {}), ...error.featureTrialBalance }
                      : { ...(prev.featureTrialBalance ?? {}), health_analysis: 0 },
                  monthlyResetAt: error.monthlyResetAt ?? prev.monthlyResetAt,
                }
              : prev,
          );
        }
        if (typeof error.retryAfterSeconds === 'number' && error.retryAfterSeconds > 0) {
          setAnalysisCooldownUntilMs(Date.now() + error.retryAfterSeconds * 1000);
        }
      }
      setAnalysisProgressStage('failed');
      setAnalysisProgressMessage(message);
      setHealthCheckInlineError(`${i18n.t('alerts.analyzeFailed.title')}\n${message}`);
      setScreen(screenAfterProgress);
    } finally {
      setAnalysisSubmitting(false);
    }
  }

  function closeHealthCheck() {
    clearHealthCheckForm();
    setAnalysisSubmitting(false);
    setHealthCheckInlineError('');
    if (initialOnboarding) {
      setScreen('onboarding-health-prompt');
    } else if (healthCheckReturnToProfile) {
      setHealthCheckReturnToProfile(false);
      setScreen('pet-profile');
    } else {
      setScreen('home');
    }
  }

  async function openHistory() {
    if (!token || !selectedPetId) {
      Alert.alert(i18n.t('alerts.selectPet.title'), i18n.t('alerts.selectPet.message'));
      return;
    }
    setLoading(true);
    try {
      const mergedHistory = await fetchPetHistoryMerged(selectedPetId);
      applyHistoryPage(mergedHistory);
      setScreen('history');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('alerts.historyFailed.title'), i18n.t('alerts.historyFailed.message', { message }));
    } finally {
      setLoading(false);
    }
  }

  async function openHistoryDetail(
    entry: Analysis,
    source: 'home' | 'history' | 'pet-profile' = 'home',
  ) {
    setResultsReturnScreen(source === 'home' ? 'home' : source);
    setWarnings([]);
    if (!token || !entry.list_incomplete) {
      setCurrentResult(entry);
      setResultImageUri(entry.image_url);
      setScreen('results');
      return;
    }

    setLoading(true);
    try {
      const wantVi = Boolean(i18n.language?.startsWith('vi'));
      const res = await getAnalysisById(token, entry.id, wantVi ? { displayLocale: 'vi' } : undefined);
      setCurrentResult(res.data);
      setResultImageUri(res.data.image_url);
      setHistory((current) => current.map((row) => (row.id === res.data.id ? { ...row, ...res.data, list_incomplete: false } : row)));
      setScreen('results');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('alerts.historyFailed.title'), i18n.t('alerts.historyFailed.message', { message }));
    } finally {
      setLoading(false);
    }
  }

  function dismissResults() {
    const target = resultsReturnScreen ?? 'home';
    setResultsReturnScreen(null);
    if (target === 'history') {
      setScreen('history');
      return;
    }
    if (target === 'pet-profile') {
      setScreen('pet-profile');
      if (token && selectedPetId) {
        void fetchPetHistoryMerged(selectedPetId).then(applyHistoryPage);
      }
      return;
    }
    goHomeAndRefresh();
  }

  async function logout() {
    await clearAuthSession();
    await AsyncStorage.removeItem(PENDING_INITIAL_ONBOARDING_KEY);
    setInitialOnboarding(false);
    setToken(null);
    setAccountProfile(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setSignUpOtp('');
    setPendingSignUpEmail('');
    setPendingSignUpPassword('');
    setIsSignUp(false);
    setPets([]);
    setAiCredits(null);
    setAiEconomicsConfig(null);
    setAppFeatureFlags(null);
    setFeatureFlagsLoading(false);
    setFeatureFlagSavingKey(null);
    setCreditLedger([]);
    setCoreCareRecords([]);
    setCoreCareSummary(null);
    setPetVaccinationDueCounts({});
    vaccinationDuePopupOfferedRef.current = false;
    setVaccinationDuePopupVisible(false);
    void clearAppIconBadge();
    setPetFeedPosts([]);
    setAnnouncementPosts([]);
    setTopBreederProfiles([]);
    setMyPetFeedPosts([]);
    setEditingPetFeedPost(null);
    setManagedUser(null);
    setAdminSelectedAccount(null);
    setAdminUserPets([]);
    setAdminAddPetForUserId(null);
    setBreederProfile(null);
    setSelectedBreederProfileId(null);
    setAdminAccounts([]);
    setAdminBreederProfiles([]);
    setAdminFeedPosts([]);
    setAdminFeedReports([]);
    adminReviewLoadedRef.current = false;
    adminReviewInFlightRef.current = null;
    setSelectedPetId(null);
    clearHealthCheckForm();
    setCurrentResult(null);
    setResultImageUri(null);
    setHistory([]);
    setHistoryNextCursor(null);
    setHistoryTotalCount(null);
    setHistoryLoadingMore(false);
    clearPetForm();
    setPetFormReturnToProfile(false);
    setHealthCheckReturnToProfile(false);
    setResultsReturnScreen(null);
    setBreedRecognitionReturnScreen(null);
    setBreedRecognitionSlotUris({});
    setBreedRecognitionResult(null);
    setBreedRecognitionLoading(false);
    setScreen('login');
  }

  function resetBreedRecognitionForm() {
    setBreedRecognitionSlotUris({});
    setBreedRecognitionResult(null);
    setBreedRecognitionLoading(false);
  }

  function openBreedRecognition(
    from: 'health-check' | 'onboarding-health-check' | 'onboarding-health-prompt' | 'pet-profile',
  ) {
    if (!isFeatureEnabled('breed_recognition')) return;
    if (!token || !selectedPetId) {
      Alert.alert(i18n.t('alerts.selectPet.title'), i18n.t('alerts.selectPet.message'));
      return;
    }
    const pet = pets.find((p) => p.id === selectedPetId);
    if (!pet || !isBreedRecognitionSpecies(pet.species)) {
      Alert.alert(i18n.t('breedRecognition.title'), i18n.t('breedRecognition.unsupportedSpeciesAlertBody'));
      return;
    }
    setBreedRecognitionReturnScreen(from);
    resetBreedRecognitionForm();
    setScreen('breed-recognition');
    void refreshAiCredits(token);
  }

  function closeBreedRecognition() {
    const back = breedRecognitionReturnScreen;
    setBreedRecognitionReturnScreen(null);
    resetBreedRecognitionForm();
    if (back === 'health-check') setScreen('health-check');
    else if (back === 'onboarding-health-check') setScreen('onboarding-health-check');
    else if (back === 'onboarding-health-prompt') setScreen('onboarding-health-prompt');
    else if (back === 'pet-profile') setScreen('pet-profile');
    else setScreen('home');
  }

  async function pickBreedRecognitionSlot(slot: BreedRecognitionSlot) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(i18n.t('alerts.permissionGallery.title'), i18n.t('alerts.permissionGallery.message'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1600 } }],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
      );
      setBreedRecognitionSlotUris((prev) => ({ ...prev, [slot]: compressed.uri }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('alerts.photosError.title'), i18n.t('alerts.photosError.message', { message }));
    }
  }

  function clearBreedRecognitionSlot(slot: BreedRecognitionSlot) {
    setBreedRecognitionSlotUris((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  }

  async function submitBreedRecognition() {
    if (!token || !selectedPetId) return;
    setBreedRecognitionLoading(true);
    setBreedRecognitionResult(null);
    setScreen('breed-recognition-progress');
    try {
      const res = await requestBreedRecognition(token, {
        petId: selectedPetId,
        slotUris: breedRecognitionSlotUris,
        locale: i18n.language,
      });
      setBreedRecognitionResult(res.data);
      void refreshAiCredits(token);
      setScreen('breed-recognition-result');
    } catch (error: unknown) {
      if (error instanceof ApiRequestError && error.code === 'AI_CREDITS_EXHAUSTED') {
        setAiCredits((prev) =>
          prev
            ? {
                ...prev,
                creditBalance: typeof error.creditBalance === 'number' ? error.creditBalance : prev.creditBalance,
                featureTrialBalance:
                  error.featureTrialBalance && typeof error.featureTrialBalance === 'object'
                    ? { ...(prev.featureTrialBalance ?? {}), ...error.featureTrialBalance }
                    : { ...(prev.featureTrialBalance ?? {}), breed_recognition: 0 },
                monthlyResetAt: error.monthlyResetAt ?? prev.monthlyResetAt,
              }
            : prev,
        );
      }
      const message =
        error instanceof ApiRequestError && error.code === 'AI_CREDITS_EXHAUSTED'
          ? i18n.t('alerts.aiCreditsExhaustedBreed.message')
          : error instanceof Error
            ? error.message
            : i18n.t('common.unknownError');
      Alert.alert(i18n.t('breedRecognition.title'), message);
      setScreen('breed-recognition');
    } finally {
      setBreedRecognitionLoading(false);
    }
  }

  function editBreedRecognitionPhotos() {
    setScreen('breed-recognition');
  }

  async function applyBreedRecognitionToProfile() {
    const breedSuggestion =
      breedRecognitionResult?.primary?.breed_name?.trim() || breedRecognitionResult?.primary_hypothesis?.trim() || '';
    if (!token || !selectedPetId || !breedSuggestion) return;
    setLoading(true);
    try {
      await updatePet(token, selectedPetId, { breed: breedSuggestion });
      await fetchPets(token);
      Alert.alert(i18n.t('common.ok'), i18n.t('breedRecognition.applySuccess'));
      closeBreedRecognition();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('breedRecognition.title'), message);
    } finally {
      setLoading(false);
    }
  }

  function resetUpdateAccountEmailChangeForm() {
    setUpdateAccountNewLogin('');
    setUpdateAccountEmailChangePassword('');
    setUpdateAccountChangeLoginError('');
    setUpdateAccountChangeLoginFieldErrors({});
    setUpdateAccountChangeLoginSuccess('');
    setUpdateAccountEmailOtpOpen(false);
    setUpdateAccountPendingNewEmail('');
    setUpdateAccountEmailOtp('');
    setUpdateAccountEmailOtpError('');
    setUpdateAccountEmailOtpLoading(false);
  }

  function openUpdateAccount() {
    resetUpdateAccountEmailChangeForm();
    resetUpdateAccountPasswordForm();
    setUpdateAccountRecoverError('');
    setUpdateAccountRecoverSuccess('');
    setScreen('update-account');
  }

  function openLanguageSelection() {
    setScreen('language-selection');
  }

  function backFromLanguageSelection() {
    setScreen('account');
  }

  function backFromUpdateAccount() {
    setScreen('account');
  }

  function backToUpdateAccount() {
    resetUpdateAccountPasswordForm();
    resetUpdateAccountEmailChangeForm();
    setUpdateAccountRecoverError('');
    setUpdateAccountRecoverSuccess('');
    setScreen('update-account');
  }

  function resetUpdateAccountPasswordForm() {
    setUpdateAccountCurrentPassword('');
    setUpdateAccountNewPassword('');
    setUpdateAccountConfirmNewPassword('');
    setUpdateAccountPasswordError('');
    setUpdateAccountPasswordSuccess('');
    setUpdateAccountPasswordFieldErrors({});
  }

  function openUpdateAccountChangeLogin() {
    resetUpdateAccountEmailChangeForm();
    setScreen('update-account-change-login');
  }

  function openUpdateAccountChangePassword() {
    resetUpdateAccountPasswordForm();
    setScreen('update-account-change-password');
  }

  function resetUpdateAccountRecoverForm() {
    setUpdateAccountRecoverError('');
    setUpdateAccountRecoverSuccess('');
    setUpdateAccountRecoverOtpOpen(false);
    setUpdateAccountRecoverPendingEmail('');
    setUpdateAccountRecoverOtp('');
    setUpdateAccountRecoverNewPassword('');
    setUpdateAccountRecoverConfirmPassword('');
    setUpdateAccountRecoverOtpError('');
    setUpdateAccountRecoverOtpLoading(false);
    setUpdateAccountRecoverFieldErrors({});
  }

  function openUpdateAccountRecoverPassword() {
    resetUpdateAccountRecoverForm();
    setScreen('update-account-recover-password');
  }

  function changeUpdateAccountNewLogin(value: string) {
    setUpdateAccountNewLogin(value);
    if (updateAccountChangeLoginError) setUpdateAccountChangeLoginError('');
    if (updateAccountChangeLoginFieldErrors.newEmail) {
      setUpdateAccountChangeLoginFieldErrors((prev) => {
        const next = { ...prev };
        delete next.newEmail;
        return next;
      });
    }
  }

  function changeUpdateAccountEmailChangePassword(value: string) {
    setUpdateAccountEmailChangePassword(value);
    if (updateAccountChangeLoginFieldErrors.currentPassword) {
      setUpdateAccountChangeLoginFieldErrors((prev) => {
        const next = { ...prev };
        delete next.currentPassword;
        return next;
      });
    }
  }

  function changeUpdateAccountEmailOtp(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, ACCOUNT_UPDATE_OTP_LENGTH);
    setUpdateAccountEmailOtp(digits);
    if (updateAccountEmailOtpError) setUpdateAccountEmailOtpError('');
  }

  function closeUpdateAccountEmailOtpModal() {
    setUpdateAccountEmailOtpOpen(false);
    setUpdateAccountEmailOtp('');
    setUpdateAccountEmailOtpError('');
    setUpdateAccountEmailOtpLoading(false);
  }

  function resolveCurrentAccountLogin() {
    return accountProfile?.email ?? accountProfile?.login_identifier ?? '';
  }

  function resolveRecoverPasswordEmail() {
    const profileEmail = accountProfile?.email?.trim().toLocaleLowerCase('en-US') ?? '';
    const loginId = accountProfile?.login_identifier?.trim().toLocaleLowerCase('en-US') ?? '';
    const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (profileEmail && looksLikeEmail(profileEmail) && !SYNTHETIC_AUTH_EMAIL_PATTERN.test(profileEmail)) {
      return profileEmail;
    }
    if (loginId && looksLikeEmail(loginId) && !SYNTHETIC_AUTH_EMAIL_PATTERN.test(loginId)) {
      return loginId;
    }
    return null;
  }

  async function persistRefreshedSession(data: { accessToken?: string | null; session?: AuthSession | null }) {
    const session = normalizeAuthSession(data.session ?? null);
    if (session) {
      await activateAuthSession(session);
      setToken(session.access_token);
      return;
    }
    if (!data.accessToken) return;
    const merged = normalizeAuthSession({ access_token: data.accessToken, refresh_token: getActiveAuthSession()?.refresh_token ?? '' });
    if (!merged) return;
    await activateAuthSession(merged);
    setToken(merged.access_token);
  }

  async function submitUpdateAccountChangeLogin() {
    if (!token) return;
    const currentEmail = resolveCurrentAccountLogin();
    const nextLogin = updateAccountNewLogin.trim();
    const fieldErrors: { newEmail?: string; currentPassword?: string } = {};
    if (!nextLogin) {
      fieldErrors.newEmail = i18n.t('login.fieldErrors.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextLogin)) {
      fieldErrors.newEmail = i18n.t('login.errors.invalidEmailFormat');
    }
    if (!updateAccountEmailChangePassword) {
      fieldErrors.currentPassword = i18n.t('login.fieldErrors.passwordRequired');
    }
    if (Object.keys(fieldErrors).length > 0) {
      setUpdateAccountChangeLoginFieldErrors(fieldErrors);
      setUpdateAccountChangeLoginError('');
      return;
    }

    setLoading(true);
    setUpdateAccountChangeLoginFieldErrors({});
    setUpdateAccountChangeLoginError('');
    setUpdateAccountChangeLoginSuccess('');
    try {
      const { data } = await verifyAccountUpdateRequest(token, {
        type: 'update_email',
        currentEmail,
        newEmail: nextLogin,
        currentPassword: updateAccountEmailChangePassword,
      });
      const pendingEmail = typeof data.email === 'string' ? data.email : nextLogin;
      setUpdateAccountPendingNewEmail(pendingEmail);
      setUpdateAccountEmailOtp('');
      setUpdateAccountEmailOtpError('');
      setUpdateAccountEmailOtpOpen(true);
    } catch (error: unknown) {
      setUpdateAccountChangeLoginError(resolveAccountUpdateErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function submitUpdateAccountEmailOtp() {
    if (!token || !updateAccountPendingNewEmail) return;
    if (updateAccountEmailOtp.trim().length !== ACCOUNT_UPDATE_OTP_LENGTH) {
      setUpdateAccountEmailOtpError(i18n.t('signupOtp.otpInvalidLength'));
      return;
    }

    setUpdateAccountEmailOtpLoading(true);
    setUpdateAccountEmailOtpError('');
    try {
      const { data } = await applyAccountUpdate(token, {
        type: 'update_email',
        currentEmail: resolveCurrentAccountLogin(),
        newEmail: updateAccountPendingNewEmail,
        otp: updateAccountEmailOtp.trim(),
        currentPassword: updateAccountEmailChangePassword,
      });
      if (data.account) setAccountProfile(data.account);
      await persistRefreshedSession(data);
      closeUpdateAccountEmailOtpModal();
      setUpdateAccountNewLogin('');
      setUpdateAccountEmailChangePassword('');
      setUpdateAccountChangeLoginSuccess(i18n.t('account.updateAccount.emailUpdateSuccess'));
    } catch (error: unknown) {
      setUpdateAccountEmailOtpError(resolveAccountUpdateErrorMessage(error));
    } finally {
      setUpdateAccountEmailOtpLoading(false);
    }
  }

  async function submitUpdateAccountChangePassword() {
    if (!token) return;
    const fieldErrors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};
    if (!updateAccountCurrentPassword) {
      fieldErrors.currentPassword = i18n.t('login.fieldErrors.passwordRequired');
    }
    if (!updateAccountNewPassword) {
      fieldErrors.newPassword = i18n.t('login.fieldErrors.passwordRequired');
    } else if (updateAccountNewPassword.length < 6) {
      fieldErrors.newPassword = i18n.t('login.fieldErrors.passwordTooShort');
    }
    if (!updateAccountConfirmNewPassword) {
      fieldErrors.confirmPassword = i18n.t('login.fieldErrors.confirmPasswordRequired');
    } else if (updateAccountNewPassword !== updateAccountConfirmNewPassword) {
      fieldErrors.confirmPassword = i18n.t('login.fieldErrors.confirmPasswordMismatch');
    }
    if (Object.keys(fieldErrors).length > 0) {
      setUpdateAccountPasswordFieldErrors(fieldErrors);
      setUpdateAccountPasswordError('');
      setUpdateAccountPasswordSuccess('');
      return;
    }

    setLoading(true);
    setUpdateAccountPasswordFieldErrors({});
    setUpdateAccountPasswordError('');
    setUpdateAccountPasswordSuccess('');
    try {
      const currentEmail = resolveCurrentAccountLogin();
      await verifyAccountUpdateRequest(token, {
        type: 'update_password',
        currentEmail,
        currentPassword: updateAccountCurrentPassword,
        newPassword: updateAccountNewPassword,
      });
      const { data } = await applyAccountUpdate(token, {
        type: 'update_password',
        currentEmail,
        currentPassword: updateAccountCurrentPassword,
        newPassword: updateAccountNewPassword,
      });
      await persistRefreshedSession(data);
      setUpdateAccountCurrentPassword('');
      setUpdateAccountNewPassword('');
      setUpdateAccountConfirmNewPassword('');
      setUpdateAccountPasswordSuccess(i18n.t('account.updateAccount.passwordUpdateSuccess'));
    } catch (error: unknown) {
      setUpdateAccountPasswordError(resolveAccountUpdateErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function submitUpdateAccountRecoverPassword() {
    if (!token) return;
    const recoveryEmail = resolveRecoverPasswordEmail();
    if (!recoveryEmail) {
      setUpdateAccountRecoverError(i18n.t('account.updateAccount.updateEmailFirst'));
      return;
    }
    setLoading(true);
    setUpdateAccountRecoverError('');
    setUpdateAccountRecoverSuccess('');
    try {
      const { data } = await verifyAccountUpdateRequest(token, { type: 'recover_password' });
      const pendingEmail = typeof data.email === 'string' ? data.email : recoveryEmail;
      setUpdateAccountRecoverPendingEmail(pendingEmail);
      setUpdateAccountRecoverOtp('');
      setUpdateAccountRecoverNewPassword('');
      setUpdateAccountRecoverConfirmPassword('');
      setUpdateAccountRecoverOtpError('');
      setUpdateAccountRecoverFieldErrors({});
      setUpdateAccountRecoverOtpOpen(true);
    } catch (error: unknown) {
      setUpdateAccountRecoverError(resolveAccountUpdateErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function changeUpdateAccountRecoverOtp(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, ACCOUNT_UPDATE_OTP_LENGTH);
    setUpdateAccountRecoverOtp(digits);
    if (updateAccountRecoverOtpError) setUpdateAccountRecoverOtpError('');
    if (updateAccountRecoverFieldErrors.otp) {
      setUpdateAccountRecoverFieldErrors((prev) => {
        const next = { ...prev };
        delete next.otp;
        return next;
      });
    }
  }

  function closeUpdateAccountRecoverOtpModal() {
    setUpdateAccountRecoverOtpOpen(false);
    setUpdateAccountRecoverOtp('');
    setUpdateAccountRecoverNewPassword('');
    setUpdateAccountRecoverConfirmPassword('');
    setUpdateAccountRecoverOtpError('');
    setUpdateAccountRecoverFieldErrors({});
    setUpdateAccountRecoverOtpLoading(false);
  }

  async function submitUpdateAccountRecoverPasswordApply() {
    if (!token) return;
    const fieldErrors: { otp?: string; newPassword?: string; confirmPassword?: string } = {};
    if (updateAccountRecoverOtp.trim().length !== ACCOUNT_UPDATE_OTP_LENGTH) {
      fieldErrors.otp = i18n.t('signupOtp.otpInvalidLength');
    }
    if (!updateAccountRecoverNewPassword) {
      fieldErrors.newPassword = i18n.t('login.fieldErrors.passwordRequired');
    } else if (updateAccountRecoverNewPassword.length < 6) {
      fieldErrors.newPassword = i18n.t('login.fieldErrors.passwordTooShort');
    }
    if (!updateAccountRecoverConfirmPassword) {
      fieldErrors.confirmPassword = i18n.t('login.fieldErrors.confirmPasswordRequired');
    } else if (updateAccountRecoverNewPassword !== updateAccountRecoverConfirmPassword) {
      fieldErrors.confirmPassword = i18n.t('login.fieldErrors.confirmPasswordMismatch');
    }
    if (Object.keys(fieldErrors).length > 0) {
      setUpdateAccountRecoverFieldErrors(fieldErrors);
      setUpdateAccountRecoverOtpError('');
      return;
    }

    setUpdateAccountRecoverOtpLoading(true);
    setUpdateAccountRecoverFieldErrors({});
    setUpdateAccountRecoverOtpError('');
    try {
      const { data } = await applyAccountUpdate(token, {
        type: 'recover_password',
        otp: updateAccountRecoverOtp.trim(),
        newPassword: updateAccountRecoverNewPassword,
      });
      await persistRefreshedSession(data);
      closeUpdateAccountRecoverOtpModal();
      setUpdateAccountRecoverSuccess(i18n.t('account.updateAccount.recoverPasswordSuccess'));
    } catch (error: unknown) {
      setUpdateAccountRecoverOtpError(resolveAccountUpdateErrorMessage(error));
    } finally {
      setUpdateAccountRecoverOtpLoading(false);
    }
  }

  async function confirmDeleteAccount() {
    if (!token) return;
    await deleteMyAccount(token);
    await logout();
  }

  function requestDeleteAccount() {
    void confirmDeleteAccount();
  }

  function goToCameraForPet(petId: string, opts?: { returnToProfile?: boolean }) {
    if (!isFeatureEnabled('health_analysis')) return;
    setHealthCheckReturnToProfile(Boolean(opts?.returnToProfile));
    setSelectedPetId(petId);
    clearHealthCheckForm();
    setHealthCheckInlineError('');
    setScreen('health-check');
  }

  function goHomeAndRefresh() {
    setScreen('home');
    if (token) void loadFeatureFlags(token);
    if (token && accountProfile?.primary_role === 'admin' && !managedUser) {
      void loadAccountDashboard(token, accountProfile.primary_role);
      return;
    }
    void refreshPets();
  }

  return {
    screen,
    setScreen,
    sessionBootstrapping,
    loading,
    refreshing,
    refreshPets,
    backendHealth,
    email,
    changeEmail,
    password,
    changePassword,
    confirmPassword,
    changeConfirmPassword,
    authError,
    authFieldErrors,
    authSuccess,
    signUpOtp,
    setSignUpOtp,
    changeSignUpOtp,
    signUpOtpError,
    isSignUp,
    pendingSignUpEmail,
    toggleLoginSignUpMode,
    token,
    accountProfile,
    pets,
    petVaccinationDueCounts,
    vaccinationDuePopupVisible,
    dismissVaccinationDuePopup,
    selectedPetId,
    setSelectedPetId,
    selectedPet,
    petFormMode,
    editingPetId,
    petName,
    setPetName,
    petSpecies,
    setPetSpecies,
    petBreed,
    setPetBreed,
    petBirthDate,
    setPetBirthDate,
    petGender,
    setPetGender,
    petAvatarUrl,
    setPetAvatarUrl,
    pickPetAvatar,
    uploadPetAvatarFromHome,
    healthCheckPhotos,
    healthCheckVideoUri,
    healthCheckWeightKg,
    setHealthCheckWeightKg,
    healthCheckVaccinated,
    setHealthCheckVaccinated,
    healthCheckVaccineIds,
    setHealthCheckVaccineIds,
    healthCheckVaccineOther,
    setHealthCheckVaccineOther,
    healthCheckNeutered,
    setHealthCheckNeutered,
    healthCheckMedicalHistory,
    setHealthCheckMedicalHistory,
    healthCheckSymptoms,
    setHealthCheckSymptoms,
    pickHealthCheckPhotos,
    pickHealthCheckVideo,
    removeHealthCheckPhoto: (index: number) => {
      setHealthCheckPhotos((prev) => prev.filter((_, i) => i !== index));
    },
    clearHealthCheckVideo: () => setHealthCheckVideoUri(null),
    analyzeHealthCheck,
    closeHealthCheck,
    currentResult,
    analysisProgressStage,
    analysisProgressMessage,
    healthCheckInlineError,
    setHealthCheckInlineError,
    analysisCooldownSeconds,
    analysisSubmitting,
    resultImageUri,
    warnings,
    history,
    historyHasMore: Boolean(historyNextCursor),
    historyLoadingMore,
    historyTotalCount,
    loadMorePetHistory,
    aiCredits,
    aiEconomicsConfig,
    refreshAiCredits: token ? () => refreshAiCredits(token) : undefined,
    submitAuth,
    openForgotPassword,
    backToLoginFromForgotPassword,
    submitForgotPasswordSendOtp,
    submitForgotPasswordApply,
    changeForgotPasswordEmail,
    changeForgotPasswordOtp,
    setForgotPasswordNewPassword,
    setForgotPasswordConfirmPassword,
    closeForgotPasswordOtpModal,
    forgotPasswordError,
    forgotPasswordSuccess,
    forgotPasswordFieldErrors,
    forgotPasswordOtpOpen,
    forgotPasswordPendingEmail,
    forgotPasswordOtp,
    forgotPasswordNewPassword,
    forgotPasswordConfirmPassword,
    forgotPasswordOtpError,
    forgotPasswordRecoverFieldErrors,
    forgotPasswordOtpLoading,
    forgotPasswordRateLimitSeconds,
    submitSignUpOtpVerification,
    backToSignUpFromOtpVerification,
    handleAddPet,
    handleUpdatePet,
    openCreatePet,
    openEditPet,
    cancelPetForm,
    handleDeletePet,
    openHistory,
    openHistoryDetail,
    dismissResults,
    openPetProfile,
    openCareServices,
    closeCareServices,
    careServicesShowBack: !initialOnboarding,
    closePetProfile,
    refreshPetProfile,
    openCoreCare,
    closeCoreCare,
    openCoreCareInfo,
    closeCoreCareInfo,
    openVetSummary,
    closeVetSummary,
    coreCareRecords,
    coreCareSummary,
    creditLedger,
    createCoreCareEntry,
    markReminderDone,
    claimAdCredit,
    watchRewardedAdForCredit,
    openPremiumSubscription,
    logout,
    goToCameraForPet,
    goHomeAndRefresh,
    openPetFeed,
    openAccount,
    openUpdateAccount,
    openLanguageSelection,
    backFromLanguageSelection,
    backFromUpdateAccount,
    backToUpdateAccount,
    openUpdateAccountChangeLogin,
    openUpdateAccountChangePassword,
    openUpdateAccountRecoverPassword,
    submitUpdateAccountChangeLogin,
    submitUpdateAccountChangePassword,
    submitUpdateAccountRecoverPassword,
    submitUpdateAccountEmailOtp,
    updateAccountNewLogin,
    changeUpdateAccountNewLogin,
    updateAccountEmailChangePassword,
    changeUpdateAccountEmailChangePassword,
    updateAccountChangeLoginError,
    updateAccountChangeLoginFieldErrors,
    updateAccountChangeLoginSuccess,
    updateAccountEmailOtpOpen,
    updateAccountPendingNewEmail,
    updateAccountEmailOtp,
    updateAccountEmailOtpError,
    updateAccountEmailOtpLoading,
    changeUpdateAccountEmailOtp,
    closeUpdateAccountEmailOtpModal,
    updateAccountCurrentPassword,
    setUpdateAccountCurrentPassword,
    updateAccountNewPassword,
    setUpdateAccountNewPassword,
    updateAccountConfirmNewPassword,
    setUpdateAccountConfirmNewPassword,
    updateAccountPasswordError,
    updateAccountPasswordSuccess,
    updateAccountPasswordFieldErrors,
    updateAccountRecoverError,
    updateAccountRecoverSuccess,
    updateAccountRecoverOtpOpen,
    updateAccountRecoverPendingEmail,
    updateAccountRecoverOtp,
    updateAccountRecoverNewPassword,
    updateAccountRecoverConfirmPassword,
    updateAccountRecoverOtpError,
    updateAccountRecoverFieldErrors,
    updateAccountRecoverOtpLoading,
    changeUpdateAccountRecoverOtp,
    setUpdateAccountRecoverNewPassword,
    setUpdateAccountRecoverConfirmPassword,
    closeUpdateAccountRecoverOtpModal,
    submitUpdateAccountRecoverPasswordApply,
    confirmDeleteAccount,
    requestDeleteAccount,
    refreshPetFeed,
    loadMorePetFeed,
    loadMoreAnnouncements,
    petFeedPosts,
    announcementPosts,
    topBreederProfiles,
    petFeedInitialLoading,
    petFeedInitialError,
    announcementInitialLoading,
    announcementInitialError,
    petFeedLoadingMore,
    announcementLoadingMore,
    petFeedHasMore: Boolean(petFeedNextCursor),
    announcementHasMore: Boolean(announcementNextCursor),
    petFeedLoadMoreError,
    announcementLoadMoreError,
    managedUser,
    selectedBreederProfile,
    selectedBreederPosts,
    openBreederDetail,
    closeBreederDetail,
    togglePetFeedFavorite,
    fetchPetFeedPostDetail,
    fetchPetFeedPostComments,
    submitPetFeedComment,
    deletePetFeedComment,
    submitPetFeedCommentReport,
    submitBreederProfileReport,
    hideBreederProfile,
    myPetFeedPosts,
    breederProfile,
    openBreederProfile,
    closeBreederProfile,
    saveBreederProfile,
    cancelBreederVerificationRequest,
    openCreatePetFeedPost,
    openEditPetFeedDraft,
    openCreateAdminPost,
    closeCreateAdminPost,
    submitAnnouncementPost,
    closeCreatePetFeedPost,
    submitPetFeedPost,
    updatePetFeedDraft,
    submitPetFeedDraftForReview,
    editingPetFeedPost,
    submitPetFeedReport,
    adminFeedPosts,
    adminFeedReports,
    adminAccounts,
    adminBreederProfiles,
    openAdminHub,
    closeAdminHub,
    openAdminFeatures,
    updateAdminFeatureFlag,
    appFeatureFlags,
    featureFlagsLoading,
    featureFlagSavingKey,
    isFeatureEnabled,
    petFeedEnabledTabs: {
      news: appFeatureFlags?.pet_feed_news !== false,
      feed: appFeatureFlags?.pet_feed_listings !== false,
      breeders: appFeatureFlags?.pet_feed_breeders !== false,
    },
    openAdminUserDetail,
    closeAdminUserDetail,
    adminSelectedAccount,
    adminUserPets,
    adminUserPetsLoading,
    openAdminAddPetForUser,
    enterManagedUser,
    exitManagedUser,
    loadAdminUserPets,
    adminAddPetForUserId,
    openAdminReview,
    closeAdminReview,
    loadAdminReview,
    refreshAdminReview: () => ensureAdminReviewLoaded(token, { force: true }),
    createAdminManagedAccount,
    updateAdminManagedAccount,
    updateAdminBreederStatus,
    updateAdminPostStatus,
    updateAdminReportStatus,
    openBreedRecognition,
    closeBreedRecognition,
    breedRecognitionSlotUris,
    breedRecognitionResult,
    breedRecognitionLoading,
    pickBreedRecognitionSlot,
    clearBreedRecognitionSlot,
    submitBreedRecognition,
    editBreedRecognitionPhotos,
    applyBreedRecognitionToProfile,
    handleOnboardingAddPet,
    cancelOnboardingAddPet,
    startInitialOnboardingFromIntro,
    goToHealthCheckFromServicesPrompt,
    goToCoreCareFromServicesPrompt,
    dismissServicesPrompt,
    goToOnboardingHealthCheckFromPrompt,
    skipInitialHealthOnboarding,
    finishInitialOnboardingAfterResults,
  };
}
