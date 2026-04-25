import { test, expect } from '@playwright/test';

test.describe('Checkout Flow E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('h2:has-text("Secure Checkout")')).toBeVisible();
    });

    test('should successfully complete a checkout with valid details (Happy Path)', async ({ page }) => {
        // Fill email and wait for validation
        await page.locator('[name="email"]').fill('test@example.com');
        await page.locator('[name="email"]').blur();
        await page.waitForResponse(response => response.url().includes('/api/validate-email') && response.status() === 200);
        await expect(page.locator('p:has-text("Invalid email format")')).not.toBeVisible();

        // Fill card number and wait for validation
        await page.locator('[name="cardNumber"]').fill('1234123412341234');
        await page.locator('[name="cardNumber"]').blur();
        await page.waitForResponse(response => response.url().includes('/api/validate-card') && response.status() === 200);
        await expect(page.locator('p:has-text("Invalid card number")')).not.toBeVisible();

        // Fill expiry, CVV, and amount
        await page.locator('[name="expiry"]').fill('12/26');
        await page.locator('[name="cvv"]').fill('123');
        await page.locator('[name="amount"]').fill('100.00');

        // Submit the form and wait for checkout API response
        await expect(page.locator('[type="submit"]')).not.toBeDisabled();
        await page.locator('[type="submit"]').click();
        const checkoutResponse = await page.waitForResponse(response => response.url().includes('/api/checkout') && response.status() === 200);
        const checkoutData = await checkoutResponse.json();

        // Assert success message and schema
        expect(page.locator('text=Payment failed')).not.toBeVisible();
        await expect(page.locator('text="Payment successful"')).toBeVisible();
        expect(checkoutData).toHaveProperty('status', 'success');
        expect(checkoutData).toHaveProperty('message');
        expect(typeof checkoutData.message).toBe('string');
    });

    test('should display error for invalid card number input (Critical Validation Error)', async ({ page }) => {
        // Fill email with a valid one (to ensure card validation is the focus)
        await page.locator('[name="email"]').fill('test@example.com');
        await page.locator('[name="email"]').blur();
        await page.waitForResponse(response => response.url().includes('/api/validate-email') && response.status() === 200);

        // Fill an invalid card number and wait for validation
        await page.locator('[name="cardNumber"]').fill('1111111111111111'); // Invalid Luhn
        await page.locator('[name="cardNumber"]').blur();
        await page.waitForResponse(response => response.url().includes('/api/validate-card') && response.status() === 200);

        // Assert validation error message
        await expect(page.locator('p:has-text("Invalid card number (Luhn check failed)")')).toBeVisible();
        // Ensure submit button is disabled
        await expect(page.locator('[type="submit"]')).toBeDisabled();
    });

    test('should handle network failure during email validation (Network Failure Scenario)', async ({ page }) => {
        // Intercept email validation API and force a network error
        await page.route('**/api/validate-email', route => {
            route.abort('failed');
        });

        // Fill email and trigger blur
        await page.locator('[name="email"]').fill('networkfail@example.com');
        await page.locator('[name="email"]').blur();

        // Wait for the route abort to register
        await page.waitForTimeout(500); // Small timeout to allow the abort to be processed

        // Assert soft-fail warning message
        await expect(page.locator('p:has-text("Email validation service temporarily unavailable")')).toBeVisible();
        await expect(page.locator('p:has-text("Could not validate email")')).toBeVisible();
        // The submit button should not be disabled due to email soft fail
        await expect(page.locator('[type="submit"]')).not.toBeDisabled();
    });
});
