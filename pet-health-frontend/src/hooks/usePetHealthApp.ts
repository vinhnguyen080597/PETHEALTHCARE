import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import {
  AnalyzeRequestError,
  ApiRequestError,
  analyzePetHealthCheck,
  createPet,
  deletePet,
  getPet,
  healthCheck,
  getAiCreditSummary,
  listHistoryByPet,
  listPets,
  requestBreedRecognition,
  translateAnalysesDisplay,
  login,
  oauthApple,
  oauthGoogle,
  signUp,
  updatePet,
  uploadPetAvatar,
} from '../api';
import { isGoogleOAuthConfigured } from '../config';
import { preloadMaiOnboardingImages } from '../assets/maiOnboardingAssets';
import { preloadServicesOnboardingImages } from '../assets/servicesOnboardingAssets';
import { PENDING_INITIAL_ONBOARDING_KEY, TOKEN_STORAGE_KEY } from '../constants/auth';
import { isBreedRecognitionSpecies, type BreedRecognitionSlot } from '../constants/petBreedRecognitionSlots';
import { useGoogleIdTokenAuth } from './useGoogleIdTokenAuth';
import type { AiCreditAccount, AiEconomicsConfig, Analysis, BreedRecognitionResult, Pet } from '../types';
import type { AppScreen } from '../screens/types';
import type { AnalysisProgressStage } from '../screens/AnalysisProgressScreen';
import i18n from '../i18n';
import { formatHealthCheckVaccineTypeForApi } from '../utils/formatHealthCheckVaccineType';
import { getAnalyzeBlockReason, mapAnalyzeFriendlyMessage } from './usePetHealthApp.logic';

type BackendHealthStatus = 'checking' | 'online' | 'offline';

/** `blob:` URLs only exist in that browser tab — the API cannot store them. */
function avatarUrlForApi(uri: string): string | undefined {
  const s = uri.trim();
  if (!s) return undefined;
  if (s.toLowerCase().startsWith('blob:')) return undefined;
  return s;
}

