import { expect, test, type Page } from '@playwright/test';

import { installMockApi, MOCK_E2E_OTP } from './fixtures/mockApi';

const tinyPng = {
  name: 'pet-photo.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l8Rk9QAAAABJRU5ErkJggg==',
    'base64',
  ),
};

const seededAnalysis = {
  id: 'analysis-1',
  user_id: 'e2e-user',
  pet_id: 'pet-1',
  diagnosis: 'Routine wellness check',
  assessment: {
    schema_version: 'health_assessment.v1',
    output_locale: 'en',
    status: 'ok',
    severity: 'low',
    confidence: 0.88,
    possible_finding: 'Routine wellness check',
    observed_signs: ['Normal appetite', 'Playful behavior'],
    visual_evidence: ['No visible emergency signs.'],
    missing_data: [],
    care_guidance: 'Keep routine care, monitor hydration, and contact a veterinarian if signs change.',
    red_flags: [],
    next_action: {
      urgency: 'self_monitor',
      summary: 'Continue normal monitoring.',
      ask_user_to_add: ['Add more details if symptoms change.'],
    },
    candidates: [],
    safety: {
      is_definitive_diagnosis: false,
      contains_medication_dosage: false,
      requires_vet_attention: false,
      disclaimer: 'This information is for reference only and does not replace diagnosis or treatment from a licensed veterinarian.',
    },
  },
  severity: 'low' as const,
  symptoms: ['Normal appetite', 'Playful behavior'],
  treatment: 'Keep routine care, monitor hydration, and contact a veterinarian if signs change.',
  confidence: 0.88,
  disclaimer:
    'This AI wellness screening is for early guidance only and is not a veterinary diagnosis. Consult a licensed veterinarian for medical decisions.',
  output_locale: 'en',
  image_url: null,
  created_at: '2026-05-20T09:00:00.000Z',
  status: 'ok' as const,
  red_flags: [],
  evidence: ['No visible emergency signs.'],
  missing_data: [],
  next_action: {
    summary: 'Continue normal monitoring.',
    ask_user_to_add: ['Add more details if symptoms change.'],
  },
};

async function openFreshApp(page: Page) {
  page.on('dialog', (dialog) => dialog.dismiss());
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto('/');
}

async function chooseBirthDate(page: Page, testID: string, isoDate: string) {
  await page.getByTestId(testID).click();
  const picker = page.getByTestId(`${testID}-picker`);
  await picker.waitFor({ state: 'visible' });
  await picker.fill(isoDate);
}

async function chooseImage(page: Page, testID: string) {
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId(testID).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(tinyPng);
}

const EXPECT_DELAY_MS = Number(process.env.E2E_EXPECT_DELAY_MS ?? process.env.E2E_SLOW_MO_MS ?? 0);

async function verify(page: Page, assertion: Promise<void>) {
  await assertion;
  if (EXPECT_DELAY_MS > 0) {
    await page.waitForTimeout(EXPECT_DELAY_MS);
  }
}

