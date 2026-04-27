import { test, expect } from '@playwright/test';
import { TestUtils } from '../../utils/test-utils';

test.describe('Checkout E2E Tests', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await page.goto('/');
  });

  test('Happy path — fill all fields and submit, assert success', async ({ page }) => {
    await utils.fillField('input[name="email"]', 'tester@example.com');
    await utils.fillField('input[name="cardNumber"]', '4242 4242 4242 4242');
    await utils.fillField('input[name="expiry"]', '12/25');
    await utils.fillField('input[name="cvv"]', '123');
    await utils.fillField('input[name="amount"]', '50.00');

    await utils.clickElement('button[type="submit"]');
    await expect(page.getByText('Payment processed successfully!')).toBeVisible();
  });

  test('Negative test 1 — invalid card number luhn check failure', async ({ page }) => {
    await utils.fillField('input[name="cardNumber"]', '4242 4242 4242 4241');
    await page.locator('input[name="cardNumber"]').blur();

    await expect(page.getByText('Luhn check failed')).toBeVisible();
    
    await utils.fillField('input[name="email"]', 'test@example.com');
    await utils.fillField('input[name="expiry"]', '12/25');
    await utils.fillField('input[name="cvv"]', '123');
    await utils.fillField('input[name="amount"]', '50.00');

    await utils.clickElement('button[type="submit"]');
    await expect(page.getByText('Please enter a valid card number')).toBeVisible();
  });

  test('Negative test 2 — email validation soft-fail allows checkout', async ({ page }) => {
    await utils.fillField('input[name="email"]', 'user@example.com');
    await page.locator('input[name="email"]').blur();

    await expect(page.getByText('validation service temporarily unavailable')).toBeVisible();

    await utils.fillField('input[name="cardNumber"]', '4242 4242 4242 4242');
    await utils.fillField('input[name="expiry"]', '12/25');
    await utils.fillField('input[name="cvv"]', '123');
    await utils.fillField('input[name="amount"]', '25.00');

    await utils.clickElement('button[type="submit"]');
    await expect(page.getByText('Payment processed successfully!')).toBeVisible();
  });
});
