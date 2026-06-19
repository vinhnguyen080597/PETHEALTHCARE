import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { birthDateToAgeMonths, petBirthDateForForm } from '../utils/petAge';
import {
  AnalyzeRequestError,
  ApiRequestError,
  analyzePetHealthCheck,
  blockBreederProfile,
  claimRewardedAdCredit,
  createAdminAccount,
  createAdminUserPet,
  createAnnouncementPost,
  createCoreCareRecord,
  createAdminUserCoreCareRecord,
  createPetFeedPost,
  createPet,
  deleteAdminUserCoreCareRecord,
  deleteMyAccount,
  deletePet,
  favoritePetFeedPost,
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
  listAiCreditLedger,
  listCoreCareRecords,
  listMyAnnouncementPosts,
  listMyPetFeedPosts,
  listPetFeedPosts,
  listPets,
  listVerifiedBreederProfiles,
  reportBreederProfile,
  reportPetFeedPost,
  requestBreedRecognition,
  translateAnalysesDisplay,
  login,
  signUp,
  updateAdminUserCoreCareRecord,
  updateAdminUserPet,
  updateCoreCareRecord,
  updateAdminAccount,
  updateAdminBreederProfileStatus,
  updateAdminPetFeedPostStatus,
  updateAdminPetFeedReportStatus,
  updatePet,
  unfavoritePetFeedPost,
  upsertMyBreederProfile,
  uploadPetAvatar,
} from '../api';
import { preloadMaiOnboardingImages } from '../assets/maiOnboardingAssets';
import { preloadServicesOnboardingImages } from '../assets/servicesOnboardingAssets';
import { PENDING_INITIAL_ONBOARDING_KEY } from '../constants/auth';
import { isBreedRecognitionSpecies, type BreedRecognitionSlot } from '../constants/petBreedRecognitionSlots';
import { getStoredAuthToken, removeStoredAuthToken, setStoredAuthToken } from '../utils/authTokenStorage';
import type {
  AiCreditAccount,
  AiEconomicsConfig,
  Analysis,
  AccountProfile,
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
  PetFeedReport,
  UpsertBreederProfilePayload,
  UserRole,
} from '../types';
import type { AppScreen } from '../screens/types';
import type { AnalysisProgressStage } from '../screens/AnalysisProgressScreen';
import i18n from '../i18n';
import { formatHealthCheckVaccineTypeForApi } from '../utils/formatHealthCheckVaccineType';
import { postsForBreeder } from '../utils/breederTrust';
import { getAnalyzeBlockReason, mapAnalyzeFriendlyMessage } from './usePetHealthApp.logic';

type BackendHealthStatus = 'checking' | 'online' | 'offline';
const PET_FEED_PAGE_SIZE = 12;

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

