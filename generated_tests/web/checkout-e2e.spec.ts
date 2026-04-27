import { test, expect } from '@playwright/test';
  import { TestUtils } from '../../utils/test-utils';

test('Happy path — fill all fields and submit', async ({ page }) => {
  const utils = new TestUtils(page);
  await page.goto('/');

  await utils.fillField('input[name="email"]', 'test@example.com');
  await page.keyboard.press('Tab');

  await utils.fillField('input[name="cardNumber"]', '4242 4242 4242 4242');
  await page.keyboard.press('Tab');

  await utils.fillField('input[name="expiry"]', '12/26');
  await utils.fillField('input[name="cvv"]', '123');
  await utils.fillField('input[name="amount"]', '50.00');

  await page.getByRole('button', { name: 'Pay $50.00' }).click();

  await expect(page.getByText('Payment processed successfully!')).toBeVisible();
});

test('Negative test 1 — Email validation soft-fail', async ({ page }) => {
  const utils = new TestUtils(page);
  await page.goto('/');

  await utils.fillField('input[name="email"]', 'test@example.com');
  await page.keyboard.press('Tab');

  await expect(page.getByText('Email validation service temporarily unavailable')).toBeVisible();
});

test('Negative test 2 — Invalid Luhn card number blocks submission', async ({ page }) => {
  const utils = new TestUtils(page);
  await page.goto('/');

  await utils.fillField('input[name="cardNumber"]', '4242 4242 4242 4241');
  await page.keyboard.press('Tab');

  await expect(page.getByText('Invalid card number (Luhn check failed)')).toBeVisible();

  await utils.fillField('input[name="email"]', 'test@example.com');
  await utils.fillField('input[name="expiry"]', '12/26');
  await utils.fillField('input[name="cvv"]', '123');
  await utils.fillField('input[name="amount"]', '10.00');

  await page.getByRole('button', { name: 'Pay $10.00' }).click();

  await expect(page.getByText('Please enter a valid card number')).toBeVisible();
});