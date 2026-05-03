import './global.css';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from './src/components/AppHeader';
import { BottomTabBar } from './src/components/BottomTabBar';
import { LoadingOverlay } from './src/components/LoadingOverlay';
import { usePetHealthApp } from './src/hooks/usePetHealthApp';
import { AddPetScreen } from './src/screens/AddPetScreen';
import { HealthCheckScreen } from './src/screens/HealthCheckScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { OnboardingHealthPromptScreen } from './src/screens/OnboardingHealthPromptScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';

export default function App() {
  const app = usePetHealthApp();

  const showBottomTab = app.screen === 'home' || app.screen === 'history';
  const hideAppHeader =
    app.screen === 'add-pet' ||
    app.screen === 'edit-pet' ||
    app.screen === 'health-check' ||
    app.screen === 'onboarding-add-pet' ||
    app.screen === 'onboarding-health-prompt' ||
    app.screen === 'onboarding-health-check' ||
    app.screen === 'onboarding-results';

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
          onGoogleSignIn={app.submitGoogleAuth}
          onAppleSignIn={app.submitAppleAuth}
          appleSignInAvailable={app.appleSignInAvailable}
          googleSignInReady={app.googleSignInReady}
        />
      ) : (
        <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
          <View className="flex-1">
            {!hideAppHeader ? <AppHeader /> : null}

            {app.screen === 'home' && (
              <HomeScreen
                pets={app.pets}
                refreshing={app.refreshing}
                onRefresh={app.refreshPets}
                onAddPet={app.openCreatePet}
                onStartScan={app.goToCameraForPet}
                onViewProfile={app.openEditPet}
              />
            )}

            {(app.screen === 'add-pet' || app.screen === 'edit-pet') && (
              <AddPetScreen
                variant={app.petFormMode === 'edit' ? 'edit' : 'create'}
                petName={app.petName}
                petSpecies={app.petSpecies}
                petBreed={app.petBreed}
                petAge={app.petAge}
                petGender={app.petGender}
                petAvatarUrl={app.petAvatarUrl}
                onChangeName={app.setPetName}
                onChangeSpecies={app.setPetSpecies}
                onChangeBreed={app.setPetBreed}
                onChangeAge={app.setPetAge}
                onChangeGender={app.setPetGender}
                onPickAvatar={app.pickPetAvatar}
                onSubmit={app.petFormMode === 'edit' ? app.handleUpdatePet : app.handleAddPet}
                onCancel={app.cancelPetForm}
                onDeletePet={
                  app.petFormMode === 'edit' && app.editingPetId
                    ? () => {
                        const p = app.pets.find((x) => x.id === app.editingPetId);
                        if (p) app.handleDeletePet(p);
                      }
                    : undefined
                }
              />
            )}

            {app.screen === 'onboarding-add-pet' && (
              <AddPetScreen
                variant="create"
                headerTitle="Create your pet's profile"
                submitButtonLabel="Continue"
                petName={app.petName}
                petSpecies={app.petSpecies}
                petBreed={app.petBreed}
                petAge={app.petAge}
                petGender={app.petGender}
                petAvatarUrl={app.petAvatarUrl}
                onChangeName={app.setPetName}
                onChangeSpecies={app.setPetSpecies}
                onChangeBreed={app.setPetBreed}
                onChangeAge={app.setPetAge}
                onChangeGender={app.setPetGender}
                onPickAvatar={app.pickPetAvatar}
                onSubmit={app.handleOnboardingAddPet}
                onCancel={app.cancelOnboardingAddPet}
              />
            )}

            {app.screen === 'onboarding-health-prompt' && app.selectedPet ? (
              <OnboardingHealthPromptScreen
                petName={app.selectedPet.name}
                onCheckHealth={app.goToOnboardingHealthCheckFromPrompt}
                onSkip={app.skipInitialHealthOnboarding}
              />
            ) : null}

            {app.screen === 'health-check' && app.selectedPet ? (
              <HealthCheckScreen
                pet={app.selectedPet}
                photoUris={app.healthCheckPhotos}
                videoUri={app.healthCheckVideoUri}
                weightKg={app.healthCheckWeightKg}
                vaccinated={app.healthCheckVaccinated}
                vaccineType={app.healthCheckVaccineType}
                neutered={app.healthCheckNeutered}
                medicalHistory={app.healthCheckMedicalHistory}
                symptomDescription={app.healthCheckSymptoms}
                onBack={app.closeHealthCheck}
                onAddPhotos={app.pickHealthCheckPhotos}
                onRemovePhoto={app.removeHealthCheckPhoto}
                onPickVideo={app.pickHealthCheckVideo}
                onClearVideo={app.clearHealthCheckVideo}
                onChangeWeight={app.setHealthCheckWeightKg}
                onChangeVaccinated={app.setHealthCheckVaccinated}
                onChangeVaccineType={app.setHealthCheckVaccineType}
                onChangeNeutered={app.setHealthCheckNeutered}
                onChangeMedicalHistory={app.setHealthCheckMedicalHistory}
                onChangeSymptomDescription={app.setHealthCheckSymptoms}
                onStartAnalysis={app.analyzeHealthCheck}
              />
            ) : null}

            {app.screen === 'onboarding-health-check' && app.selectedPet ? (
              <HealthCheckScreen
                pet={app.selectedPet}
                photoUris={app.healthCheckPhotos}
                videoUri={app.healthCheckVideoUri}
                weightKg={app.healthCheckWeightKg}
                vaccinated={app.healthCheckVaccinated}
                vaccineType={app.healthCheckVaccineType}
                neutered={app.healthCheckNeutered}
                medicalHistory={app.healthCheckMedicalHistory}
                symptomDescription={app.healthCheckSymptoms}
                onBack={app.closeHealthCheck}
                onAddPhotos={app.pickHealthCheckPhotos}
                onRemovePhoto={app.removeHealthCheckPhoto}
                onPickVideo={app.pickHealthCheckVideo}
                onClearVideo={app.clearHealthCheckVideo}
                onChangeWeight={app.setHealthCheckWeightKg}
                onChangeVaccinated={app.setHealthCheckVaccinated}
                onChangeVaccineType={app.setHealthCheckVaccineType}
                onChangeNeutered={app.setHealthCheckNeutered}
                onChangeMedicalHistory={app.setHealthCheckMedicalHistory}
                onChangeSymptomDescription={app.setHealthCheckSymptoms}
                onStartAnalysis={app.analyzeHealthCheck}
              />
            ) : null}

            {app.screen === 'results' && app.currentResult && (
              <ResultsScreen
                result={app.currentResult}
                imageUri={app.resultImageUri}
                warnings={app.warnings}
                onBackHome={app.goHomeAndRefresh}
              />
            )}

            {app.screen === 'onboarding-results' && app.currentResult && (
              <ResultsScreen
                variant="onboarding"
                result={app.currentResult}
                imageUri={app.resultImageUri}
                warnings={app.warnings}
                onBackHome={app.finishInitialOnboardingAfterResults}
                onFinish={app.finishInitialOnboardingAfterResults}
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