export function usePetHealthApp() {
  const [screen, setScreen] = useState<AppScreen>('login');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [backendHealth, setBackendHealth] = useState<BackendHealthStatus>('checking');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  /** True during first-run flow until user skips health or taps Finish on results. */
  const [initialOnboarding, setInitialOnboarding] = useState(false);

  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);

  const [petName, setPetName] = useState('');
  const [petSpecies, setPetSpecies] = useState('dog');
  const [petBreed, setPetBreed] = useState('');
  const [petBirthDate, setPetBirthDate] = useState('');
  const [petGender, setPetGender] = useState('male');
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
  const [aiCredits, setAiCredits] = useState<AiCreditAccount | null>(null);
  const [aiEconomicsConfig, setAiEconomicsConfig] = useState<AiEconomicsConfig | null>(null);
  const [creditLedger, setCreditLedger] = useState<Array<Record<string, unknown>>>([]);
  const [coreCareRecords, setCoreCareRecords] = useState<CoreCareRecord[]>([]);
  const [coreCareSummary, setCoreCareSummary] = useState<CoreCareSummary | null>(null);
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
    setPetSpecies('dog');
    setPetBreed('');
    setPetBirthDate('');
    setPetGender('male');
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
      const response = await getAiCreditSummary(accessToken);
      setAiCredits(response.data.account);
      setAiEconomicsConfig(response.data.config);
      const ledger = await listAiCreditLedger(accessToken);
      setCreditLedger(ledger.data.slice(0, 20));
    } catch {
      // Credits are advisory in the UI; backend remains the source of truth.
    }
  }, []);

  const fetchAccountProfile = useCallback(async (accessToken: string) => {
    const response = await getMe(accessToken);
    setAccountProfile(response.data);
    return response.data;
  }, []);

  const refreshCoreCare = useCallback(
    async (petId: string = selectedPetId ?? '') => {
      if (!token || !petId) return;
      const response = managedUser
        ? await listAdminUserCoreCareRecords(token, managedUser.userId, petId)
        : await listCoreCareRecords(token, petId);
      setCoreCareRecords(response.data);
      setCoreCareSummary(response.summary);
    },
    [managedUser, selectedPetId, token],
  );

  const refreshPets = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      await fetchPets(token);
    } finally {
      setRefreshing(false);
    }
  }, [token, fetchPets]);

  const loadPetFeedFirstPage = useCallback(async (accessToken: string, options: { showInitialLoading?: boolean } = {}) => {
    if (options.showInitialLoading) setPetFeedInitialLoading(true);
    setPetFeedInitialError('');
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
      setAnnouncementInitialError('');
      setTopBreederProfiles(breedersResponse.data);
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      setPetFeedInitialError(message);
      return false;
    } finally {
      if (options.showInitialLoading) setPetFeedInitialLoading(false);
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
    async (petId: string): Promise<Analysis[]> => {
      if (!token) return [];
      const wantVi = Boolean(i18n.language?.startsWith('vi'));
      const res = managedUser
        ? await listAdminUserAnalyses(token, managedUser.userId, petId, wantVi ? 'vi' : undefined)
        : await listHistoryByPet(token, petId, wantVi ? { displayLocale: 'vi' } : undefined);
      let rows = res.data;
      if (!wantVi) return rows;

      const pending = rows.filter((a) => {
        const ol = String(a.output_locale ?? '').toLowerCase();
        if (ol.startsWith('vi')) return false;
        return !(a.display_translations?.vi && typeof a.display_translations.vi === 'object');
      });

      if (pending.length === 0) return rows;

      try {
        const tr = await translateAnalysesDisplay(token, {
          analysisIds: pending.map((p) => p.id),
          petId,
          targetLocale: 'vi',
        });
        const merged = new Map(tr.data.map((r) => [r.id, r]));
        rows = rows.map((h) => merged.get(h.id) ?? h);
        void refreshAiCredits(token);
      } catch {
        /* offline or translate failure — leave English snippets */
      }
      return rows;
    },
    [managedUser, token, i18n.language, refreshAiCredits],
  );

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

  async function initializeApp() {
    try {
      await healthCheck();
      setBackendHealth('online');
    } catch {
      setBackendHealth('offline');
    }

    const savedToken = await getStoredAuthToken();
    if (savedToken) {
      setToken(savedToken);
      try {
        const petsList = await fetchPets(savedToken);
        await refreshAiCredits(savedToken);
        const profile = await fetchAccountProfile(savedToken);
        if (profile.primary_role === 'admin') {
          await loadAccountDashboard(savedToken, profile.primary_role);
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
        } else {
          setScreen('home');
        }
      } catch {
        await removeStoredAuthToken();
        await AsyncStorage.removeItem(PENDING_INITIAL_ONBOARDING_KEY);
        setToken(null);
        setInitialOnboarding(false);
      }
    }
  }

  async function completeInitialOnboarding() {
    await AsyncStorage.removeItem(PENDING_INITIAL_ONBOARDING_KEY);
    setInitialOnboarding(false);
  }

  const applySession = useCallback(
    async (accessToken: string, options?: { startInitialOnboarding?: boolean }) => {
      await setStoredAuthToken(accessToken);
      setToken(accessToken);
      const petsList = await fetchPets(accessToken);
      await refreshAiCredits(accessToken);
      const profile = await fetchAccountProfile(accessToken);
      if (profile.primary_role === 'admin') {
        await loadAccountDashboard(accessToken, profile.primary_role);
      }

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
          /* still show intro */
        }
        setScreen('onboarding-intro');
        return;
      }

      setInitialOnboarding(false);
      setScreen('home');
    },
    [fetchAccountProfile, fetchPets, refreshAiCredits],
  );

  function toggleLoginSignUpMode() {
    setIsSignUp((prev) => {
      if (prev) {
        setConfirmPassword('');
      }
      return !prev;
    });
  }

  async function submitAuth() {
    if (!email.trim() || !password) {
      Alert.alert(
        i18n.t('alerts.missingEmailPassword.title'),
        i18n.t('alerts.missingEmailPassword.message'),
      );
      return;
    }
    if (isSignUp) {
      if (password !== confirmPassword) {
        Alert.alert(
          i18n.t('alerts.signUpPasswordMismatch.title'),
          i18n.t('alerts.signUpPasswordMismatch.message'),
        );
        return;
      }
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const signUpRes = await signUp({ email: email.trim(), password });
        const signUpToken = signUpRes.data.session?.access_token;
        if (!signUpToken) {
          Alert.alert(i18n.t('alerts.verifyEmail.title'), i18n.t('alerts.verifyEmail.message'));
          return;
        }
        await applySession(signUpToken, { startInitialOnboarding: true });
        return;
      }

      const response = await login({ email: email.trim(), password });
      const accessToken = response.data.session?.access_token;
      if (!accessToken) {
        Alert.alert(i18n.t('alerts.loginNoToken.title'), i18n.t('alerts.loginNoToken.message'));
        return;
      }
      await applySession(accessToken);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('alerts.authFailed.title'), i18n.t('alerts.authFailed.message', { message }));
    } finally {
      setLoading(false);
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

  async function showServicesPromptForNewPet(petId: string) {
    await openCareServices(petId);
  }

  async function handleAddPet() {
    if (!token) return;
    if (!petName.trim() || !petSpecies.trim() || !petBirthDate.trim() || !petAvatarStorageUrl.trim()) {
      Alert.alert(i18n.t('alerts.missingPetInfo.title'), i18n.t('alerts.missingPetInfo.message'));
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
    if (!selectedPetId) return;
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
    if (!petName.trim() || !petSpecies.trim() || !petBirthDate.trim() || (!petAvatarStorageUrl.trim() && !petAvatarUrl.trim())) {
      Alert.alert(i18n.t('alerts.missingPetInfo.title'), i18n.t('alerts.missingPetInfo.message'));
      return;
    }

    setLoading(true);
    try {
      const avatarPatch = petAvatarStorageUrl ? { avatarUrl: petAvatarStorageUrl } : petAvatarUrl.trim() ? {} : { avatarUrl: null };
      const payload = {
        name: petName.trim(),
        species: petSpecies.trim().toLowerCase(),
        breed: petBreed.trim() || null,
        ...petPayloadFromBirthDate(petBirthDate),
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
          setHistory(mergedHistory);
        } catch {
          setHistory([]);
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
      const mergedHistory = await fetchPetHistoryMerged(petId);
      setHistory(mergedHistory);
      await refreshCoreCare(petId);
      setScreen('pet-profile');
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
      setHistory(mergedHistory);
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
      setHistory(merged);
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
    await loadPetFeedFirstPage(token, { showInitialLoading: petFeedPosts.length === 0 });
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
          await loadAdminReview(accessToken);
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

  function openCreatePetFeedPost() {
    if (hasAccountRole('admin')) {
      openCreateAdminPost();
      return;
    }
    if (!hasAccountRole('breeder') || breederProfile?.verification_status !== 'verified') {
      Alert.alert(i18n.t('account.roleRequiredTitle'), i18n.t('account.breederOnly'));
      return;
    }
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
    setScreen(accountProfile?.primary_role === 'admin' ? 'home' : 'breeder-profile');
  }

  async function submitPetFeedPost(payload: CreatePetFeedPostPayload, media: CreatePetFeedPostMedia) {
    if (!token) return;
    await createPetFeedPost(token, payload, media);
    const postsRes = await listMyPetFeedPosts(token);
    setMyPetFeedPosts(postsRes.data);
    setScreen(accountProfile?.primary_role === 'admin' ? 'home' : 'breeder-profile');
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
      await loadAdminReview(token);
      setScreen('admin-hub');
    } finally {
      setLoading(false);
    }
  }

  function closeAdminHub() {
    setScreen('home');
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
    setAdminAccounts([]);
    setAdminBreederProfiles([]);
    setAdminFeedPosts([]);
    setAdminFeedReports([]);
    try {
      await loadAdminReview();
    } catch {
      // The admin screen can still show and let the user retry manually.
    }
    setScreen('admin-review');
  }

  function closeAdminReview() {
    setScreen(accountProfile?.primary_role === 'admin' ? 'home' : 'account');
  }

  async function loadAdminReview(accessToken: string | null = token) {
    if (!accessToken) return;
    const [accountsRes, breedersRes, postsRes, reportsRes] = await Promise.all([
      listAdminAccounts(accessToken),
      listAdminBreederProfiles(accessToken),
      listAdminPetFeedPosts(accessToken, ''),
      listAdminPetFeedReports(accessToken, ''),
    ]);
    setAdminAccounts(accountsRes.data);
    setAdminBreederProfiles(breedersRes.data);
    setAdminFeedPosts(postsRes.data);
    setAdminFeedReports(reportsRes.data);
  }

  async function createAdminManagedAccount(payload: AdminCreateAccountPayload) {
    if (!token) return;
    try {
      await createAdminAccount(token, payload);
      await loadAdminReview();
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
    await loadAdminReview();
  }

  async function updateAdminBreederStatus(userId: string, verificationStatus: string) {
    if (!token) return;
    await updateAdminBreederProfileStatus(token, userId, verificationStatus);
    await loadAdminReview();
  }

  async function updateAdminPostStatus(postId: string, status: string) {
    if (!token) return;
    await updateAdminPetFeedPostStatus(token, postId, status);
    await loadAdminReview();
  }

  async function updateAdminReportStatus(reportId: string, status: string) {
    if (!token) return;
    await updateAdminPetFeedReportStatus(token, reportId, status);
    await loadAdminReview();
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

  async function claimAdCredit() {
    if (!token) return;
    try {
      const response = await claimRewardedAdCredit(token);
      setAiCredits(response.data.account);
      await refreshAiCredits(token);
      Alert.alert(i18n.t('common.ok'), i18n.t('coreCare.claimAdSuccess', { credits: response.data.grantedCredits }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('coreCare.creditsTitle'), message);
    }
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
      setHistory(mergedHistory);
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
      setHistory(mergedHistory);
      setScreen('history');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('alerts.historyFailed.title'), i18n.t('alerts.historyFailed.message', { message }));
    } finally {
      setLoading(false);
    }
  }

  function openHistoryDetail(
    entry: Analysis,
    source: 'home' | 'history' | 'pet-profile' = 'home',
  ) {
    setResultsReturnScreen(source === 'home' ? 'home' : source);
    setCurrentResult(entry);
    setResultImageUri(entry.image_url);
    setWarnings([]);
    setScreen('results');
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
        void fetchPetHistoryMerged(selectedPetId).then(setHistory);
      }
      return;
    }
    goHomeAndRefresh();
  }

  async function logout() {
    await removeStoredAuthToken();
    await AsyncStorage.removeItem(PENDING_INITIAL_ONBOARDING_KEY);
    setInitialOnboarding(false);
    setToken(null);
    setAccountProfile(null);
    setPets([]);
    setAiCredits(null);
    setAiEconomicsConfig(null);
    setCreditLedger([]);
    setCoreCareRecords([]);
    setCoreCareSummary(null);
    setPetFeedPosts([]);
    setAnnouncementPosts([]);
    setTopBreederProfiles([]);
    setMyPetFeedPosts([]);
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
    setSelectedPetId(null);
    clearHealthCheckForm();
    setCurrentResult(null);
    setResultImageUri(null);
    setHistory([]);
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
                monthlyResetAt: error.monthlyResetAt ?? prev.monthlyResetAt,
              }
            : prev,
        );
      }
      const message =
        error instanceof ApiRequestError && error.code === 'AI_CREDITS_EXHAUSTED'
          ? i18n.t('alerts.aiCreditsExhausted.message')
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

  function requestDeleteAccount() {
    if (!token) return;
    Alert.alert(i18n.t('account.deleteAccount.title'), i18n.t('account.deleteAccount.message'), [
      { text: i18n.t('common.cancel'), style: 'cancel' },
      {
        text: i18n.t('account.deleteAccount.confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMyAccount(token);
            await logout();
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
            Alert.alert(i18n.t('account.deleteAccount.failedTitle'), message);
          }
        },
      },
    ]);
  }

  function goToCameraForPet(petId: string, opts?: { returnToProfile?: boolean }) {
    setHealthCheckReturnToProfile(Boolean(opts?.returnToProfile));
    setSelectedPetId(petId);
    clearHealthCheckForm();
    setHealthCheckInlineError('');
    setScreen('health-check');
  }

  function goHomeAndRefresh() {
    setScreen('home');
    if (token && accountProfile?.primary_role === 'admin' && !managedUser) {
      void loadAccountDashboard(token, accountProfile.primary_role);
      return;
    }
    void refreshPets();
  }

  return {
    screen,
    setScreen,
    loading,
    refreshing,
    refreshPets,
    backendHealth,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isSignUp,
    toggleLoginSignUpMode,
    token,
    accountProfile,
    pets,
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
    aiCredits,
    aiEconomicsConfig,
    refreshAiCredits: token ? () => refreshAiCredits(token) : undefined,
    submitAuth,
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
    logout,
    goToCameraForPet,
    goHomeAndRefresh,
    openPetFeed,
    openAccount,
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
    submitBreederProfileReport,
    hideBreederProfile,
    myPetFeedPosts,
    breederProfile,
    openBreederProfile,
    closeBreederProfile,
    saveBreederProfile,
    openCreatePetFeedPost,
    openCreateAdminPost,
    closeCreateAdminPost,
    submitAnnouncementPost,
    closeCreatePetFeedPost,
    submitPetFeedPost,
    submitPetFeedReport,
    adminFeedPosts,
    adminFeedReports,
    adminAccounts,
    adminBreederProfiles,
    openAdminHub,
    closeAdminHub,
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