function avatarUrlForUpdate(uri: string): string | null {
  const s = uri.trim();
  if (!s) return null;
  if (s.toLowerCase().startsWith('blob:')) return null;
  return s;
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
  /** True during email sign-up first-run flow until user skips health or taps Finish on results. */
  const [initialOnboarding, setInitialOnboarding] = useState(false);

  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);

  const [petName, setPetName] = useState('');
  const [petSpecies, setPetSpecies] = useState('dog');
  const [petBreed, setPetBreed] = useState('');
  const [petAge, setPetAge] = useState('');
  const [petGender, setPetGender] = useState('male');
  const [petAvatarUrl, setPetAvatarUrl] = useState('');

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
  const [appleSignInAvailable, setAppleSignInAvailable] = useState(false);

  const [breedRecognitionSlotUris, setBreedRecognitionSlotUris] = useState<Record<string, string>>({});
  const [breedRecognitionResult, setBreedRecognitionResult] = useState<BreedRecognitionResult | null>(null);
  const [breedRecognitionLoading, setBreedRecognitionLoading] = useState(false);
  const [breedRecognitionReturnScreen, setBreedRecognitionReturnScreen] = useState<
    'health-check' | 'onboarding-health-check' | 'onboarding-health-prompt' | 'pet-profile' | null
  >(null);

  const [googleAuthRequest, , promptGoogleAsync] = useGoogleIdTokenAuth();

  const selectedPet = useMemo(() => pets.find((pet) => pet.id === selectedPetId) ?? null, [pets, selectedPetId]);

  const petFormMode = editingPetId ? 'edit' : 'create';

  function clearPetForm() {
    setPetName('');
    setPetSpecies('dog');
    setPetBreed('');
    setPetAge('');
    setPetGender('male');
    setPetAvatarUrl('');
    setEditingPetId(null);
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

  const fetchPets = useCallback(async (accessToken: string): Promise<Pet[]> => {
    const response = await listPets(accessToken);
    setPets(response.data);
    if (response.data.length > 0) {
      setSelectedPetId((previous) => previous ?? response.data[0].id);
    } else {
      setSelectedPetId(null);
    }
    return response.data;
  }, []);

  const refreshAiCredits = useCallback(async (accessToken: string) => {
    try {
      const response = await getAiCreditSummary(accessToken);
      setAiCredits(response.data.account);
      setAiEconomicsConfig(response.data.config);
    } catch {
      // Credits are advisory in the UI; backend remains the source of truth.
    }
  }, []);

  const refreshPets = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      await fetchPets(token);
    } finally {
      setRefreshing(false);
    }
  }, [token, fetchPets]);

  /** History rows merged for current UI language; English-only archives get one-time Gemini translation via API. */
  const fetchPetHistoryMerged = useCallback(
    async (petId: string): Promise<Analysis[]> => {
      if (!token) return [];
      const wantVi = Boolean(i18n.language?.startsWith('vi'));
      const res = await listHistoryByPet(token, petId, wantVi ? { displayLocale: 'vi' } : undefined);
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
    [token, i18n.language, refreshAiCredits],
  );

  useEffect(() => {
    void initializeApp();
  }, []);

  useEffect(() => {
    void AppleAuthentication.isAvailableAsync().then(setAppleSignInAvailable);
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

    const savedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (savedToken) {
      setToken(savedToken);
      try {
        const petsList = await fetchPets(savedToken);
        await refreshAiCredits(savedToken);
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
        await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
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
    async (accessToken: string, options?: { startInitialPetOnboarding?: boolean }) => {
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
      setToken(accessToken);
      const petsList = await fetchPets(accessToken);
      await refreshAiCredits(accessToken);

      if (options?.startInitialPetOnboarding) {
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
    [fetchPets, refreshAiCredits],
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
    if (!email || !password) {
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
        const signUpRes = await signUp({ email, password });
        const signUpToken = signUpRes.data.session?.access_token;
        if (!signUpToken) {
          Alert.alert(i18n.t('alerts.verifyEmail.title'), i18n.t('alerts.verifyEmail.message'));
          return;
        }
        await applySession(signUpToken, { startInitialPetOnboarding: true });
        return;
      }

      const response = await login({ email, password });
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

  async function submitGoogleAuth() {
    if (!isGoogleOAuthConfigured()) {
      Alert.alert(
        i18n.t('alerts.googleNotConfigured.title'),
        i18n.t('alerts.googleNotConfigured.message'),
      );
      return;
    }
    if (!googleAuthRequest) {
      Alert.alert(i18n.t('alerts.googleLoading.title'), i18n.t('alerts.googleLoading.message'));
      return;
    }
    if (__DEV__) {
      // If Google returns "redirect_uri_mismatch", add this EXACT string to the matching OAuth client in Google Cloud Console.
      console.log('[Google OAuth] redirectUri (must be in Authorized redirect URIs):', googleAuthRequest.redirectUri);
    }
    setLoading(true);
    try {
      const result = await promptGoogleAsync();
      if (result.type === 'cancel' || result.type === 'dismiss') {
        return;
      }
      if (result.type !== 'success') {
        const errMsg =
          result.type === 'error'
            ? (result.error instanceof Error ? result.error.message : result.errorCode) ??
              i18n.t('common.somethingWentWrong')
            : i18n.t('alerts.googleSignInIncomplete.message');
        Alert.alert(i18n.t('alerts.googleSignInIncomplete.title'), errMsg);
        return;
      }
      const idToken = result.params.id_token;
      if (!idToken) {
        Alert.alert(i18n.t('alerts.googleNoIdToken.title'), i18n.t('alerts.googleNoIdToken.message'));
        return;
      }
      const response = await oauthGoogle(idToken);
      const accessToken = response.data.session?.access_token;
      if (!accessToken) {
        Alert.alert(i18n.t('alerts.googleNoAccessToken.title'), i18n.t('alerts.googleNoAccessToken.message'));
        return;
      }
      await applySession(accessToken);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      if (/nonce/i.test(message)) {
        Alert.alert(i18n.t('alerts.googleNonce.title'), i18n.t('alerts.googleNonce.message'));
        return;
      }
      Alert.alert(i18n.t('alerts.googleSignInFailed.title'), i18n.t('alerts.googleSignInFailed.message', { message }));
    } finally {
      setLoading(false);
    }
  }

  async function submitAppleAuth() {
    if (!(await AppleAuthentication.isAvailableAsync())) {
      Alert.alert(i18n.t('alerts.appleUnavailable.title'), i18n.t('alerts.appleUnavailable.message'));
      return;
    }
    setLoading(true);
    try {
      const rawNonce = Crypto.randomUUID();
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: rawNonce,
      });
      if (!credential.identityToken) {
        Alert.alert(i18n.t('alerts.appleNoIdentityToken.title'), i18n.t('alerts.appleNoIdentityToken.message'));
        return;
      }
      const response = await oauthApple(credential.identityToken, rawNonce);
      const accessToken = response.data.session?.access_token;
      if (!accessToken) {
        Alert.alert(i18n.t('alerts.appleNoAccessToken.title'), i18n.t('alerts.appleNoAccessToken.message'));
        return;
      }
      await applySession(accessToken);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'ERR_REQUEST_CANCELED'
      ) {
        return;
      }
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('alerts.appleSignInFailed.title'), i18n.t('alerts.appleSignInFailed.message', { message }));
    } finally {
      setLoading(false);
    }
  }

  async function showServicesPromptForNewPet(petId: string) {
    setSelectedPetId(petId);
    try {
      await preloadServicesOnboardingImages();
    } catch {
      /* show screen even if preload fails */
    }
    setScreen('onboarding-health-prompt');
  }

  async function handleAddPet() {
    if (!token) return;
    if (!petName.trim() || !petSpecies.trim()) {
      Alert.alert(i18n.t('alerts.missingPetInfo.title'), i18n.t('alerts.missingPetInfo.message'));
      return;
    }

    setLoading(true);
    try {
      const avatarForApi = avatarUrlForApi(petAvatarUrl);
      const { data: created } = await createPet(token, {
        name: petName.trim(),
        species: petSpecies.trim().toLowerCase(),
        breed: petBreed.trim() || undefined,
        age: petAge ? Number(petAge) : undefined,
        gender: petGender,
        ...(avatarForApi !== undefined ? { avatarUrl: avatarForApi } : {}),
      });
      clearPetForm();
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

  function startInitialOnboardingFromIntro() {
    if (pets.length === 0) {
      clearPetForm();
      setScreen('onboarding-add-pet');
      return;
    }
    setSelectedPetId((prev) => prev ?? pets[0]?.id ?? null);
    void preloadServicesOnboardingImages().finally(() => setScreen('onboarding-health-prompt'));
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
    if (!petName.trim() || !petSpecies.trim()) {
      Alert.alert(i18n.t('alerts.missingPetInfo.title'), i18n.t('alerts.missingPetInfo.message'));
      return;
    }

    setLoading(true);
    try {
      await updatePet(token, editingPetId, {
        name: petName.trim(),
        species: petSpecies.trim().toLowerCase(),
        breed: petBreed.trim() || null,
        age: petAge ? Number(petAge) : null,
        gender: petGender,
        avatarUrl: avatarUrlForUpdate(petAvatarUrl),
      });
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
      setPetAge(data.age !== null && data.age !== undefined ? String(data.age) : '');
      setPetGender(data.gender === 'female' || data.gender === 'male' ? data.gender : 'male');
      setPetAvatarUrl(data.avatar_url ?? '');
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('common.unknownError');
      Alert.alert(i18n.t('alerts.refreshFailed.title'), i18n.t('alerts.refreshFailed.message', { message }));
    } finally {
      setRefreshing(false);
    }
  }

  function cancelPetForm() {
    const backToProfile = petFormReturnToProfile;
    clearPetForm();
    setPetFormReturnToProfile(false);
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
      setPetAvatarUrl(data.avatarUrl);
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
      const status = response.data.status;
      if (status === 'need_more_data' || status === 'not_pet_or_unclear') {
        const nextSummary = response.data.next_action?.summary?.trim() ?? '';
        const askMore = response.data.next_action?.ask_user_to_add?.filter(Boolean) ?? [];
        const missing = response.data.missing_data?.filter(Boolean) ?? [];
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
      const redFlags = response.data.red_flags?.filter(Boolean) ?? [];
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
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    await AsyncStorage.removeItem(PENDING_INITIAL_ONBOARDING_KEY);
    setInitialOnboarding(false);
    setToken(null);
    setPets([]);
    setAiCredits(null);
    setAiEconomicsConfig(null);
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
    try {
      const res = await requestBreedRecognition(token, {
        petId: selectedPetId,
        slotUris: breedRecognitionSlotUris,
        locale: i18n.language,
      });
      setBreedRecognitionResult(res.data);
      void refreshAiCredits(token);
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
    } finally {
      setBreedRecognitionLoading(false);
    }
  }

  async function applyBreedRecognitionToProfile() {
    if (!token || !selectedPetId || !breedRecognitionResult?.primary_hypothesis?.trim()) return;
    setLoading(true);
    try {
      await updatePet(token, selectedPetId, { breed: breedRecognitionResult.primary_hypothesis.trim() });
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

  function goToCameraForPet(petId: string, opts?: { returnToProfile?: boolean }) {
    setHealthCheckReturnToProfile(Boolean(opts?.returnToProfile));
    setSelectedPetId(petId);
    clearHealthCheckForm();
    setHealthCheckInlineError('');
    setScreen('health-check');
  }

  function goHomeAndRefresh() {
    setScreen('home');
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
    petAge,
    setPetAge,
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
    submitGoogleAuth,
    submitAppleAuth,
    appleSignInAvailable,
    googleSignInReady: Boolean(googleAuthRequest),
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
    closePetProfile,
    refreshPetProfile,
    logout,
    goToCameraForPet,
    goHomeAndRefresh,
    openBreedRecognition,
    closeBreedRecognition,
    breedRecognitionSlotUris,
    breedRecognitionResult,
    breedRecognitionLoading,
    pickBreedRecognitionSlot,
    clearBreedRecognitionSlot,
    submitBreedRecognition,
    applyBreedRecognitionToProfile,
    handleOnboardingAddPet,
    cancelOnboardingAddPet,
    startInitialOnboardingFromIntro,
    goToHealthCheckFromServicesPrompt,
    dismissServicesPrompt,
    goToOnboardingHealthCheckFromPrompt,
    skipInitialHealthOnboarding,
    finishInitialOnboardingAfterResults,
  };
}
