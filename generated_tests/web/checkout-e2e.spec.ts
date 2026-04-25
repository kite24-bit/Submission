import { test, expect } from '@playwright/test';
import { TestUtils } from '../../utils/test-utils';

test.describe('Checkout E2E Tests', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await page.goto('/');
  });

  test('Happy path — fill all fields and submit, assert success', async ({ page }) => {
    // Fill all fields with valid data
    await utils.fillField('input[name="email"]', 'customer@example.com');
    // Using formatted value to satisfy TestUtils.fillField's internal value assertion
    await utils.fillField('input[name="cardNumber"]', '4111 1111 1111 1111');
    await utils.fillField('input[name="expiry"]', '12/28');
    await utils.fillField('input[name="cvv"]', '123');
    await utils.fillField('input[name="amount"]', '150.00');

    // Submit the form
    await utils.clickElement('button[type="submit"]');

    // Assert success message is displayed (contains ✅ from page.tsx)
    const successMessage = page.locator('div:has-text("✅")');
    await expect(successMessage).toBeVisible({ timeout: 10000 });
  });

  test('Negative test 1 — derived from page.tsx: card Luhn validation failure', async ({ page }) => {
    // Fill email
    await utils.fillField('input[name="email"]', 'test@example.com');
    
    // Fill invalid card number (fails Luhn check)
    await utils.fillField('input[name="cardNumber"]', '1234 5678 1234 5678');
    
    // Trigger blur to initiate async card validation
    await page.locator('input[name="cardNumber"]').blur();
    
    // Assert the specific validation error message from handleCardBlur in page.tsx
    await expect(page.locator('text=❌ Invalid card number (Luhn check failed)')).toBeVisible();
    
    // Fill remaining fields
    await utils.fillField('input[name="expiry"]', '12/28');
    await utils.fillField('input[name="cvv"]', '123');
    await utils.fillField('input[name="amount"]', '50.00');

    // Attempt to submit
    await utils.clickElement('button[type="submit"]');

    // Assert submission is blocked by client-side cardValid check
    await expect(page.locator('text=❌ Please enter a valid card number')).toBeVisible();
  });

  test('Negative test 2 — derived from page.tsx: invalid email format', async ({ page }) => {
    // Fill email with invalid format
    await utils.fillField('input[name="email"]', 'not-a-valid-email');
    
    // Trigger blur to initiate async email validation
    await page.locator('input[name="email"]').blur();
    
    // Assert the specific validation warning from handleEmailBlur in page.tsx
    await expect(page.locator('text=❌ Invalid email format')).toBeVisible();
    
    // Assert visual feedback: border-red-400 class is applied when emailValid is false
    await expect(page.locator('input[name="email"]')).toHaveClass(/border-red-400/);
  });
});
