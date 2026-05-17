import './global.css';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from './src/components/AppHeader';
import { BottomTabBar } from './src/components/BottomTabBar';
import { LoadingOverlay } from './src/components/LoadingOverlay';
import { usePetHealthApp } from './src/hooks/usePetHealthApp';
import { AddPetScreen } from './src/screens/AddPetScreen';
import { AnalysisProgressScreen } from './src/screens/AnalysisProgressScreen';
import { PetBreedRecognitionScreen } from './src/screens/PetBreedRecognitionScreen';
import { HealthCheckScreen } from './src/screens/HealthCheckScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { OnboardingIntroScreen } from './src/screens/OnboardingIntroScreen';
import { OnboardingHealthPromptScreen } from './src/screens/OnboardingHealthPromptScreen';
import { PetProfileScreen } from './src/screens/PetProfileScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';

export default function App() {
  const { t } = useTranslation();
  const app = usePetHealthApp();

  const showBottomTab = app.screen === 'home' || app.screen === 'history';
  const hideAppHeader =
    app.screen === 'add-pet' ||
    app.screen === 'edit-pet' ||
    app.screen === 'health-check' ||
    app.screen === 'analysis-progress' ||
    app.screen === 'onboarding-intro' ||
    app.screen === 'onboarding-add-pet' ||
    app.screen === 'onboarding-health-prompt' ||
    app.screen === 'onboarding-health-check' ||
    app.screen === 'onboarding-results' ||
    app.screen === 'pet-profile' ||
    app.screen === 'breed-recognition';

  return (
    <SafeAreaProvider>
      <StatusBar style={app.screen === 'login' ? 'light' : 'dark'} />
      {app.screen === 'login' ? (
        <LoginScreen
          backendHealth={app.backendHealth}
          email={app.email}
          password={app.password}
          confirmPassword={app.confirmPassword}
          isSignUp={app.isSignUp}
          onChangeEmail={app.setEmail}
          onChangePassword={app.setPassword}
          onChangeConfirmPassword={app.setConfirmPassword}
          onToggleSignUp={app.toggleLoginSignUpMode}
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
                onViewProfile={app.openPetProfile}
              />
            )}

            {app.screen === 'pet-profile' && app.selectedPet ? (
              <PetProfileScreen
                pet={app.selectedPet}
                history={app.history}
                refreshing={app.refreshing}
                onRefresh={app.refreshPetProfile}
                onBack={app.closePetProfile}
                onEdit={() => app.openEditPet(app.selectedPet!.id, { returnToProfile: true })}
                onScanHealth={() => app.goToCameraForPet(app.selectedPet!.id, { returnToProfile: true })}
                onSelectEntry={(entry) => app.openHistoryDetail(entry, 'pet-profile')}
                onOpenBreedRecognition={() => app.openBreedRecognition('pet-profile')}
              />
            ) : null}

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
                headerTitle={t('onboarding.createPetProfile')}
                submitButtonLabel={t('common.continue')}
                helperMessage={t('onboarding.profileGuideByMai')}
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

            {app.screen === 'onboarding-intro' && (
              <OnboardingIntroScreen onGo={app.startInitialOnboardingFromIntro} />
            )}

            {app.screen === 'onboarding-health-prompt' && app.selectedPet ? (
              <OnboardingHealthPromptScreen
                onExploreBreed={() => app.openBreedRecognition('onboarding-health-prompt')}
                onCheckHealth={app.goToHealthCheckFromServicesPrompt}
                onManageVaccines={app.goToHealthCheckFromServicesPrompt}
                onSkip={app.dismissServicesPrompt}
              />
            ) : null}

            {app.screen === 'health-check' && app.selectedPet ? (
              <HealthCheckScreen
                pet={app.selectedPet}
                photoUris={app.healthCheckPhotos}
                videoUri={app.healthCheckVideoUri}
                weightKg={app.healthCheckWeightKg}
                vaccinated={app.healthCheckVaccinated}
                vaccineIds={app.healthCheckVaccineIds}
                vaccineOther={app.healthCheckVaccineOther}
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
                onChangeVaccineIds={app.setHealthCheckVaccineIds}
                onChangeVaccineOther={app.setHealthCheckVaccineOther}
                onChangeNeutered={app.setHealthCheckNeutered}
                onChangeMedicalHistory={app.setHealthCheckMedicalHistory}
                onChangeSymptomDescription={app.setHealthCheckSymptoms}
                onStartAnalysis={app.analyzeHealthCheck}
                inlineErrorMessage={app.healthCheckInlineError}
                onDismissInlineError={() => app.setHealthCheckInlineError('')}
                analysisCooldownSeconds={app.analysisCooldownSeconds}
                analyzeDisabled={app.analysisSubmitting}
                onOpenBreedRecognition={() => app.openBreedRecognition('health-check')}
              />
            ) : null}

            {app.screen === 'onboarding-health-check' && app.selectedPet ? (
              <HealthCheckScreen
                pet={app.selectedPet}
                photoUris={app.healthCheckPhotos}
                videoUri={app.healthCheckVideoUri}
                weightKg={app.healthCheckWeightKg}
                vaccinated={app.healthCheckVaccinated}
                vaccineIds={app.healthCheckVaccineIds}
                vaccineOther={app.healthCheckVaccineOther}
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
                onChangeVaccineIds={app.setHealthCheckVaccineIds}
                onChangeVaccineOther={app.setHealthCheckVaccineOther}
                onChangeNeutered={app.setHealthCheckNeutered}
                onChangeMedicalHistory={app.setHealthCheckMedicalHistory}
                onChangeSymptomDescription={app.setHealthCheckSymptoms}
                onStartAnalysis={app.analyzeHealthCheck}
                inlineErrorMessage={app.healthCheckInlineError}
                onDismissInlineError={() => app.setHealthCheckInlineError('')}
                analysisCooldownSeconds={app.analysisCooldownSeconds}
                analyzeDisabled={app.analysisSubmitting}
                onOpenBreedRecognition={() => app.openBreedRecognition('onboarding-health-check')}
              />
            ) : null}

            {app.screen === 'breed-recognition' && app.selectedPet ? (
              <PetBreedRecognitionScreen
                pet={app.selectedPet}
                slotUris={app.breedRecognitionSlotUris}
                result={app.breedRecognitionResult}
                loading={app.breedRecognitionLoading}
                onBack={app.closeBreedRecognition}
                onPickSlot={app.pickBreedRecognitionSlot}
                onClearSlot={app.clearBreedRecognitionSlot}
                onAnalyze={app.submitBreedRecognition}
                onApplyToProfile={app.applyBreedRecognitionToProfile}
              />
            ) : null}

            {app.screen === 'analysis-progress' && app.selectedPet ? (
              <AnalysisProgressScreen
                stage={app.analysisProgressStage}
                petName={app.selectedPet.name}
                message={app.analysisProgressMessage}
              />
            ) : null}

            {app.screen === 'results' && app.currentResult && (
              <ResultsScreen
                result={app.currentResult}
                imageUri={app.resultImageUri}
                warnings={app.warnings}
                onBackHome={app.dismissResults}
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
              <HistoryScreen
                history={app.history}
                onSelectEntry={(entry) => app.openHistoryDetail(entry, 'history')}
              />
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
