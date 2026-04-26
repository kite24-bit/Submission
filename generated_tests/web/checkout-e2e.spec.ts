import { test, expect } from '@playwright/test';
import { TestUtils } from '../../utils/test-utils';

test.describe('Checkout Flow', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await page.goto('/');
  });

  test('Happy path — fill all fields and submit, assert success', async ({ page }) => {
    await utils.fillField('input[name="email"]', 'valid@example.com');
    
    await utils.fillField('input[name="cardNumber"]', '4111 1111 1111 1111');
    const cardValidation = page.waitForResponse(resp => resp.url().includes('/api/validate-card'));
    await page.locator('input[name="cardNumber"]').blur();
    await cardValidation;

    await utils.fillField('input[name="expiry"]', '12/26');
    await utils.fillField('input[name="cvv"]', '123');
    await utils.fillField('input[name="amount"]', '99.99');

    const checkoutResponse = page.waitForResponse(resp => resp.url().includes('/api/checkout'));
    await page.click('button[type="submit"]');
    await checkoutResponse;

    await expect(page.locator('div:has-text("✅")')).toBeVisible();
  });

  test('Negative test 1 — Invalid card number blocks submission', async ({ page }) => {
    await utils.fillField('input[name="cardNumber"]', '1234 5678 9012 3452');
    
    const cardValidation = page.waitForResponse(resp => resp.url().includes('/api/validate-card'));
    await page.locator('input[name="cardNumber"]').blur();
    await cardValidation;

    await expect(page.locator('text=❌ Invalid card number (Luhn check failed)')).toBeVisible();

    await utils.fillField('input[name="email"]', 'test@example.com');
    await utils.fillField('input[name="expiry"]', '12/26');
    await utils.fillField('input[name="cvv"]', '123');
    await utils.fillField('input[name="amount"]', '10.00');

    await page.click('button[type="submit"]');
    await expect(page.locator('text=❌ Please enter a valid card number')).toBeVisible();
  });

  test('Negative test 2 — Invalid email format validation', async ({ page }) => {
    await utils.fillField('input[name="email"]', 'invalid-email-format');
    
    const emailValidation = page.waitForResponse(resp => resp.url().includes('/api/validate-email'));
    await page.locator('input[name="email"]').blur();
    await emailValidation;

    await expect(page.locator('text=❌ Invalid email format')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toHaveClass(/border-red-400/);
  });
});
