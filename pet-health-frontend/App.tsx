import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, View } from 'react-native';
import { AppHeader } from './src/components/AppHeader';
import { BottomTabBar } from './src/components/BottomTabBar';
import { LoadingOverlay } from './src/components/LoadingOverlay';
import { usePetHealthApp } from './src/hooks/usePetHealthApp';
import { AddPetScreen } from './src/screens/AddPetScreen';
import { CameraScreen } from './src/screens/CameraScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';

export default function App() {
  const app = usePetHealthApp();

  const showBottomTab = app.screen === 'home' || app.screen === 'history';

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar style="dark" />
      {app.screen === 'login' ? (
        <LoginScreen
          healthMessage={app.healthMessage}
          email={app.email}
          password={app.password}
          isSignUp={app.isSignUp}
          onChangeEmail={app.setEmail}
          onChangePassword={app.setPassword}
          onToggleSignUp={() => app.setIsSignUp((v) => !v)}
          onSubmit={app.submitAuth}
        />
      ) : (
        <View className="flex-1">
          <AppHeader />

          {app.screen === 'home' && (
            <HomeScreen
              pets={app.pets}
              selectedPetId={app.selectedPetId}
              onAddPet={() => app.setScreen('add-pet')}
              onSelectPet={app.setSelectedPetId}
              onStartScan={app.goToCameraForPet}
            />
          )}

          {app.screen === 'add-pet' && (
            <AddPetScreen
              petName={app.petName}
              petSpecies={app.petSpecies}
              petBreed={app.petBreed}
              petAge={app.petAge}
              onChangeName={app.setPetName}
              onChangeSpecies={app.setPetSpecies}
              onChangeBreed={app.setPetBreed}
              onChangeAge={app.setPetAge}
              onSave={app.handleAddPet}
            />
          )}

          {app.screen === 'camera' && (
            <CameraScreen
              petName={app.selectedPet?.name ?? 'Pet'}
              imageUri={app.imageUri}
              onBack={() => app.setScreen('home')}
              onPickImage={app.chooseImage}
              onAnalyze={app.analyzeImage}
            />
          )}

          {app.screen === 'results' && app.currentResult && (
            <ResultsScreen
              result={app.currentResult}
              imageUri={app.imageUri}
              warnings={app.warnings}
              onBackHome={() => app.setScreen('home')}
            />
          )}

          {app.screen === 'history' && <HistoryScreen history={app.history} />}

          {showBottomTab ? (
            <BottomTabBar
              activeScreen={app.screen}
              onHome={() => app.setScreen('home')}
              onHistory={app.openHistory}
              onLogout={app.logout}
            />
          ) : null}
        </View>
      )}
      <LoadingOverlay visible={app.loading} />
    </SafeAreaView>
  );
}
