import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import {
  analyzePetImage,
  createPet,
  deletePet,
  getPet,
  healthCheck,
  listHistoryByPet,
  listPets,
  login,
  signUp,
  updatePet,
} from '../api';
import { TOKEN_STORAGE_KEY } from '../constants/auth';
import type { Analysis, Pet } from '../types';
import type { AppScreen } from '../screens/types';

export function usePetHealthApp() {
  const [screen, setScreen] = useState<AppScreen>('login');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [healthMessage, setHealthMessage] = useState('Checking backend...');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);

  const [petName, setPetName] = useState('');
  const [petSpecies, setPetSpecies] = useState('cat');
  const [petBreed, setPetBreed] = useState('');
  const [petAge, setPetAge] = useState('');
  const [petAvatarUrl, setPetAvatarUrl] = useState('');

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<Analysis | null>(null);
  const [resultImageUri, setResultImageUri] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [history, setHistory] = useState<Analysis[]>([]);

  const selectedPet = useMemo(() => pets.find((pet) => pet.id === selectedPetId) ?? null, [pets, selectedPetId]);

  const petFormMode = editingPetId ? 'edit' : 'create';

  function clearPetForm() {
    setPetName('');
    setPetSpecies('cat');
    setPetBreed('');
    setPetAge('');
    setPetAvatarUrl('');
    setEditingPetId(null);
  }

  const fetchPets = useCallback(async (accessToken: string) => {
    const response = await listPets(accessToken);
    setPets(response.data);
    if (response.data.length > 0) {
      setSelectedPetId((previous) => previous ?? response.data[0].id);
    } else {
      setSelectedPetId(null);
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

  useEffect(() => {
    void initializeApp();
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
        await fetchPets(savedToken);
        setScreen('home');
      } catch {
        await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
      }
    }
  }

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
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, signUpToken);
        setToken(signUpToken);
        await fetchPets(signUpToken);
        setScreen('home');
        return;
      }

      const response = await login({ email, password });
      const accessToken = response.data.session?.access_token;
      if (!accessToken) {
        Alert.alert('Login failed', 'No access token returned.');
        return;
      }
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
      setToken(accessToken);
      await fetchPets(accessToken);
      setScreen('home');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Auth failed', message);
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
      await createPet(token, {
        name: petName.trim(),
        species: petSpecies.trim().toLowerCase(),
        breed: petBreed.trim() || undefined,
        age: petAge ? Number(petAge) : undefined,
        avatarUrl: petAvatarUrl.trim() || undefined,
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
        avatarUrl: petAvatarUrl.trim() || null,
      });
      clearPetForm();
      await fetchPets(token);
      setScreen('home');
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

  async function openEditPet(petId: string) {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await getPet(token, petId);
      setEditingPetId(data.id);
      setPetName(data.name);
      setPetSpecies(data.species);
      setPetBreed(data.breed ?? '');
      setPetAge(data.age !== null && data.age !== undefined ? String(data.age) : '');
      setPetAvatarUrl(data.avatar_url ?? '');
      setScreen('edit-pet');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Load pet failed', message);
    } finally {
      setLoading(false);
    }
  }

  function cancelPetForm() {
    clearPetForm();
    setScreen('home');
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
      await fetchPets(token);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Delete failed', message);
    } finally {
      setLoading(false);
    }
  }

  async function chooseImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow gallery access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const compressed = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
    );
    setImageUri(compressed.uri);
  }

  async function analyzeImage() {
    if (!token || !selectedPetId || !imageUri) {
      Alert.alert('Missing data', 'Select pet and image first.');
      return;
    }
    setLoading(true);
    try {
      const response = await analyzePetImage(token, selectedPetId, imageUri);
      setCurrentResult(response.data);
      setResultImageUri(imageUri);
      setWarnings(response.warnings ?? []);
      const historyResponse = await listHistoryByPet(token, selectedPetId);
      setHistory(historyResponse.data);
      setScreen('results');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Analyze failed', message);
    } finally {
      setLoading(false);
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

  function openHistoryDetail(entry: Analysis) {
    setCurrentResult(entry);
    setResultImageUri(entry.image_url);
    setWarnings([]);
    setScreen('results');
  }

  async function logout() {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setPets([]);
    setSelectedPetId(null);
    setImageUri(null);
    setCurrentResult(null);
    setResultImageUri(null);
    setHistory([]);
    clearPetForm();
    setScreen('login');
  }

  function goToCameraForPet(petId: string) {
    setSelectedPetId(petId);
    setImageUri(null);
    setScreen('camera');
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
    petName,
    setPetName,
    petSpecies,
    setPetSpecies,
    petBreed,
    setPetBreed,
    petAge,
    setPetAge,
    petAvatarUrl,
    setPetAvatarUrl,
    imageUri,
    currentResult,
    resultImageUri,
    warnings,
    history,
    submitAuth,
    handleAddPet,
    handleUpdatePet,
    openCreatePet,
    openEditPet,
    cancelPetForm,
    handleDeletePet,
    chooseImage,
    analyzeImage,
    openHistory,
    openHistoryDetail,
    logout,
    goToCameraForPet,
    goHomeAndRefresh,
  };
}