test.describe('Web feature smoke coverage', () => {
  test.setTimeout(240_000);

  test('runs the full web feature smoke flow', async ({ page }) => {
    await installMockApi(page, { analyses: [seededAnalysis], creditBalance: 4 });
    await openFreshApp(page);

    await test.step('sign up, land on home, and create first pet when ready', async () => {
      await verify(page, expect(page.getByTestId('login-email-input')).toBeVisible());
      await page.getByTestId('language-vietnamese-button').click();
      await page.getByTestId('language-english-button').click();

      await page.getByTestId('signup-mode-button').click();
      await page.getByTestId('login-email-input').fill('luna.parent@example.com');
      await page.getByTestId('login-password-input').fill('password123');
      await page.getByTestId('login-confirm-password-input').fill('password123');
      await page.getByTestId('signup-submit-button').click();

      await verify(page, expect(page.getByTestId('signup-otp-input')).toBeVisible());
      await page.getByTestId('signup-otp-input').fill(MOCK_E2E_OTP);
      await page.getByTestId('signup-otp-verify-button').click();

      await verify(page, expect(page.getByTestId('onboarding-intro-screen')).toBeVisible());
      await page.getByTestId('onboarding-intro-go-button').click();
      await verify(page, expect(page.getByTestId('home-screen')).toBeVisible());
      await verify(page, expect(page.getByTestId('home-add-first-pet-button')).toBeVisible());
      await page.getByTestId('home-add-first-pet-button').click();
      await verify(page, expect(page.getByTestId('add-pet-name-input')).toBeVisible());
      await chooseImage(page, 'add-pet-avatar-button');
      await page.getByTestId('add-pet-name-input').fill('Luna');
      await chooseBirthDate(page, 'add-pet-birth-date-field', '2024-01-15');
      await page.getByTestId('add-pet-gender-select').click();
      await page.getByTestId('add-pet-gender-select-option-female').click();
      await page.getByTestId('add-pet-breed-input').fill('Domestic Shorthair');
      await page.getByTestId('add-pet-submit-button').click();

      await verify(page, expect(page.getByTestId('onboarding-health-prompt-screen')).toBeVisible());
      await page.getByTestId('onboarding-health-prompt-skip-button').click();
      await verify(page, expect(page.getByTestId('home-pet-card-pet-1')).toBeVisible());
      await verify(page, expect(page.getByText('Luna')).toBeVisible());
    });

    await test.step('add a core care vaccine record', async () => {
      await page.getByTestId('home-care-services-button-pet-1').click();
      await verify(page, expect(page.getByTestId('onboarding-health-prompt-screen')).toBeVisible());
      await page.getByTestId('onboarding-service-vaccine-button').click();
      await verify(page, expect(page.getByTestId('core-care-screen')).toBeVisible());
      await page.getByTestId('core-care-intro-dismiss-button').click();

      await page.getByTestId('core-care-vaccine-title-input').fill('Flea medicine');
      await page.getByTestId('core-care-vaccine-note-input').fill('Monthly prevention dose.');
      await page.getByTestId('core-care-save-vaccine-button').click();
      await verify(page, expect(page.getByText('Flea medicine').first()).toBeVisible());
      await page.getByTestId('core-care-back-button').click();
      await verify(page, expect(page.getByTestId('pet-profile-screen')).toBeVisible());
    });

    await test.step('review history and edit profile', async () => {
      await page.getByTestId('pet-profile-back-button').click();
      await verify(page, expect(page.getByTestId('home-screen')).toBeVisible());
      await page.getByTestId('home-view-profile-button-pet-1').click();
      await verify(page, expect(page.getByTestId('pet-profile-screen')).toBeVisible());
      await verify(page, expect(page.getByTestId('pet-profile-screen').getByText('Luna', { exact: true }).first()).toBeVisible());
      await page.getByTestId('pet-profile-history-entry-analysis-1').click();
      await verify(page, expect(page.getByTestId('results-screen')).toBeVisible());
      await verify(page, expect(page.getByText('Routine wellness check')).toBeVisible());
      await page.getByTestId('results-back-button').click();
      await verify(page, expect(page.getByTestId('pet-profile-screen')).toBeVisible());

      await page.getByTestId('pet-profile-edit-button').click();
      await verify(page, expect(page.getByTestId('add-pet-name-input')).toBeVisible());
      await page.getByTestId('add-pet-name-input').fill('Luna Prime');
      await page.getByTestId('add-pet-breed-input').fill('Tabby mix');
      await page.getByTestId('edit-pet-submit-button').click();
      await verify(page, expect(page.getByTestId('pet-profile-screen')).toBeVisible());
      await verify(page, expect(page.getByTestId('pet-profile-screen').getByText('Luna Prime', { exact: true }).first()).toBeVisible());
      await verify(page, expect(page.getByTestId('pet-profile-screen').getByText('Tabby mix').first()).toBeVisible());
    });

    await test.step('fill health check and verify breed navigation', async () => {
      await page.getByTestId('pet-profile-back-button').click();
      await verify(page, expect(page.getByTestId('home-screen')).toBeVisible());
      await page.getByTestId('home-care-services-button-pet-1').click();
      await verify(page, expect(page.getByTestId('onboarding-health-prompt-screen')).toBeVisible());
      await page.getByTestId('onboarding-service-health-button').click();
      await verify(page, expect(page.getByTestId('health-check-screen')).toBeVisible());
      await page.getByTestId('health-check-weight-input').fill('4.2');
      await page.getByTestId('health-check-vaccinated-yes').click();
      await page.getByTestId('health-check-vaccine-select-button').click();
      await page.getByTestId('health-check-vaccine-option-cat_rabies').click();
      await page.getByTestId('health-check-vaccine-done-button').click();
      await page.getByTestId('health-check-neutered-yes').click();
      await page.getByTestId('health-check-medical-history-input').fill('No chronic conditions.');
      await page.getByTestId('health-check-symptoms-input').fill('Routine wellness check.');
      await page.getByTestId('health-check-open-breed-recognition-button').click();
      await verify(page, expect(page.getByTestId('breed-recognition-screen')).toBeVisible());
      await page.getByTestId('breed-recognition-back-button').click();
      await verify(page, expect(page.getByTestId('health-check-screen')).toBeVisible());
    });

    await test.step('run health analysis and breed recognition with media uploads', async () => {
      await chooseImage(page, 'health-check-add-photos-button');
      await page.getByTestId('health-check-symptoms-input').fill('Eyes look bright, appetite is normal.');
      await verify(page, expect(page.getByTestId('health-check-start-analysis-button')).toBeEnabled());
      await page.getByTestId('health-check-start-analysis-button').click();
      await verify(
        page,
        expect(page.getByTestId('analysis-progress-screen').or(page.getByTestId('results-screen')).first()).toBeVisible(),
      );
      await verify(page, expect(page.getByTestId('results-screen')).toBeVisible());
      await verify(page, expect(page.getByText('Routine wellness baseline')).toBeVisible());
      await page.getByTestId('results-back-button').click();
      await verify(page, expect(page.getByTestId('home-screen')).toBeVisible());
      await page.getByTestId('home-care-services-button-pet-1').click();
      await verify(page, expect(page.getByTestId('onboarding-health-prompt-screen')).toBeVisible());
      await page.getByTestId('onboarding-service-breed-button').click();
      await verify(page, expect(page.getByTestId('breed-recognition-screen')).toBeVisible());
      await chooseImage(page, 'breed-recognition-pick-photo-face');
      await chooseImage(page, 'breed-recognition-pick-photo-fullBodySide');
      await chooseImage(page, 'breed-recognition-pick-photo-coat');
      await verify(page, expect(page.getByTestId('breed-recognition-analyze-button')).toBeEnabled());
      await page.getByTestId('breed-recognition-analyze-button').click();
      await verify(
        page,
        expect(
          page.getByTestId('breed-recognition-progress-screen').or(page.getByTestId('breed-recognition-result-screen')).first(),
        ).toBeVisible(),
      );
      await verify(page, expect(page.getByTestId('breed-recognition-result-screen')).toBeVisible());
      await verify(page, expect(page.getByText('British Shorthair mix', { exact: true })).toBeVisible());
      await page.getByTestId('breed-recognition-apply-profile-button').click();
      await verify(page, expect(page.getByTestId('onboarding-health-prompt-screen')).toBeVisible());
      await page.getByTestId('onboarding-health-prompt-skip-button').click();
      await verify(page, expect(page.getByTestId('home-screen')).toBeVisible());
      await page.getByTestId('home-view-profile-button-pet-1').click();
      await verify(page, expect(page.getByTestId('pet-profile-screen')).toBeVisible());
      await verify(page, expect(page.getByTestId('pet-profile-screen').getByText('British Shorthair mix').first()).toBeVisible());
    });

    await test.step('use bottom tabs', async () => {
      await page.getByTestId('pet-profile-back-button').click();
      await verify(page, expect(page.getByTestId('home-screen')).toBeVisible());
      await page.getByTestId('bottom-tab-pet-feed-button').click();
      await verify(page, expect(page.getByTestId('pet-feed-screen')).toBeVisible());
      await verify(page, expect(page.getByText('British Shorthair kitten looking for a caring home')).toBeVisible());
      await page.getByTestId('pet-feed-search-input').fill('British Shorthair');
      await verify(page, expect(page.getByText('British Shorthair kitten looking for a caring home')).toBeVisible());
      await page.getByText('British Shorthair kitten looking for a caring home').click();
      await verify(page, expect(page.getByText('Listing details')).toBeVisible());
      await page.getByLabel('Close listing details').click();
      await page.getByTestId('bottom-tab-home-button').click();
      await verify(page, expect(page.getByTestId('home-screen')).toBeVisible());
    });

    await test.step('update account password and log out', async () => {
      await page.getByTestId('bottom-tab-account-button').click();
      await verify(page, expect(page.getByTestId('account-screen')).toBeVisible());

      await page.getByTestId('account-menu-button').click();
      await page.getByTestId('account-menu-update-button').click();
      await verify(page, expect(page.getByTestId('update-account-screen')).toBeVisible());

      await page.getByTestId('update-account-change-password-button').click();
      await verify(page, expect(page.getByTestId('update-account-change-password-screen')).toBeVisible());
      await page.getByTestId('update-account-current-password-input').fill('password123');
      await page.getByTestId('update-account-new-password-input').fill('newpass99');
      await page.getByTestId('update-account-confirm-new-password-input').fill('newpass99');
      await page.getByTestId('update-account-change-password-submit-button').click();
      await verify(page, expect(page.getByText('Your password has been updated successfully.')).toBeVisible());

      await page.getByTestId('update-account-change-password-back-button').click();
      await verify(page, expect(page.getByTestId('update-account-screen')).toBeVisible());
      await page.getByTestId('update-account-back-button').click();
      await verify(page, expect(page.getByTestId('account-screen')).toBeVisible());

      await page.getByTestId('account-menu-button').click();
      await page.getByTestId('account-menu-logout-button').click();
      await verify(page, expect(page.getByTestId('login-email-input')).toBeVisible());
    });
  });
});
