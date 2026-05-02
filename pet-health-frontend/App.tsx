import './global.css';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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
    <SafeAreaProvider>
      <StatusBar style={app.screen === 'login' ? 'light' : 'dark'} />
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
        <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
          <View className="flex-1">
            <AppHeader />

            {app.screen === 'home' && (
              <HomeScreen
                pets={app.pets}
                selectedPetId={app.selectedPetId}
                refreshing={app.refreshing}
                onRefresh={app.refreshPets}
                onAddPet={app.openCreatePet}
                onSelectPet={app.setSelectedPetId}
                onStartScan={app.goToCameraForPet}
                onEditPet={app.openEditPet}
                onDeletePet={app.handleDeletePet}
              />
            )}

            {(app.screen === 'add-pet' || app.screen === 'edit-pet') && (
              <AddPetScreen
                variant={app.petFormMode === 'edit' ? 'edit' : 'create'}
                petName={app.petName}
                petSpecies={app.petSpecies}
                petBreed={app.petBreed}
                petAge={app.petAge}
                petAvatarUrl={app.petAvatarUrl}
                onChangeName={app.setPetName}
                onChangeSpecies={app.setPetSpecies}
                onChangeBreed={app.setPetBreed}
                onChangeAge={app.setPetAge}
                onChangeAvatarUrl={app.setPetAvatarUrl}
                onSubmit={app.petFormMode === 'edit' ? app.handleUpdatePet : app.handleAddPet}
                onCancel={app.cancelPetForm}
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
                imageUri={app.resultImageUri}
                warnings={app.warnings}
                onBackHome={app.goHomeAndRefresh}
              />
            )}

            {app.screen === 'history' && (
              <HistoryScreen history={app.history} onSelectEntry={app.openHistoryDetail} />
            )}

            {showBottomTab ? (
              <BottomTabBar
                activeScreen={app.screen}
                onHome={app.goHomeAndRefresh}
                onHistory={app.openHistory}
                onLogout={app.logout}
              />
            ) : null}
          </View>
        </SafeAreaView>
      )}
      <LoadingOverlay visible={app.loading} />
    </SafeAreaProvider>
  );
}
