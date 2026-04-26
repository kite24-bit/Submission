import { test, expect } from '@playwright/test';
import { TestUtils } from '../../utils/test-utils';

test.describe('Checkout Page E2E Tests', () => {
  let testUtils: TestUtils;

  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);
    await page.goto('/');
    await testUtils.waitForPageLoad();
  });

  // 1. Happy path — fill all fields and submit, assert success.
  test('should complete a successful payment on happy path', async ({ page }) => {
    // Mock successful API response for checkout
    await testUtils.mockApiResponse('/api/checkout', { message: 'Payment successful!' }, 200);
    await testUtils.mockApiResponse('/api/validate-email', { valid: true }, 200);
    await testUtils.mockApiResponse('/api/validate-card', { valid: true }, 200);

    await testUtils.fillField('input[name="email"]', 'test@example.com');
    await page.locator('input[name="email"]').blur(); // Trigger validation
    await page.waitForTimeout(500); // Wait for potential validation to complete

    await testUtils.fillField('input[name="cardNumber"]', '4111 1111 1111 1111'); // Formatted card number
    await page.locator('input[name="cardNumber"]').blur(); // Trigger validation
    await page.waitForTimeout(500); // Wait for potential validation to complete

    await testUtils.fillField('input[name="expiry"]', '12/25'); // Formatted expiry
    await testUtils.fillField('input[name="cvv"]', '123');
    await testUtils.fillField('input[name="amount"]', '100.00');

    await page.getByRole('button', { name: 'Pay $100.00' }).click();

    await expect(page.getByText('✅ Payment successful!')).toBeVisible();
  });

  // 2. Negative test 1 — invalid card number
  test('should show error for invalid card number and prevent submission', async ({ page }) => {
    await testUtils.mockApiResponse('/api/validate-email', { valid: true }, 200);
    await testUtils.mockApiResponse('/api/validate-card', { valid: false }, 200); // Mock invalid card

    await testUtils.fillField('input[name="email"]', 'test@example.com');
    await page.locator('input[name="email"]').blur();
    await page.waitForTimeout(500);

    await testUtils.fillField('input[name="cardNumber"]', '4111 1111 1111 1110'); // Invalid Luhn
    await page.locator('input[name="cardNumber"]').blur();
    await page.waitForTimeout(500); // Wait for card validation message

    await expect(page.getByText('❌ Invalid card number (Luhn check failed)')).toBeVisible();

    await testUtils.fillField('input[name="expiry"]', '12/25');
    await testUtils.fillField('input[name="cvv"]', '123');
    await testUtils.fillField('input[name="amount"]', '50.00');

    await page.getByRole('button', { name: 'Pay $50.00' }).click();

    await expect(page.getByText('❌ Please enter a valid card number')).toBeVisible();
  });

  // 3. Negative test 2 — Email validation soft-fail but backend payment fails
  test('should soft-fail email validation but payment fails from backend', async ({ page }) => {
    // Mock email validation service down (soft-fail, status 500)
    await testUtils.mockApiResponse('/api/validate-email', { valid: true }, 500);
    await testUtils.mockApiResponse('/api/validate-card', { valid: true }, 200);
    // Mock payment failure with an error message
    await testUtils.mockApiResponse('/api/checkout', { error: 'Insufficient funds' }, 400); 

    await testUtils.fillField('input[name="email"]', 'softfail@example.com');
    await page.locator('input[name="email"]').blur();
    await page.waitForTimeout(1000); // Give time for the warning to appear

    await expect(page.getByText('⚠️ Email validation service temporarily unavailable. You can still proceed.')).toBeVisible();

    await testUtils.fillField('input[name="cardNumber"]', '4111 1111 1111 1111');
    await page.locator('input[name="cardNumber"]').blur();
    await page.waitForTimeout(500);

    await testUtils.fillField('input[name="expiry"]', '12/25');
    await testUtils.fillField('input[name="cvv"]', '123');
    await testUtils.fillField('input[name="amount"]', '75.00');

    await page.getByRole('button', { name: 'Pay $75.00' }).click();

    await expect(page.getByText('❌ Payment failed: Insufficient funds')).toBeVisible();
  });
});