import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

function lazyNamed<TModule, TExport extends keyof TModule>(
  loader: () => Promise<TModule>,
  exportName: TExport,
): LazyExoticComponent<TModule[TExport] extends ComponentType<any> ? TModule[TExport] : ComponentType<any>> {
  return lazy(async () => {
    const mod = await loader();
    const Comp = mod[exportName];
    return { default: Comp as ComponentType<any> };
  }) as LazyExoticComponent<TModule[TExport] extends ComponentType<any> ? TModule[TExport] : ComponentType<any>>;
}

/** Screens kept eager: Login, Home, PetFeed, Account (cold-path tabs). */

export const AdminReviewScreen = lazyNamed(() => import('./AdminReviewScreen'), 'AdminReviewScreen');
export const AdminHubScreen = lazyNamed(() => import('./AdminHubScreen'), 'AdminHubScreen');
export const AdminFeaturesScreen = lazyNamed(() => import('./AdminFeaturesScreen'), 'AdminFeaturesScreen');
export const AdminUserDetailScreen = lazyNamed(() => import('./AdminUserDetailScreen'), 'AdminUserDetailScreen');
export const CreateAdminPostScreen = lazyNamed(() => import('./CreateAdminPostScreen'), 'CreateAdminPostScreen');
export const UpdateAccountScreen = lazyNamed(() => import('./UpdateAccountScreen'), 'UpdateAccountScreen');
export const UpdateAccountChangeLoginScreen = lazyNamed(
  () => import('./UpdateAccountChangeLoginScreen'),
  'UpdateAccountChangeLoginScreen',
);
export const UpdateAccountChangePasswordScreen = lazyNamed(
  () => import('./UpdateAccountChangePasswordScreen'),
  'UpdateAccountChangePasswordScreen',
);
export const UpdateAccountRecoverPasswordScreen = lazyNamed(
  () => import('./UpdateAccountRecoverPasswordScreen'),
  'UpdateAccountRecoverPasswordScreen',
);
export const AddPetScreen = lazyNamed(() => import('./AddPetScreen'), 'AddPetScreen');
export const AnalysisProgressScreen = lazyNamed(() => import('./AnalysisProgressScreen'), 'AnalysisProgressScreen');
export const BreederProfileScreen = lazyNamed(() => import('./BreederProfileScreen'), 'BreederProfileScreen');
export const BreedRecognitionProgressScreen = lazyNamed(
  () => import('./BreedRecognitionProgressScreen'),
  'BreedRecognitionProgressScreen',
);
export const BreedRecognitionResultScreen = lazyNamed(
  () => import('./BreedRecognitionResultScreen'),
  'BreedRecognitionResultScreen',
);
export const BreederDetailScreen = lazyNamed(() => import('./BreederDetailScreen'), 'BreederDetailScreen');
export const CoreCareInfoScreen = lazyNamed(() => import('./CoreCareInfoScreen'), 'CoreCareInfoScreen');
export const CoreCareScreen = lazyNamed(() => import('./CoreCareScreen'), 'CoreCareScreen');
export const CreatePetFeedPostScreen = lazyNamed(() => import('./CreatePetFeedPostScreen'), 'CreatePetFeedPostScreen');
export const PetBreedRecognitionScreen = lazyNamed(() => import('./PetBreedRecognitionScreen'), 'PetBreedRecognitionScreen');
export const HealthCheckScreen = lazyNamed(() => import('./HealthCheckScreen'), 'HealthCheckScreen');
export const HistoryScreen = lazyNamed(() => import('./HistoryScreen'), 'HistoryScreen');
export const ForgotPasswordScreen = lazyNamed(() => import('./ForgotPasswordScreen'), 'ForgotPasswordScreen');
export const LanguageSelectionScreen = lazyNamed(() => import('./LanguageSelectionScreen'), 'LanguageSelectionScreen');
export const MessagesInboxScreen = lazyNamed(() => import('./MessagesInboxScreen'), 'MessagesInboxScreen');
export const MessageThreadScreen = lazyNamed(() => import('./MessageThreadScreen'), 'MessageThreadScreen');
export const SignUpOtpVerificationScreen = lazyNamed(
  () => import('./SignUpOtpVerificationScreen'),
  'SignUpOtpVerificationScreen',
);
export const OnboardingIntroScreen = lazyNamed(() => import('./OnboardingIntroScreen'), 'OnboardingIntroScreen');
export const OnboardingHealthPromptScreen = lazyNamed(
  () => import('./OnboardingHealthPromptScreen'),
  'OnboardingHealthPromptScreen',
);
export const PetProfileScreen = lazyNamed(() => import('./PetProfileScreen'), 'PetProfileScreen');
export const ResultsScreen = lazyNamed(() => import('./ResultsScreen'), 'ResultsScreen');
export const VetSummaryScreen = lazyNamed(() => import('./VetSummaryScreen'), 'VetSummaryScreen');
