import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { analyzePetImage, createPet, healthCheck, listHistoryByPet, listPets, login, signUp } from '../api';
import { TOKEN_STORAGE_KEY } from '../constants/auth';
import type { Analysis, Pet } from '../types';
import type { AppScreen } from '../screens/types';

export function usePetHealthApp() {
  const [screen, setScreen] = useState<AppScreen>('login');
  const [loading, setLoading] = useState(false);
  const [healthMessage, setHealthMessage] = useState('Checking backend...');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);

  const [petName, setPetName] = useState('');
  const [petSpecies, setPetSpecies] = useState('cat');
  const [petBreed, setPetBreed] = useState('');
  const [petAge, setPetAge] = useState('');

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<Analysis | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [history, setHistory] = useState<Analysis[]>([]);

  const selectedPet = useMemo(() => pets.find((pet) => pet.id === selectedPetId) ?? null, [pets, selectedPetId]);

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
      await fetchPets(savedToken);
      setScreen('home');
    }
  }

  async function fetchPets(accessToken: string) {
    const response = await listPets(accessToken);
    setPets(response.data);
    if (response.data.length > 0) {
      setSelectedPetId((previous) => previous ?? response.data[0].id);
    }
  }

  async function submitAuth() {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      const response = isSignUp ? await signUp({ email, password }) : await login({ email, password });
      const accessToken = response.data.session?.access_token;
      if (!accessToken) {
        Alert.alert('Verify account', 'Signup successful. Please verify email and then sign in.');
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
      });
      setPetName('');
      setPetBreed('');
      setPetAge('');
      await fetchPets(token);
      setScreen('home');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Create pet failed', message);
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
    const response = await listHistoryByPet(token, selectedPetId);
    setHistory(response.data);
    setScreen('history');
  }

  async function logout() {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setPets([]);
    setSelectedPetId(null);
    setImageUri(null);
    setCurrentResult(null);
    setHistory([]);
    setScreen('login');
  }

  function goToCameraForPet(petId: string) {
    setSelectedPetId(petId);
    setImageUri(null);
    setScreen('camera');
  }

  return {
    screen,
    setScreen,
    loading,
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
    petName,
    setPetName,
    petSpecies,
    setPetSpecies,
    petBreed,
    setPetBreed,
    petAge,
    setPetAge,
    imageUri,
    currentResult,
    warnings,
    history,
    submitAuth,
    handleAddPet,
    chooseImage,
    analyzeImage,
    openHistory,
    logout,
    goToCameraForPet,
  };
}
