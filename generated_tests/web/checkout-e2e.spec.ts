import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Checkout Flow E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the checkout page
        await page.goto('/');
    });

    test('Happy path - successful checkout', async ({ page }) => {
        // Fill Email and wait for async validation blur
        const emailInput = page.locator('[name="email"]');
        await emailInput.fill('customer@example.com');
        
        const emailValidationPromise = page.waitForResponse(response => 
            response.url().includes('/api/validate-email')
        );
        await emailInput.blur();
        await emailValidationPromise;

        // Fill Card Number and wait for async validation (Luhn check) blur
        const cardInput = page.locator('[name="cardNumber"]');
        await cardInput.fill('4111 1111 1111 1111');
        
        const cardValidationPromise = page.waitForResponse(response => 
            response.url().includes('/api/validate-card')
        );
        await cardInput.blur();
        const cardResponse = await cardValidationPromise;
        const cardResult = await cardResponse.json();
        expect(cardResult.valid).toBe(true);

        // Verify valid card message
        await expect(page.locator('text=✅ Valid card number')).toBeVisible();

        // Fill remaining fields
        await page.fill('[name="expiry"]', '12/28');
        await page.fill('[name="cvv"]', '123');
        await page.fill('[name="amount"]', '50.00');

        // Submit form and wait for checkout response
        const checkoutPromise = page.waitForResponse(response => 
            response.url().includes('/api/checkout') && response.status() === 200
        );
        await page.click('[type="submit"]');
        const checkoutResponse = await checkoutPromise;
        const checkoutResult = await checkoutResponse.json();
        
        // Schema-aware assertion based on swagger
        expect(checkoutResult.status).toBe('success');
        expect(checkoutResult.message).toBeDefined();

        // Verify success message in UI
        await expect(page.locator('text=✅')).toBeVisible();
    });

    test('Critical validation error - invalid card number', async ({ page }) => {
        // Fill Email first
        const emailInput = page.locator('[name="email"]');
        await emailInput.fill('tester@example.com');
        const emailVal = page.waitForResponse(res => res.url().includes('/api/validate-email'));
        await emailInput.blur();
        await emailVal;

        // Fill Invalid Card Number (Fails Luhn)
        const cardInput = page.locator('[name="cardNumber"]');
        await cardInput.fill('1234 5678 1234 5678');
        
        const cardValidationPromise = page.waitForResponse(response => 
            response.url().includes('/api/validate-card')
        );
        await cardInput.blur();
        const response = await cardValidationPromise;
        const body = await response.json();
        
        // Assert based on API response
        expect(body.valid).toBe(false);

        // Verify UI error message and button state
        await expect(page.locator('text=❌ Invalid card number')).toBeVisible();
        await expect(page.locator('[type="submit"]')).toBeDisabled();
    });

    test('Network failure scenario - checkout connection error', async ({ page }) => {
        // Intercept checkout request and simulate a network failure
        await page.route('**/api/checkout', route => route.abort('failed'));

        // Fill all fields correctly
        await page.fill('[name="email"]', 'user@example.com');
        const emailVal = page.waitForResponse(res => res.url().includes('/api/validate-email'));
        await page.locator('[name="email"]').blur();
        await emailVal;

        await page.fill('[name="cardNumber"]', '4111 1111 1111 1111');
        const cardVal = page.waitForResponse(res => res.url().includes('/api/validate-card'));
        await page.locator('[name="cardNumber"]').blur();
        await cardVal;

        await page.fill('[name="expiry"]', '12/28');
        await page.fill('[name="cvv"]', '123');
        await page.fill('[name="amount"]', '75.00');

        // Submit and verify that the application handles the connection failure gracefully
        await page.click('[type="submit"]');
        
        // The catch block in page.tsx displays a specific message for connection errors
        await expect(page.locator('text=❌ Failed to connect to backend server')).toBeVisible();
    });
});
