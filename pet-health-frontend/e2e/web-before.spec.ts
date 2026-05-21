import { expect, test } from '@playwright/test';

import { installMockApi } from './fixtures/mockApi';

async function openFreshApp(page: Parameters<typeof installMockApi>[0]) {
  page.on('dialog', (dialog) => dialog.dismiss());
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto('/');
}

async function login(page: Parameters<typeof installMockApi>[0]) {
  await expect(page.getByTestId('login-email-input')).toBeVisible();
  await page.getByTestId('login-email-input').fill('e2e@example.com');
  await page.getByTestId('login-password-input').fill('password123');
  await page.getByTestId('login-submit-button').click();
  await expect(page.getByTestId('home-screen')).toBeVisible();
}

test.describe('Phase 1 Web E2E before', () => {
  test('creates a pet, adds core care records, and claims an ad credit', async ({ page }) => {
    await installMockApi(page);
    await openFreshApp(page);

    await login(page);
    await expect(page.getByTestId('home-add-first-pet-button')).toBeVisible();
    await page.getByTestId('home-add-first-pet-button').click();

    await expect(page.getByTestId('add-pet-name-input')).toBeVisible();
    await page.getByTestId('add-pet-name-input').fill('Luna');
    await page.getByTestId('add-pet-breed-input').fill('Poodle');
    await page.getByTestId('add-pet-age-input').fill('2');
    await page.getByTestId('add-pet-submit-button').click();

    await expect(page.getByTestId('onboarding-health-prompt-screen')).toBeVisible();
    await page.getByTestId('onboarding-health-prompt-skip-button').click();
    await expect(page.getByTestId('home-pet-card-pet-1')).toBeVisible();
    await expect(page.getByText('Luna')).toBeVisible();

    await page.getByTestId('home-core-care-button-pet-1').click();
    await expect(page.getByTestId('core-care-screen')).toBeVisible();
    await expect(page.getByText('2 AI credits available.')).toBeVisible();

    await page.getByTestId('core-care-title-input').fill('Ate breakfast');
    await page.getByTestId('core-care-note-input').fill('Finished the full bowl and drank water.');
    await page.getByTestId('core-care-save-record-button').click();
    await expect(page.getByText('Ate breakfast')).toBeVisible();

    await page.getByTestId('core-care-type-reminder-button').click();
    await page.getByTestId('core-care-title-input').fill('Flea medicine');
    await page.getByTestId('core-care-note-input').fill('Monthly prevention dose.');
    await page.getByTestId('core-care-due-date-input').fill('2026-06-01T09:00:00Z');
    await page.getByTestId('core-care-save-record-button').click();
    await expect(page.getByTestId('core-care-record-record-2').getByText('Flea medicine')).toBeVisible();

    await page.getByTestId('core-care-claim-ad-credit-button').click();
    await expect(page.getByText('3 AI credits available.')).toBeVisible();
  });
});
