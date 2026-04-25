import { test, expect } from '@playwright/test';
import { TestUtils } from '../../utils/test-utils';

test.describe('Checkout E2E Tests', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await page.goto('/');
  });

  test('Happy path — fill all fields and submit, assert success', async ({ page }) => {
    await utils.fillField('input[name="email"]', 'test@example.com');
    
    // Using a standard valid test card number (Visa)
    await utils.fillField('input[name="cardNumber"]', '4111 1111 1111 1111');
    await page.locator('input[name="cardNumber"]').blur();
    
    await utils.fillField('input[name="expiry"]', '12/25');
    await utils.fillField('input[name="cvv"]', '123');
    await utils.fillField('input[name="amount"]', '100.00');

    await page.click('button[type="submit"]');

    const successMessage = page.locator('div', { hasText: '✅' });
    await expect(successMessage).toBeVisible({ timeout: 10000 });
  });

  test('Negative test 1 — blocking card validation failure', async ({ page }) => {
    await utils.fillField('input[name="email"]', 'test@example.com');
    
    // Fill an intentionally invalid card number to trigger Luhn failure
    await utils.fillField('input[name="cardNumber"]', '4111 1111 1111 1112');
    await page.locator('input[name="cardNumber"]').blur();

    // Verify blocking validation message appears on blur
    const validationMessage = page.locator('text=❌ Invalid card number (Luhn check failed)');
    await expect(validationMessage).toBeVisible();

    await utils.fillField('input[name="expiry"]', '12/25');
    await utils.fillField('input[name="cvv"]', '123');
    await utils.fillField('input[name="amount"]', '50.00');

    await page.click('button[type="submit"]');

    // Assert the submission-time blocking error message
    const submitErrorMessage = page.locator('text=❌ Please enter a valid card number');
    await expect(submitErrorMessage).toBeVisible();
  });

  test('Negative test 2 — payment failure from backend', async ({ page }) => {
    // Mock the checkout API to return a failure
    await page.route('**/api/checkout', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Insufficient funds' }),
      });
    });

    await utils.fillField('input[name="email"]', 'failure@example.com');
    await utils.fillField('input[name="cardNumber"]', '4111 1111 1111 1111');
    await page.locator('input[name="cardNumber"]').blur();
    
    await utils.fillField('input[name="expiry"]', '12/25');
    await utils.fillField('input[name="cvv"]', '123');
    await utils.fillField('input[name="amount"]', '9999.99');

    await page.click('button[type="submit"]');

    // Assert the payment failure message from page.tsx logic
    const failureMessage = page.locator('text=❌ Payment failed: Insufficient funds');
    await expect(failureMessage).toBeVisible();
  });
});
