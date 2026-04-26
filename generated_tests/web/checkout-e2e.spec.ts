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
    await utils.fillField('input[name="cardNumber"]', '4242 4242 4242 4242');
    await utils.fillField('input[name="expiry"]', '12/26');
    await utils.fillField('input[name="cvv"]', '123');
    await utils.fillField('input[name="amount"]', '50.00');

    await page.getByRole('button', { name: /Pay \$50.00|Complete Payment/ }).click();
    
    await expect(page.getByText('Payment processed successfully!')).toBeVisible();
  });

  test('Negative test 1 — derived from page.tsx', async ({ page }) => {
    // Fill an invalid card number to trigger Luhn validation error
    await utils.fillField('input[name="cardNumber"]', '4242 4242 4242 4241');
    await page.locator('input[name="cardNumber"]').blur();
    
    // Assert the inline validation message
    await expect(page.getByText('Invalid card number (Luhn check failed)')).toBeVisible();
    
    // Fill other required fields
    await utils.fillField('input[name="email"]', 'test@example.com');
    await utils.fillField('input[name="expiry"]', '12/26');
    await utils.fillField('input[name="cvv"]', '123');
    await utils.fillField('input[name="amount"]', '10.00');

    // Attempt to submit
    await page.getByRole('button', { name: /Pay \$10.00/ }).click();
    
    // Assert the form submission block message
    await expect(page.getByText('Please enter a valid card number')).toBeVisible();
  });

  test('Negative test 2 — derived from page.tsx', async ({ page }) => {
    // Fill email and blur to trigger the simulated 500 error from backend
    await utils.fillField('input[name="email"]', 'error@example.com');
    await page.locator('input[name="email"]').blur();
    
    // Assert the soft-fail warning message appears
    await expect(page.getByText('Email validation service temporarily unavailable')).toBeVisible();
    
    // Fill remaining fields to prove we can still proceed (soft-fail)
    await utils.fillField('input[name="cardNumber"]', '4242 4242 4242 4242');
    await utils.fillField('input[name="expiry"]', '12/26');
    await utils.fillField('input[name="cvv"]', '123');
    await utils.fillField('input[name="amount"]', '25.00');

    await page.getByRole('button', { name: /Pay \$25.00/ }).click();
    
    // Assert successful payment despite the email validation warning
    await expect(page.getByText('Payment processed successfully!')).toBeVisible();
  });
});
