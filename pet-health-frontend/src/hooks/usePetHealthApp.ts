import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import {
  analyzePetHealthCheck,
  createPet,
  deletePet,
  getPet,
  healthCheck,
  listHistoryByPet,
  listPets,
  login,
  oauthApple,
  oauthGoogle,
  signUp,
  updatePet,
  uploadPetAvatar,
} from '../api';
import { isGoogleOAuthConfigured } from '../config';
import { PENDING_INITIAL_ONBOARDING_KEY, TOKEN_STORAGE_KEY } from '../constants/auth';
import { useGoogleIdTokenAuth } from './useGoogleIdTokenAuth';
import type { Analysis, Pet } from '../types';
import type { AppScreen } from '../screens/types';

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
  const [healthMessage, setHealthMessage] = useState('Checking backend...');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
  const [healthCheckVaccinated, setHealthCheckVaccinated] = useState<'yes' | 'no'>('yes');
  const [healthCheckVaccineType, setHealthCheckVaccineType] = useState('');
  const [healthCheckNeutered, setHealthCheckNeutered] = useState<'yes' | 'no'>('no');
  const [healthCheckMedicalHistory, setHealthCheckMedicalHistory] = useState('');
  const [healthCheckSymptoms, setHealthCheckSymptoms] = useState('');

  const [currentResult, setCurrentResult] = useState<Analysis | null>(null);
  const [resultImageUri, setResultImageUri] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [history, setHistory] = useState<Analysis[]>([]);
  /** After saving pet form opened from profile, return to pet profile instead of home. */
  const [petFormReturnToProfile, setPetFormReturnToProfile] = useState(false);
  /** Where to go when closing the results screen opened from history vs profile vs default home. */
  const [resultsReturnScreen, setResultsReturnScreen] = useState<'home' | 'history' | 'pet-profile' | null>(
    null,
  );
  /** Health check opened from pet profile — back / results return to profile, not home. */
  const [healthCheckReturnToProfile, setHealthCheckReturnToProfile] = useState(false);
  const [appleSignInAvailable, setAppleSignInAvailable] = useState(false);

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
    setHealthCheckVaccineType('');
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

  const refreshPets = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      await fetchPets(token);
    } finally {
      setRefreshing(false);
    }
  }, [token, fetchPets]);

  useEffect(() => {
    void initializeApp();
  }, []);

  useEffect(() => {
    void AppleAuthentication.isAvailableAsync().then(setAppleSignInAvailable);
  }, []);

  async function initializeApp() {
    try {
      await healthCheck();
      setHealthMessage('Backend online');
    } catch {
      setHealthMessage('Backend unreachable - check LOCAL_IP in src/config.ts');
    }

    const savedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (savedToken) {
      setToken(savedToken);
      try {
        const petsList = await fetchPets(savedToken);
        const pending = await AsyncStorage.getItem(PENDING_INITIAL_ONBOARDING_KEY);
        if (pending === '1') {
          setInitialOnboarding(true);
          if (petsList.length === 0) {
            setScreen('onboarding-add-pet');
          } else {
            setSelectedPetId((prev) => prev ?? petsList[0]?.id ?? null);
            setScreen('onboarding-health-prompt');
          }
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

      if (options?.startInitialPetOnboarding) {
        await AsyncStorage.setItem(PENDING_INITIAL_ONBOARDING_KEY, '1');
        setInitialOnboarding(true);
        clearPetForm();
        setScreen('onboarding-add-pet');
        return;
      }

      const pending = await AsyncStorage.getItem(PENDING_INITIAL_ONBOARDING_KEY);
      if (pending === '1') {
        setInitialOnboarding(true);
        if (petsList.length === 0) {
          setScreen('onboarding-add-pet');
        } else {
          setSelectedPetId((prev) => prev ?? petsList[0]?.id ?? null);
          setScreen('onboarding-health-prompt');
        }
        return;
      }

      setInitialOnboarding(false);
      setScreen('home');
    },
    [fetchPets],
  );

  async function submitAuth() {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const signUpRes = await signUp({ email, password });
        const signUpToken = signUpRes.data.session?.access_token;
        if (!signUpToken) {
          Alert.alert('Verify email', 'Check your inbox to confirm, then use Sign in.');
          return;
        }
        await applySession(signUpToken, { startInitialPetOnboarding: true });
        return;
      }

      const response = await login({ email, password });
      const accessToken = response.data.session?.access_token;
      if (!accessToken) {
        Alert.alert('Login failed', 'No access token returned.');
        return;
      }
      await applySession(accessToken);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Auth failed', message);
    } finally {
      setLoading(false);
    }
  }

  async function submitGoogleAuth() {
    if (!isGoogleOAuthConfigured()) {
      Alert.alert(
        'Google sign-in',
        'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (and iOS/Android client IDs for native builds) to a .env file, restart Expo, enable Google in Supabase Auth → Providers, then try again.',
      );
      return;
    }
    if (!googleAuthRequest) {
      Alert.alert('Please wait', 'Google sign-in is still loading.');
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
            ? (result.error instanceof Error ? result.error.message : result.errorCode) ?? 'Something went wrong'
            : 'Sign-in was not completed.';
        Alert.alert('Google sign-in', errMsg);
        return;
      }
      const idToken = result.params.id_token;
      if (!idToken) {
        Alert.alert('Google sign-in', 'No ID token returned. Check your Google OAuth client configuration.');
        return;
      }
      const response = await oauthGoogle(idToken);
      const accessToken = response.data.session?.access_token;
      if (!accessToken) {
        Alert.alert('Google sign-in', 'No access token returned.');
        return;
      }
      await applySession(accessToken);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (/nonce/i.test(message)) {
        Alert.alert(
          'Google sign-in (Supabase)',
          'Turn ON “Skip nonce checks” for the Google provider in Supabase (Authentication → Providers → Google), then try again. Expo’s Google flow and Supabase’s nonce check do not line up without that setting.',
        );
        return;
      }
      Alert.alert('Google sign-in failed', message);
    } finally {
      setLoading(false);
    }
  }

  async function submitAppleAuth() {
    if (!(await AppleAuthentication.isAvailableAsync())) {
      Alert.alert('Apple sign-in', 'Sign in with Apple is only available on supported iOS devices.');
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
        Alert.alert('Apple sign-in', 'No identity token returned.');
        return;
      }
      const response = await oauthApple(credential.identityToken, rawNonce);
      const accessToken = response.data.session?.access_token;
      if (!accessToken) {
        Alert.alert('Apple sign-in', 'No access token returned.');
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
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Apple sign-in failed', message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPet() {
    if (!token) return;
    if (!petName.trim() || !petSpecies.trim()) {
      Alert.alert('Missing info', 'Pet name and species are required.');
      return;
    }

    setLoading(true);
    try {
      const avatarForApi = avatarUrlForApi(petAvatarUrl);
      await createPet(token, {
        name: petName.trim(),
        species: petSpecies.trim().toLowerCase(),
        breed: petBreed.trim() || undefined,
        age: petAge ? Number(petAge) : undefined,
        gender: petGender,
        ...(avatarForApi !== undefined ? { avatarUrl: avatarForApi } : {}),
      });
      clearPetForm();
      await fetchPets(token);
      setScreen('home');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Create pet failed', message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOnboardingAddPet() {
    if (!token) return;
    if (!petName.trim() || !petSpecies.trim()) {
      Alert.alert('Missing info', 'Pet name and species are required.');
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
      setSelectedPetId(created.id);
      setScreen('onboarding-health-prompt');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Create pet failed', message);
    } finally {
      setLoading(false);
    }
  }

  function cancelOnboardingAddPet() {
    Alert.alert('Exit setup?', 'You can sign in again later to add your pet.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => void signOutFromOnboarding(),
      },
    ]);
  }

  async function signOutFromOnboarding() {
    await logout();
  }

  function goToOnboardingHealthCheckFromPrompt() {
    if (!selectedPetId) return;
    clearHealthCheckForm();
    setScreen('onboarding-health-check');
  }

  async function skipInitialHealthOnboarding() {
    await completeInitialOnboarding();
    clearHealthCheckForm();
    setScreen('home');
    if (token) void fetchPets(token);
  }

  async function finishInitialOnboardingAfterResults() {
    await completeInitialOnboarding();
    setScreen('home');
    if (token) await fetchPets(token);
  }

  async function handleUpdatePet() {
    if (!token || !editingPetId) return;
    if (!petName.trim() || !petSpecies.trim()) {
      Alert.alert('Missing info', 'Pet name and species are required.');
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
          const historyResponse = await listHistoryByPet(token, updatedPetId);
          setHistory(historyResponse.data);
        } catch {
          setHistory([]);
        }
        setSelectedPetId(updatedPetId);
        setScreen('pet-profile');
      } else {
        setScreen('home');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Update pet failed', message);
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
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Load pet failed', message);
    } finally {
      setLoading(false);
    }
  }

  async function openPetProfile(petId: string) {
    if (!token) return;
    setSelectedPetId(petId);
    setLoading(true);
    try {
      const response = await listHistoryByPet(token, petId);
      setHistory(response.data);
      setScreen('pet-profile');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Load profile failed', message);
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
      const response = await listHistoryByPet(token, selectedPetId);
      setHistory(response.data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Refresh failed', message);
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
    Alert.alert('Delete pet?', `Remove ${pet.name} and their data cannot be restored from the app.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void confirmDeletePet(pet.id),
      },
    ]);
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
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Delete failed', message);
    } finally {
      setLoading(false);
    }
  }

  async function pickPetAvatar() {
    if (!token) {
      Alert.alert('Sign in required', 'Please sign in before choosing a pet avatar.');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow gallery access to set an avatar.');
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
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Avatar upload failed', message);
    } finally {
      setLoading(false);
    }
  }

  async function pickHealthCheckPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow gallery access.');
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
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Photos', message);
    }
  }

  async function pickHealthCheckVideo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow gallery access.');
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
    if (!healthCheckPhotos.length) {
      Alert.alert('Photos required', 'Please upload at least one photo.');
      return;
    }
    if (!token || !selectedPetId) {
      Alert.alert('Missing data', 'Please sign in and select a pet.');
      return;
    }
    setLoading(true);
    try {
      const response = await analyzePetHealthCheck({
        token,
        petId: selectedPetId,
        imageUris: healthCheckPhotos,
        videoUri: healthCheckVideoUri,
        weightKg: healthCheckWeightKg.trim(),
        vaccinated: healthCheckVaccinated,
        vaccineType: healthCheckVaccineType.trim(),
        neutered: healthCheckNeutered,
        medicalHistory: healthCheckMedicalHistory.trim(),
        symptomDescription: healthCheckSymptoms.trim(),
      });
      setCurrentResult(response.data);
      setResultImageUri(healthCheckPhotos[0]);
      setWarnings(response.warnings ?? []);
      const returnToProfileAfterScan = healthCheckReturnToProfile;
      setHealthCheckReturnToProfile(false);
      setResultsReturnScreen(returnToProfileAfterScan ? 'pet-profile' : null);
      const historyResponse = await listHistoryByPet(token, selectedPetId);
      setHistory(historyResponse.data);
      clearHealthCheckForm();
      setScreen(initialOnboarding ? 'onboarding-results' : 'results');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Analyze failed', message);
    } finally {
      setLoading(false);
    }
  }

  function closeHealthCheck() {
    clearHealthCheckForm();
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
      Alert.alert('Select pet', 'Please select a pet first.');
      return;
    }
    setLoading(true);
    try {
      const response = await listHistoryByPet(token, selectedPetId);
      setHistory(response.data);
      setScreen('history');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('History failed', message);
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
        void listHistoryByPet(token, selectedPetId).then((r) => setHistory(r.data));
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
    setSelectedPetId(null);
    clearHealthCheckForm();
    setCurrentResult(null);
    setResultImageUri(null);
    setHistory([]);
    clearPetForm();
    setPetFormReturnToProfile(false);
    setHealthCheckReturnToProfile(false);
    setResultsReturnScreen(null);
    setScreen('login');
  }

  function goToCameraForPet(petId: string, opts?: { returnToProfile?: boolean }) {
    setHealthCheckReturnToProfile(Boolean(opts?.returnToProfile));
    setSelectedPetId(petId);
    clearHealthCheckForm();
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
    healthMessage,
    email,
    setEmail,
    password,
    setPassword,
    isSignUp,
    setIsSignUp,
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
    healthCheckVaccineType,
    setHealthCheckVaccineType,
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
    resultImageUri,
    warnings,
    history,
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
    handleOnboardingAddPet,
    cancelOnboardingAddPet,
    goToOnboardingHealthCheckFromPrompt,
    skipInitialHealthOnboarding,
    finishInitialOnboardingAfterResults,
  };
}
