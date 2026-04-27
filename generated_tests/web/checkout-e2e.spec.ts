import { test, expect } from '@playwright/test';
import { TestUtils } from '../../utils/test-utils';

test.describe('Checkout Flow', () => {
  test('Happy path — fill all fields and submit, assert success', async ({ page }) => {
    const utils = new TestUtils(page);
    await page.goto('/');

    await utils.fillField('input[name="email"]', 'valid@example.com');
    await page.locator('input[name="email"]').blur();

    await utils.fillField('input[name="cardNumber"]', '4242424242424242');
    await expect(page.locator('input[name="cardNumber"]')).toHaveValue('4242 4242 4242 4242');
    await page.locator('input[name="cardNumber"]').blur();
    await expect(page.getByText('Valid card number')).toBeVisible();

    await utils.fillField('input[name="expiry"]', '1226');
    await expect(page.locator('input[name="expiry"]')).toHaveValue('12/26');

    await utils.fillField('input[name="cvv"]', '123');
    await utils.fillField('input[name="amount"]', '100.50');

    await utils.clickElement('button[type="submit"]');
    await expect(page.getByText('Payment processed successfully!')).toBeVisible();
  });

  test('Negative test 1 — Invalid card number blocks submission', async ({ page }) => {
    const utils = new TestUtils(page);
    await page.goto('/');

    await utils.fillField('input[name="email"]', 'test@example.com');
    
    // Using an invalid Luhn number
    await utils.fillField('input[name="cardNumber"]', '1111111111111111');
    await page.locator('input[name="cardNumber"]').blur();
    await expect(page.getByText('Invalid card number (Luhn check failed)')).toBeVisible();

    await utils.fillField('input[name="expiry"]', '12/25');
    await utils.fillField('input[name="cvv"]', '123');
    await utils.fillField('input[name="amount"]', '10.00');

    await utils.clickElement('button[type="submit"]');
    await expect(page.getByText('Please enter a valid card number')).toBeVisible();
  });

  test('Negative test 2 — Email validation soft-fail allows proceeding', async ({ page }) => {
    const utils = new TestUtils(page);
    await page.goto('/');

    // Backend for email validation always returns 500
    await utils.fillField('input[name="email"]', 'any@email.com');
    await page.locator('input[name="email"]').blur();
    
    await expect(page.getByText('Email validation service temporarily unavailable')).toBeVisible();

    await utils.fillField('input[name="cardNumber"]', '4242424242424242');
    await page.locator('input[name="cardNumber"]').blur();
    
    await utils.fillField('input[name="expiry"]', '11/24');
    await utils.fillField('input[name="cvv"]', '999');
    await utils.fillField('input[name="amount"]', '5.25');

    await utils.clickElement('button[type="submit"]');
    await expect(page.getByText('Payment processed successfully!')).toBeVisible();
  });
});
