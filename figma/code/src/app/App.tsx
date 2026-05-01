import { useState } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { CameraScreen } from './components/CameraScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { PetProfileScreen } from './components/PetProfileScreen';
import { LoginScreen } from './components/LoginScreen';
import { HistoryScreen, HistoryEntry } from './components/HistoryScreen';
import { Home, History, Settings } from 'lucide-react';

export type Pet = {
  id: string;
  name: string;
  type: string;
  breed: string;
  age: number;
  imageUrl?: string;
};

export type DiagnosisResult = {
  diagnosis: string;
  severity: 'Low' | 'Medium' | 'High';
  confidence: number;
  symptoms: string[];
  treatment: string;
  disclaimer: string;
};

export type Screen = 'login' | 'home' | 'camera' | 'results' | 'profile' | 'add-pet' | 'history' | 'settings';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [pets, setPets] = useState<Pet[]>([
    {
      id: '1',
      name: 'Max',
      type: 'Dog',
      breed: 'Golden Retriever',
      age: 3,
    },
    {
      id: '2',
      name: 'Luna',
      type: 'Cat',
      breed: 'Persian',
      age: 2,
    },
  ]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [analysisImage, setAnalysisImage] = useState<string | null>(null);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [diagnosticHistory, setDiagnosticHistory] = useState<HistoryEntry[]>([
    {
      id: '1',
      petId: '1',
      petName: 'Max',
      imageUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
      result: {
        diagnosis: 'Mild Ear Infection',
        severity: 'Low',
        confidence: 82,
        symptoms: ['Ear scratching', 'Head shaking', 'Mild odor'],
        treatment: 'Clean ears gently with vet-approved solution. Monitor for 2-3 days.',
        disclaimer: 'This is an AI-generated assessment and not a substitute for professional veterinary care.',
      },
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: '2',
      petId: '2',
      petName: 'Luna',
      imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400',
      result: {
        diagnosis: 'Healthy - No Issues Detected',
        severity: 'Low',
        confidence: 95,
        symptoms: ['None detected'],
        treatment: 'Continue regular care routine. Pet appears healthy.',
        disclaimer: 'This is an AI-generated assessment and not a substitute for professional veterinary care.',
      },
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  ]);

  const handleSelectPet = (pet: Pet) => {
    setSelectedPet(pet);
  };

  const handleStartAnalysis = (pet: Pet) => {
    setSelectedPet(pet);
    setCurrentScreen('camera');
  };

  const handleImageCapture = (imageUrl: string) => {
    setAnalysisImage(imageUrl);
    // Simulate AI analysis
    setTimeout(() => {
      const mockResult: DiagnosisResult = {
        diagnosis: 'Mild Conjunctivitis',
        severity: 'Low',
        confidence: 87,
        symptoms: ['Eye redness', 'Mild discharge', 'Squinting'],
        treatment: 'Clean the eye with warm water. Monitor for 24-48 hours. If symptoms persist, consult a veterinarian.',
        disclaimer: 'This is an AI-generated assessment and not a substitute for professional veterinary care. Please consult a licensed veterinarian for accurate diagnosis and treatment.',
      };
      setDiagnosisResult(mockResult);

      // Add to history
      const newEntry: HistoryEntry = {
        id: Date.now().toString(),
        petId: selectedPet!.id,
        petName: selectedPet!.name,
        imageUrl,
        result: mockResult,
        timestamp: new Date(),
      };
      setDiagnosticHistory([newEntry, ...diagnosticHistory]);

      setCurrentScreen('results');
    }, 2000);
  };

  const handleAddPet = (pet: Omit<Pet, 'id'>) => {
    const newPet: Pet = {
      ...pet,
      id: Date.now().toString(),
    };
    setPets([...pets, newPet]);
    setCurrentScreen('home');
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
    setAnalysisImage(null);
    setDiagnosisResult(null);
  };

  const handleSelectHistoryEntry = (entry: HistoryEntry) => {
    const pet = pets.find(p => p.id === entry.petId);
    if (pet) {
      setSelectedPet(pet);
      setAnalysisImage(entry.imageUrl);
      setDiagnosisResult(entry.result);
      setCurrentScreen('results');
    }
  };

  const showBottomNav = isAuthenticated && !['camera', 'results', 'profile', 'add-pet'].includes(currentScreen);

  if (!isAuthenticated) {
    return (
      <div className="size-full bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-md h-full bg-white shadow-xl">
          <LoginScreen onLogin={() => setIsAuthenticated(true)} />
        </div>
      </div>
    );
  }

  return (
    <div className="size-full bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md h-full bg-white shadow-xl flex flex-col">
        <div className="flex-1 overflow-hidden">
          {currentScreen === 'home' && (
            <HomeScreen
              pets={pets}
              onSelectPet={handleSelectPet}
              onStartAnalysis={handleStartAnalysis}
              onAddPet={() => setCurrentScreen('add-pet')}
              onViewProfile={(pet) => {
                setSelectedPet(pet);
                setCurrentScreen('profile');
              }}
            />
          )}
          {currentScreen === 'camera' && (
            <CameraScreen
              pet={selectedPet!}
              onCapture={handleImageCapture}
              onBack={() => setCurrentScreen('home')}
            />
          )}
          {currentScreen === 'results' && diagnosisResult && (
            <ResultsScreen
              result={diagnosisResult}
              pet={selectedPet!}
              imageUrl={analysisImage!}
              onBack={handleBackToHome}
            />
          )}
          {(currentScreen === 'profile' || currentScreen === 'add-pet') && (
            <PetProfileScreen
              pet={currentScreen === 'profile' ? selectedPet : null}
              onSave={handleAddPet}
              onBack={() => setCurrentScreen('home')}
            />
          )}
          {currentScreen === 'history' && (
            <HistoryScreen
              history={diagnosticHistory}
              pets={pets}
              onBack={() => setCurrentScreen('home')}
              onSelectEntry={handleSelectHistoryEntry}
            />
          )}
          {currentScreen === 'settings' && (
            <div className="h-full bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <Settings className="size-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Settings coming soon</p>
                <button
                  onClick={() => setCurrentScreen('home')}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Back to Home
                </button>
              </div>
            </div>
          )}
        </div>

        {showBottomNav && (
          <div className="border-t border-gray-200 bg-white">
            <div className="flex items-center justify-around px-6 py-3">
              <button
                onClick={() => setCurrentScreen('home')}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  currentScreen === 'home' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Home className="size-6" />
                <span className="text-xs">Home</span>
              </button>
              <button
                onClick={() => setCurrentScreen('history')}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  currentScreen === 'history' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <History className="size-6" />
                <span className="text-xs">History</span>
              </button>
              <button
                onClick={() => setCurrentScreen('settings')}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  currentScreen === 'settings' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Settings className="size-6" />
                <span className="text-xs">Settings</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}