import { test, expect } from '@playwright/test';

test.describe('Checkout Flow E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should successfully complete checkout with valid details (Happy Path)', async ({ page }) => {
        // Fill email and trigger validation
        await page.locator('[name="email"]').fill('test@example.com');
        const emailResponsePromise = page.waitForResponse(response =>
            response.url().includes('/api/validate-email') && response.request().method() === 'POST'
        );
        await page.locator('[name="email"]').blur();
        const emailResponse = await emailResponsePromise;
        expect(emailResponse.ok()).toBeTruthy();
        expect(await emailResponse.json()).toEqual({ valid: true, message: 'Email is valid' });
        await expect(page.locator('p:has-text("Valid email format")')).not.toBeVisible();

        // Fill card number and trigger validation
        await page.locator('[name="cardNumber"]').fill('4111111111111111');
        const cardResponsePromise = page.waitForResponse(response =>
            response.url().includes('/api/validate-card') && response.request().method() === 'POST'
        );
        await page.locator('[name="cardNumber"]').blur();
        const cardResponse = await cardResponsePromise;
        expect(cardResponse.ok()).toBeTruthy();
        expect(await cardResponse.json()).toEqual({ valid: true, message: 'Card is valid' });
        await expect(page.locator('p:has-text("Valid card number (Luhn check passed)")')).toBeVisible();

        // Fill other details
        await page.locator('[name="expiry"]').fill('12/26');
        await page.locator('[name="cvv"]').fill('123');
        await page.locator('[name="amount"]').fill('100.00');

        // Submit the form
        await expect(page.locator('[type="submit"]')).toBeEnabled();
        const checkoutResponsePromise = page.waitForResponse(response =>
            response.url().includes('/api/checkout') && response.request().method() === 'POST'
        );
        await page.locator('[type="submit"]').click();
        const checkoutResponse = await checkoutResponsePromise;
        expect(checkoutResponse.ok()).toBeTruthy();
        const checkoutData = await checkoutResponse.json();
        expect(checkoutData).toHaveProperty('status', 'success');
        expect(page.locator('div:has-text("✅ Payment successful")')).toBeVisible();
    });

    test('should show validation error for invalid card number', async ({ page }) => {
        // Fill email and trigger validation
        await page.locator('[name="email"]').fill('test@example.com');
        const emailResponsePromise = page.waitForResponse(response =>
            response.url().includes('/api/validate-email') && response.request().method() === 'POST'
        );
        await page.locator('[name="email"]').blur();
        await emailResponsePromise;

        // Fill an invalid card number and trigger validation (Luhn check will fail)
        await page.locator('[name="cardNumber"]').fill('1111111111111111'); // Invalid card number
        const cardResponsePromise = page.waitForResponse(response =>
            response.url().includes('/api/validate-card') && response.request().method() === 'POST'
        );
        await page.locator('[name="cardNumber"]').blur();
        const cardResponse = await cardResponsePromise;
        expect(cardResponse.ok()).toBeTruthy();
        expect(await cardResponse.json()).toEqual({ valid: false, message: 'Card is invalid' });
        await expect(page.locator('p:has-text("Invalid card number (Luhn check failed)")')).toBeVisible();

        // Ensure submit button is disabled
        await expect(page.locator('[type="submit"]')).toBeDisabled();
        
        // Try to click submit, verify no checkout attempt
        await page.locator('[type="submit"]').click({ timeout: 100, force: true }).catch(() => {}); // Attempt click, but expect it to be ignored

        // Fill other details (they won't enable the button if card is invalid)
        await page.locator('[name="expiry"]').fill('12/26');
        await page.locator('[name="cvv"]').fill('123');
        await page.locator('[name="amount"]').fill('100.00');

        // The submit button should still be disabled because of the invalid card
        await expect(page.locator('[type="submit"]')).toBeDisabled();
        await expect(page.locator('div:has-text("❌ Please enter a valid card number")')).toBeVisible();
    });

    test('should handle network failure for email validation gracefully (Soft Fail)', async ({ page }) => {
        // Mock API for email validation to simulate network error/500
        await page.route('**/api/validate-email', async route => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ status: 'error', message: 'Internal Server Error' }),
            });
        });

        // Fill email and trigger validation
        await page.locator('[name="email"]').fill('networkfail@example.com');
        const emailResponsePromise = page.waitForResponse(response =>
            response.url().includes('/api/validate-email') && response.request().method() === 'POST'
        );
        await page.locator('[name="email"]').blur();
        const emailResponse = await emailResponsePromise;
        expect(emailResponse.status()).toBe(500);
        await expect(page.locator('p:has-text("Email validation service temporarily unavailable. You can still proceed.")')).toBeVisible();
        
        // Fill valid card details and trigger validation
        await page.locator('[name="cardNumber"]').fill('4111111111111111');
        const cardResponsePromise = page.waitForResponse(response =>
            response.url().includes('/api/validate-card') && response.request().method() === 'POST'
        );
        await page.locator('[name="cardNumber"]').blur();
        const cardResponse = await cardResponsePromise;
        expect(cardResponse.ok()).toBeTruthy();
        expect(await cardResponse.json()).toEqual({ valid: true, message: 'Card is valid' });
        await expect(page.locator('p:has-text("Valid card number (Luhn check passed)")')).toBeVisible();

        // Fill other details
        await page.locator('[name="expiry"]').fill('12/26');
        await page.locator('[name="cvv"]').fill('123');
        await page.locator('[name="amount"]').fill('100.00');

        // Submit the form - should still be able to proceed due to soft-fail
        await expect(page.locator('[type="submit"]')).toBeEnabled();
        const checkoutResponsePromise = page.waitForResponse(response =>
            response.url().includes('/api/checkout') && response.request().method() === 'POST'
        );
        await page.locator('[type="submit"]').click();
        const checkoutResponse = await checkoutResponsePromise;
        expect(checkoutResponse.ok()).toBeTruthy();
        const checkoutData = await checkoutResponse.json();
        expect(checkoutData).toHaveProperty('status', 'success');
        expect(page.locator('div:has-text("✅ Payment successful")')).toBeVisible();
    });
});
