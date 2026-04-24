import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test('SCENARIO 1 — Happy path checkout', async ({ page }) => {
    await page.goto('/');

    await page.locator('[name="email"]').fill('test@example.com');
    const emailValidation = page.waitForResponse(resp => 
      resp.url().includes('/api/validate-email') && resp.request().method() === 'POST'
    );
    await page.locator('text=Secure Checkout').click();
    await emailValidation;

    await page.locator('[name="cardNumber"]').fill('4242 4242 4242 4242');
    const cardValidation = page.waitForResponse(resp => 
      resp.url().includes('/api/validate-card') && resp.request().method() === 'POST'
    );
    await page.locator('text=Secure Checkout').click();
    await cardValidation;

    await page.locator('[name="expiry"]').fill('12/26');
    await page.locator('[name="cvv"]').fill('123');
    await page.locator('[name="amount"]').fill('50');

    const checkoutResponse = page.waitForResponse(resp => 
      resp.url().includes('/api/checkout') && resp.request().method() === 'POST'
    );
    await page.locator('[type="submit"]').click();
    await checkoutResponse;

    await expect(page.locator('body')).toContainText('Payment processed successfully');
  });

  test('SCENARIO 2 — Invalid card number (Luhn check fails)', async ({ page }) => {
    await page.goto('/');

    await page.locator('[name="cardNumber"]').fill('1234 5678 9012 3456');
    const cardValidation = page.waitForResponse(resp => 
      resp.url().includes('/api/validate-card') && resp.request().method() === 'POST'
    );
    await page.locator('text=Secure Checkout').click();
    await cardValidation;

    const body = page.locator('body');
    await expect(body).toContainText(/Invalid card number|Luhn check failed/);
  });

  test('SCENARIO 3 — Email soft-fail (API returns 500)', async ({ page }) => {
    await page.route('**/api/validate-email', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.goto('/');

    await page.locator('[name="email"]').fill('test@example.com');
    const emailValidation = page.waitForResponse(resp => 
      resp.url().includes('/api/validate-email') && resp.status() === 500
    );
    await page.locator('text=Secure Checkout').click();
    await emailValidation;

    const body = page.locator('body');
    await expect(body).toContainText(/unavailable|can still proceed/);
    await expect(page.locator('[type="submit"]')).toBeEnabled();
  });
});
