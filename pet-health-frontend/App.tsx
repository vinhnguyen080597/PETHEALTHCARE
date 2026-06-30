import './global.css';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { Component, type ReactNode, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from './src/components/AppHeader';
import { BottomTabBar } from './src/components/BottomTabBar';
import { LoadingOverlay } from './src/components/LoadingOverlay';
import { ResponsiveFrame } from './src/components/ResponsiveFrame';
import { usePetHealthApp } from './src/hooks/usePetHealthApp';
import { initializeRewardedAds } from './src/services/rewardedAd';
import { initializeIap } from './src/services/iap';
import { AdminReviewScreen } from './src/screens/AdminReviewScreen';
import { ManagedUserBanner } from './src/components/ManagedUserBanner';
import { AdminHubScreen } from './src/screens/AdminHubScreen';
import { AdminFeaturesScreen } from './src/screens/AdminFeaturesScreen';
import { AdminUserDetailScreen } from './src/screens/AdminUserDetailScreen';
import { CreateAdminPostScreen } from './src/screens/CreateAdminPostScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import { UpdateAccountScreen } from './src/screens/UpdateAccountScreen';
import { UpdateAccountChangeLoginScreen } from './src/screens/UpdateAccountChangeLoginScreen';
import { UpdateAccountChangePasswordScreen } from './src/screens/UpdateAccountChangePasswordScreen';
import { UpdateAccountRecoverPasswordScreen } from './src/screens/UpdateAccountRecoverPasswordScreen';
import { AddPetScreen } from './src/screens/AddPetScreen';
import { AnalysisProgressScreen } from './src/screens/AnalysisProgressScreen';
import { BreederProfileScreen } from './src/screens/BreederProfileScreen';
import { BreedRecognitionProgressScreen } from './src/screens/BreedRecognitionProgressScreen';
import { BreedRecognitionResultScreen } from './src/screens/BreedRecognitionResultScreen';
import { BreederDetailScreen } from './src/screens/BreederDetailScreen';
import { CoreCareInfoScreen } from './src/screens/CoreCareInfoScreen';
import { CoreCareScreen } from './src/screens/CoreCareScreen';
import { CreatePetFeedPostScreen } from './src/screens/CreatePetFeedPostScreen';
import { PetBreedRecognitionScreen } from './src/screens/PetBreedRecognitionScreen';
import { HealthCheckScreen } from './src/screens/HealthCheckScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { SignUpOtpVerificationScreen } from './src/screens/SignUpOtpVerificationScreen';
import { OnboardingIntroScreen } from './src/screens/OnboardingIntroScreen';
import { OnboardingHealthPromptScreen } from './src/screens/OnboardingHealthPromptScreen';
import { PetProfileScreen } from './src/screens/PetProfileScreen';
import { PetFeedScreen } from './src/screens/PetFeedScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { VetSummaryScreen } from './src/screens/VetSummaryScreen';

const DEFAULT_TEXT_STYLE = { fontFamily: 'Inter_400Regular', fontWeight: '400' as const };
let defaultTypographyApplied = false;

function mergeDefaultStyle(existing: unknown) {
  if (!existing) return DEFAULT_TEXT_STYLE;
  return Array.isArray(existing) ? [DEFAULT_TEXT_STYLE, ...existing] : [DEFAULT_TEXT_STYLE, existing];
}

function applyDefaultTypography() {
  if (defaultTypographyApplied) return;
  const textComponent = Text as unknown as { defaultProps?: { style?: unknown } };
  const inputComponent = TextInput as unknown as { defaultProps?: { style?: unknown } };
  textComponent.defaultProps = {
    ...(textComponent.defaultProps ?? {}),
    style: mergeDefaultStyle(textComponent.defaultProps?.style),
  };
  inputComponent.defaultProps = {
    ...(inputComponent.defaultProps ?? {}),
    style: mergeDefaultStyle(inputComponent.defaultProps?.style),
  };
  defaultTypographyApplied = true;
}

type StartupErrorBoundaryProps = {
  children: ReactNode;
};

type StartupErrorBoundaryState = {
  error: Error | null;
};

class StartupErrorBoundary extends Component<StartupErrorBoundaryProps, StartupErrorBoundaryState> {
  state: StartupErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): StartupErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Pet Health Care startup error', error);
  }

  render() {
    if (this.state.error) {
      return (
        <SafeAreaProvider>
          <SafeAreaView style={styles.errorContainer}>
            <Text style={styles.errorTitle}>App could not start</Text>
            <Text style={styles.errorMessage} selectable>
              {this.state.error.message}
            </Text>
          </SafeAreaView>
        </SafeAreaProvider>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <StartupErrorBoundary>
      <AppContent />
    </StartupErrorBoundary>
  );
}

function AppContent() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const { t } = useTranslation();
  const app = usePetHealthApp();
  const isAdmin = app.accountProfile?.primary_role === 'admin';
  const breedRecognitionEnabled = app.isFeatureEnabled('breed_recognition');
  const healthAnalysisEnabled = app.isFeatureEnabled('health_analysis');
  const rewardedAdsEnabled = app.isFeatureEnabled('rewarded_ads');
  const subscriptionEnabled = app.isFeatureEnabled('subscription');

  useEffect(() => {
    void initializeRewardedAds();
    void initializeIap();
  }, []);

  if (!fontsLoaded && !fontError) return null;
  if (fontsLoaded) applyDefaultTypography();

  if (app.sessionBootstrapping) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SafeAreaView className="flex-1 bg-slate-100" edges={['top', 'left', 'right', 'bottom']}>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const showBottomTab =
    app.screen === 'pet-feed' ||
    app.screen === 'home' ||
    app.screen === 'account' ||
    (isAdmin && app.screen === 'admin-features');
  const healthCreditCost = app.aiEconomicsConfig?.features.health_analysis?.creditCost ?? 1;
  const breedCreditCost = app.aiEconomicsConfig?.features.breed_recognition?.creditCost ?? 1;
  const rewardedAdCredits = app.aiEconomicsConfig?.rewardedAd?.creditsPerAd ?? 1;
  const accountDashboard = (
    <AccountScreen
      account={app.accountProfile}
      breederProfile={app.breederProfile}
      petCount={app.pets.length}
      savedPostCount={app.petFeedPosts.filter((post) => post.is_favorited).length}
      myPostCount={app.myPetFeedPosts.length}
      myPosts={app.myPetFeedPosts}
      adminBreederProfiles={app.adminBreederProfiles}
      adminFeedPosts={app.adminFeedPosts}
      adminFeedReports={app.adminFeedReports}
      adminPendingBreederRequestCount={app.adminBreederProfiles.filter((profile) => profile.verification_status === 'pending_review').length}
      adminRejectedBreederRequestCount={app.adminBreederProfiles.filter((profile) => profile.verification_status === 'rejected').length}
      adminPendingPostCount={app.adminFeedPosts.filter((post) => post.status === 'pending_review').length}
      adminPublishedPostCount={app.adminFeedPosts.filter((post) => post.status === 'published').length}
      adminArchivedPostCount={app.adminFeedPosts.filter((post) => post.status === 'archived').length}
      activeBreederCount={app.adminBreederProfiles.filter((profile) => profile.verification_status === 'verified').length}
      inactiveBreederCount={app.adminBreederProfiles.filter((profile) => profile.verification_status === 'rejected' || profile.verification_status === 'suspended').length}
      onOpenBreederProfile={app.openBreederProfile}
      onOpenPetFeed={app.openPetFeed}
      onOpenCreatePetFeedPost={app.openCreateAdminPost}
      onOpenAdminHub={app.openAdminHub}
      onOpenUpdateAccount={app.openUpdateAccount}
      onUpdateBreederStatus={app.updateAdminBreederStatus}
      onUpdatePostStatus={app.updateAdminPostStatus}
      onUpdateReportStatus={app.updateAdminReportStatus}
      onLogout={app.logout}
      onConfirmDeleteAccount={app.confirmDeleteAccount}
      showHeaderMenu={!isAdmin}
    />
  );

  return (
    <SafeAreaProvider>
      <StatusBar style={app.screen === 'login' || app.screen === 'forgot-password' || app.screen === 'signup-otp-verification' ? 'light' : 'dark'} />
      {app.screen === 'login' ? (
        <LoginScreen
          backendHealth={app.backendHealth}
          email={app.email}
          password={app.password}
          confirmPassword={app.confirmPassword}
          isSignUp={app.isSignUp}
          error={app.authError}
          fieldErrors={app.authFieldErrors}
          authSuccess={app.authSuccess}
          loading={app.loading}
          onChangeEmail={app.changeEmail}
          onChangePassword={app.changePassword}
          onChangeConfirmPassword={app.changeConfirmPassword}
          onToggleSignUp={app.toggleLoginSignUpMode}
          onSubmit={app.submitAuth}
          onForgotPassword={app.openForgotPassword}
        />
      ) : app.screen === 'forgot-password' ? (
        <ForgotPasswordScreen
          email={app.email}
          error={app.forgotPasswordError}
          success={app.forgotPasswordSuccess}
          loading={app.loading}
          otpModalOpen={app.forgotPasswordOtpOpen}
          pendingEmail={app.forgotPasswordPendingEmail}
          otp={app.forgotPasswordOtp}
          newPassword={app.forgotPasswordNewPassword}
          confirmPassword={app.forgotPasswordConfirmPassword}
          otpError={app.forgotPasswordOtpError}
          fieldErrors={{
            ...app.forgotPasswordFieldErrors,
            ...app.forgotPasswordRecoverFieldErrors,
          }}
          otpLoading={app.forgotPasswordOtpLoading}
          onChangeEmail={app.changeForgotPasswordEmail}
          onChangeOtp={app.changeForgotPasswordOtp}
          onChangeNewPassword={app.setForgotPasswordNewPassword}
          onChangeConfirmPassword={app.setForgotPasswordConfirmPassword}
          onBack={app.backToLoginFromForgotPassword}
          onSubmitSendOtp={() => void app.submitForgotPasswordSendOtp()}
          onCloseOtpModal={app.closeForgotPasswordOtpModal}
          onSubmitRecover={() => void app.submitForgotPasswordApply()}
        />
      ) : app.screen === 'signup-otp-verification' ? (
        <SignUpOtpVerificationScreen
          email={app.pendingSignUpEmail || app.email}
          otp={app.signUpOtp}
          error={app.signUpOtpError}
          loading={app.loading}
          onChangeOtp={app.changeSignUpOtp}
          onBack={app.backToSignUpFromOtpVerification}
          onSubmit={app.submitSignUpOtpVerification}
        />
      ) : (
        <SafeAreaView className="flex-1 bg-slate-100" edges={['top', 'left', 'right']}>
          <ResponsiveFrame>
            {showBottomTab ? <AppHeader /> : null}

            {app.managedUser ? <ManagedUserBanner managedUser={app.managedUser} onExit={app.exitManagedUser} /> : null}

            {app.screen === 'home' && isAdmin && !app.managedUser ? accountDashboard : null}

            {app.screen === 'home' && (!isAdmin || app.managedUser) && (
              <HomeScreen
                pets={app.pets}
                refreshing={app.refreshing}
                onRefresh={app.refreshPets}
                onAddPet={app.openCreatePet}
                onViewProfile={app.openPetProfile}
                onOpenCareServices={app.openCareServices}
              />
            )}

            {app.screen === 'pet-feed' && (
              <PetFeedScreen
                posts={app.petFeedPosts}
                announcementPosts={app.announcementPosts}
                breederProfiles={app.topBreederProfiles}
                initialLoading={app.petFeedInitialLoading}
                initialError={app.petFeedInitialError}
                announcementInitialLoading={app.announcementInitialLoading}
                announcementInitialError={app.announcementInitialError}
                refreshing={app.refreshing}
                loadingMore={app.petFeedLoadingMore}
                announcementLoadingMore={app.announcementLoadingMore}
                hasMore={app.petFeedHasMore}
                announcementHasMore={app.announcementHasMore}
                loadMoreError={app.petFeedLoadMoreError}
                announcementLoadMoreError={app.announcementLoadMoreError}
                onRefresh={app.refreshPetFeed}
                onLoadMore={app.loadMorePetFeed}
                onLoadMoreAnnouncements={app.loadMoreAnnouncements}
                onToggleFavorite={app.togglePetFeedFavorite}
                onReportPost={app.submitPetFeedReport}
                onHideBreeder={app.hideBreederProfile}
                onOpenBreederDetail={app.openBreederDetail}
              />
            )}

            {app.screen === 'breeder-detail' && app.selectedBreederProfile ? (
              <BreederDetailScreen
                profile={app.selectedBreederProfile}
                posts={app.selectedBreederPosts}
                onBack={app.closeBreederDetail}
                onToggleFavorite={app.togglePetFeedFavorite}
                onReportPost={app.submitPetFeedReport}
                onReportBreeder={app.submitBreederProfileReport}
                onHideBreeder={app.hideBreederProfile}
              />
            ) : null}

            {app.screen === 'account' && !isAdmin ? accountDashboard : null}

            {app.screen === 'admin-features' && isAdmin ? (
              <AdminFeaturesScreen
                flags={app.appFeatureFlags}
                loading={app.featureFlagsLoading}
                savingKey={app.featureFlagSavingKey}
                onToggle={app.updateAdminFeatureFlag}
                onLogout={app.logout}
              />
            ) : null}

            {app.screen === 'update-account' && !isAdmin ? (
              <UpdateAccountScreen
                onBack={app.backFromUpdateAccount}
                onChangeLoginIdentifier={app.openUpdateAccountChangeLogin}
                onChangePassword={app.openUpdateAccountChangePassword}
                onRecoverPassword={app.openUpdateAccountRecoverPassword}
              />
            ) : null}

            {app.screen === 'update-account-change-login' && !isAdmin ? (
              <UpdateAccountChangeLoginScreen
                currentLogin={app.accountProfile?.email ?? app.accountProfile?.login_identifier ?? ''}
                value={app.updateAccountNewLogin}
                currentPassword={app.updateAccountEmailChangePassword}
                error={app.updateAccountChangeLoginError}
                fieldErrors={app.updateAccountChangeLoginFieldErrors}
                success={app.updateAccountChangeLoginSuccess}
                loading={app.loading}
                otpModalOpen={app.updateAccountEmailOtpOpen}
                pendingEmail={app.updateAccountPendingNewEmail}
                otp={app.updateAccountEmailOtp}
                otpError={app.updateAccountEmailOtpError}
                otpLoading={app.updateAccountEmailOtpLoading}
                onChangeValue={app.changeUpdateAccountNewLogin}
                onChangeCurrentPassword={app.changeUpdateAccountEmailChangePassword}
                onChangeOtp={app.changeUpdateAccountEmailOtp}
                onBack={app.backToUpdateAccount}
                onSubmit={() => void app.submitUpdateAccountChangeLogin()}
                onCloseOtpModal={app.closeUpdateAccountEmailOtpModal}
                onSubmitOtp={() => void app.submitUpdateAccountEmailOtp()}
              />
            ) : null}

            {app.screen === 'update-account-change-password' && !isAdmin ? (
              <UpdateAccountChangePasswordScreen
                currentPassword={app.updateAccountCurrentPassword}
                newPassword={app.updateAccountNewPassword}
                confirmPassword={app.updateAccountConfirmNewPassword}
                error={app.updateAccountPasswordError}
                success={app.updateAccountPasswordSuccess}
                fieldErrors={app.updateAccountPasswordFieldErrors}
                loading={app.loading}
                onChangeCurrentPassword={app.setUpdateAccountCurrentPassword}
                onChangeNewPassword={app.setUpdateAccountNewPassword}
                onChangeConfirmPassword={app.setUpdateAccountConfirmNewPassword}
                onBack={app.backToUpdateAccount}
                onSubmit={() => void app.submitUpdateAccountChangePassword()}
              />
            ) : null}

            {app.screen === 'update-account-recover-password' && !isAdmin ? (
              <UpdateAccountRecoverPasswordScreen
                email={app.accountProfile?.email ?? app.accountProfile?.login_identifier ?? ''}
                error={app.updateAccountRecoverError}
                success={app.updateAccountRecoverSuccess}
                loading={app.loading}
                otpModalOpen={app.updateAccountRecoverOtpOpen}
                pendingEmail={app.updateAccountRecoverPendingEmail}
                otp={app.updateAccountRecoverOtp}
                newPassword={app.updateAccountRecoverNewPassword}
                confirmPassword={app.updateAccountRecoverConfirmPassword}
                otpError={app.updateAccountRecoverOtpError}
                fieldErrors={app.updateAccountRecoverFieldErrors}
                otpLoading={app.updateAccountRecoverOtpLoading}
                onBack={app.backToUpdateAccount}
                onSubmitSendOtp={() => void app.submitUpdateAccountRecoverPassword()}
                onChangeOtp={app.changeUpdateAccountRecoverOtp}
                onChangeNewPassword={app.setUpdateAccountRecoverNewPassword}
                onChangeConfirmPassword={app.setUpdateAccountRecoverConfirmPassword}
                onCloseOtpModal={app.closeUpdateAccountRecoverOtpModal}
                onSubmitRecover={() => void app.submitUpdateAccountRecoverPasswordApply()}
              />
            ) : null}

            {app.screen === 'breeder-profile' && (
              <BreederProfileScreen
                profile={app.breederProfile}
                onBack={app.closeBreederProfile}
                onSaveProfile={app.saveBreederProfile}
              />
            )}

            {app.screen === 'create-pet-feed-post' && (
              <CreatePetFeedPostScreen
                role={app.accountProfile?.primary_role}
                onBack={app.closeCreatePetFeedPost}
                onSubmit={app.submitPetFeedPost}
              />
            )}

            {app.screen === 'create-admin-post' && (
              <CreateAdminPostScreen
                onBack={app.closeCreateAdminPost}
                onSubmit={app.submitAnnouncementPost}
              />
            )}

            {app.screen === 'admin-hub' && (
              <AdminHubScreen
                accounts={app.adminAccounts}
                breederProfiles={app.adminBreederProfiles}
                posts={app.adminFeedPosts}
                reports={app.adminFeedReports}
                loading={app.loading}
                onBack={app.closeAdminHub}
                onRefresh={app.loadAdminReview}
                onCreateAccount={app.createAdminManagedAccount}
                onOpenUser={app.openAdminUserDetail}
                onUpdateBreederStatus={app.updateAdminBreederStatus}
                onUpdatePostStatus={app.updateAdminPostStatus}
                onUpdateReportStatus={app.updateAdminReportStatus}
              />
            )}

            {app.screen === 'admin-user-detail' && app.adminSelectedAccount ? (
              <AdminUserDetailScreen
                account={app.adminSelectedAccount}
                pets={app.adminUserPets}
                loading={app.adminUserPetsLoading}
                onBack={app.closeAdminUserDetail}
                onRefresh={() => app.loadAdminUserPets(app.adminSelectedAccount!.user_id)}
                onUpdateRole={(role) => app.updateAdminManagedAccount(app.adminSelectedAccount!.user_id, { primaryRole: role })}
                onAddPet={app.openAdminAddPetForUser}
                onActAsUser={() => app.enterManagedUser(app.adminSelectedAccount!)}
              />
            ) : null}

            {app.screen === 'admin-review' && (
              <AdminReviewScreen
                accounts={app.adminAccounts}
                breederProfiles={app.adminBreederProfiles}
                posts={app.adminFeedPosts}
                reports={app.adminFeedReports}
                onBack={app.closeAdminReview}
                onLoad={app.loadAdminReview}
                onCreateAccount={app.createAdminManagedAccount}
                onUpdateAccount={app.updateAdminManagedAccount}
                onUpdateBreederStatus={app.updateAdminBreederStatus}
                onUpdateStatus={app.updateAdminPostStatus}
                onUpdateReportStatus={app.updateAdminReportStatus}
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
                onDelete={() => app.handleDeletePet(app.selectedPet!)}
                onScanHealth={
                  healthAnalysisEnabled
                    ? () => app.goToCameraForPet(app.selectedPet!.id, { returnToProfile: true })
                    : undefined
                }
                onSelectEntry={(entry) => app.openHistoryDetail(entry, 'pet-profile')}
                onOpenBreedRecognition={
                  breedRecognitionEnabled ? () => app.openBreedRecognition('pet-profile') : undefined
                }
                onOpenCoreCare={() => app.openCoreCare(app.selectedPet!.id)}
                onOpenVetSummary={() => app.openVetSummary(app.selectedPet!.id)}
                coreCareSummary={app.coreCareSummary}
                coreCareRecords={app.coreCareRecords}
              />
            ) : null}

            {(app.screen === 'add-pet' || app.screen === 'edit-pet') && (
              <AddPetScreen
                variant={app.petFormMode === 'edit' ? 'edit' : 'create'}
                petName={app.petName}
                petSpecies={app.petSpecies}
                petBreed={app.petBreed}
                petBirthDate={app.petBirthDate}
                petGender={app.petGender}
                petAvatarUrl={app.petAvatarUrl}
                onChangeName={app.setPetName}
                onChangeSpecies={app.setPetSpecies}
                onChangeBreed={app.setPetBreed}
                onChangeBirthDate={app.setPetBirthDate}
                onChangeGender={app.setPetGender}
                onPickAvatar={app.pickPetAvatar}
                onSubmit={app.petFormMode === 'edit' ? app.handleUpdatePet : app.handleAddPet}
                onCancel={app.cancelPetForm}
                headerTitle={app.adminAddPetForUserId && app.adminSelectedAccount
                  ? t('adminHub.addPetFor', { name: app.adminSelectedAccount.display_name || app.adminSelectedAccount.login_identifier })
                  : undefined}
                helperMessage={app.adminAddPetForUserId ? t('adminHub.addPetHelper') : undefined}
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
                petBirthDate={app.petBirthDate}
                petGender={app.petGender}
                petAvatarUrl={app.petAvatarUrl}
                onChangeName={app.setPetName}
                onChangeSpecies={app.setPetSpecies}
                onChangeBreed={app.setPetBreed}
                onChangeBirthDate={app.setPetBirthDate}
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
                showBreedService={breedRecognitionEnabled}
                showHealthService={healthAnalysisEnabled}
                onExploreBreed={() => app.openBreedRecognition('onboarding-health-prompt')}
                onCheckHealth={app.goToHealthCheckFromServicesPrompt}
                onManageVaccines={app.goToCoreCareFromServicesPrompt}
                onSkip={app.dismissServicesPrompt}
              />
            ) : null}

            {app.screen === 'core-care' && app.selectedPet ? (
              <CoreCareScreen
                pet={app.selectedPet}
                records={app.coreCareRecords}
                history={app.history}
                summary={app.coreCareSummary}
                refreshing={app.refreshing}
                aiCredits={app.aiCredits}
                creditLedger={app.creditLedger}
                onBack={app.closeCoreCare}
                onOpenInfo={app.openCoreCareInfo}
                onRefresh={() => app.openCoreCare(app.selectedPet!.id)}
                onCreateRecord={app.createCoreCareEntry}
                onMarkReminderDone={app.markReminderDone}
                onClaimRewardedAd={rewardedAdsEnabled ? app.claimAdCredit : async () => {}}
              />
            ) : null}

            {app.screen === 'core-care-info' ? <CoreCareInfoScreen onBack={app.closeCoreCareInfo} /> : null}

            {app.screen === 'vet-summary' && app.selectedPet ? (
              <VetSummaryScreen
                pet={app.selectedPet}
                records={app.coreCareRecords}
                history={app.history}
                onBack={app.closeVetSummary}
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
                aiCredits={app.aiCredits}
                aiCreditCost={healthCreditCost}
                rewardedAdCredits={rewardedAdCredits}
                onWatchRewardedAd={rewardedAdsEnabled ? app.watchRewardedAdForCredit : undefined}
                onSubscribePremium={subscriptionEnabled ? app.openPremiumSubscription : undefined}
                onOpenBreedRecognition={
                  breedRecognitionEnabled ? () => app.openBreedRecognition('health-check') : undefined
                }
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
                aiCredits={app.aiCredits}
                aiCreditCost={healthCreditCost}
                rewardedAdCredits={rewardedAdCredits}
                onWatchRewardedAd={rewardedAdsEnabled ? app.watchRewardedAdForCredit : undefined}
                onSubscribePremium={subscriptionEnabled ? app.openPremiumSubscription : undefined}
                onOpenBreedRecognition={
                  breedRecognitionEnabled ? () => app.openBreedRecognition('onboarding-health-check') : undefined
                }
              />
            ) : null}

            {app.screen === 'breed-recognition' && app.selectedPet && breedRecognitionEnabled ? (
              <PetBreedRecognitionScreen
                pet={app.selectedPet}
                slotUris={app.breedRecognitionSlotUris}
                loading={app.breedRecognitionLoading}
                aiCredits={app.aiCredits}
                aiCreditCost={breedCreditCost}
                rewardedAdCredits={rewardedAdCredits}
                onBack={app.closeBreedRecognition}
                onPickSlot={app.pickBreedRecognitionSlot}
                onClearSlot={app.clearBreedRecognitionSlot}
                onAnalyze={app.submitBreedRecognition}
                onWatchRewardedAd={rewardedAdsEnabled ? app.watchRewardedAdForCredit : undefined}
                onSubscribePremium={subscriptionEnabled ? app.openPremiumSubscription : undefined}
              />
            ) : null}

            {app.screen === 'breed-recognition-progress' && app.selectedPet && breedRecognitionEnabled ? (
              <BreedRecognitionProgressScreen
                pet={app.selectedPet}
                slotUris={app.breedRecognitionSlotUris}
                loading={app.breedRecognitionLoading}
              />
            ) : null}

            {app.screen === 'breed-recognition-result' && app.selectedPet && app.breedRecognitionResult && breedRecognitionEnabled ? (
              <BreedRecognitionResultScreen
                pet={app.selectedPet}
                result={app.breedRecognitionResult}
                slotUris={app.breedRecognitionSlotUris}
                loading={app.loading}
                onBack={app.closeBreedRecognition}
                onEditPhotos={app.editBreedRecognitionPhotos}
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
                onPetFeed={app.openPetFeed}
                onHome={app.goHomeAndRefresh}
                onAccount={isAdmin ? app.openAdminFeatures : app.openAccount}
                accountTabMode={isAdmin ? 'features' : 'account'}
              />
            ) : null}
          </ResponsiveFrame>
        </SafeAreaView>
      )}
      <LoadingOverlay visible={app.loading} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
  },
  errorTitle: {
    marginBottom: 12,
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '700',
  },
  errorMessage: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
});
