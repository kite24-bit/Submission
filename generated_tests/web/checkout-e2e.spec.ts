import { test, expect } from '@playwright/test';
import { TestUtils } from '../../utils/test-utils';

test.describe('Checkout Flow', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await page.goto('/');
    await utils.waitForPageLoad();
  });

  test('Happy path — fill all fields and submit, assert success', async ({ page }) => {
    // Fill Email
    const emailInput = page.getByLabel('Email Address');
    await emailInput.fill('test@example.com');
    await emailInput.blur();
    await utils.waitForApiResponse('**/api/validate-email');

    // Fill Card Number
    const cardInput = page.getByLabel('Card Number');
    await cardInput.fill('4242 4242 4242 4242');
    await cardInput.blur();
    await utils.waitForApiResponse('**/api/validate-card');

    // Fill Expiry
    await page.getByLabel('Expiry').fill('12/26');

    // Fill CVV
    await page.getByLabel('CVV').fill('123');

    // Fill Amount
    await page.getByLabel('Amount (USD)').fill('100.00');

    // Submit Payment
    const submitButton = page.getByRole('button', { name: 'Pay $100.00' });
    await submitButton.click();
    await utils.waitForApiResponse('**/api/checkout');

    // Assert Success Message
    await expect(page.getByText('✅ Payment processed successfully!')).toBeVisible();
  });

  test('Negative test 1 — derived from page.tsx (Invalid Card Number)', async ({ page }) => {
    // Fill Invalid Card Number (Luhn check fails for ...4243)
    const cardInput = page.getByLabel('Card Number');
    await cardInput.fill('4242 4242 4242 4243');
    await cardInput.blur();
    
    // Wait for card validation response
    await utils.waitForApiResponse('**/api/validate-card');

    // Assert validation message on blur
    await expect(page.getByText('❌ Invalid card number (Luhn check failed)')).toBeVisible();

    // Fill other required fields to enable submission check
    await page.getByLabel('Email Address').fill('test@example.com');
    await page.getByLabel('Expiry').fill('12/26');
    await page.getByLabel('CVV').fill('123');
    await page.getByLabel('Amount (USD)').fill('50.00');

    // Attempt to submit
    await page.getByRole('button', { name: 'Pay $50.00' }).click();

    // Assert blocking error message
    await expect(page.getByText('❌ Please enter a valid card number')).toBeVisible();
  });

  test('Negative test 2 — derived from page.tsx (Email validation service error)', async ({ page }) => {
    // Fill Email
    const emailInput = page.getByLabel('Email Address');
    await emailInput.fill('test@example.com');
    await emailInput.blur();

    // Wait for email validation response (Backend returns 500)
    await utils.waitForApiResponse('**/api/validate-email');

    // Assert soft-fail warning message
    await expect(page.getByText('⚠️ Email validation service temporarily unavailable. You can still proceed.')).toBeVisible();
  });
});
