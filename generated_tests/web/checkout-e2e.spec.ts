import { test, expect } from '@playwright/test';
import { TestUtils } from '../../utils/test-utils';

test.describe('Checkout Page E2E Tests', () => {
    let utils: TestUtils;

    test.beforeEach(async ({ page }) => {
        utils = new TestUtils(page);
        await page.goto('/');
        await utils.waitForPageLoad();
    });

    test('should load the checkout page successfully and display initial elements', async ({ page }) => {
        await expect(page).toHaveTitle(/Secure Checkout/i);
        await expect(page.locator('h2:has-text("Secure Checkout")')).toBeVisible();
        await expect(page.locator('button:has-text("Check Backend Status")')).toBeVisible();
        await expect(page.locator('input[name="email"]')).toBeVisible();
        await expect(page.locator('input[name="cardNumber"]')).toBeVisible();
        await expect(page.locator('input[name="expiry"]')).toBeVisible();
        await expect(page.locator('input[name="cvv"]')).toBeVisible();
        await expect(page.locator('input[name="amount"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toHaveText('Complete Payment');
    });

    test('should check backend status and display success message', async ({ page }) => {
        // Mock successful health check
        await utils.mockApiResponse('http://localhost:8080/api/health', { status: 'OK', message: 'Service is healthy' });

        await utils.clickElement('button:has-text("Check Backend Status")');
        await expect(page.locator('div[role="status"]')).toContainText('🟢 Backend Status: OK - Service is healthy');
    });

    test('should check backend status and display error message on failure', async ({ page }) => {
        // Mock failed health check
        await utils.mockApiResponse('http://localhost:8080/api/health', {}, 500);

        await utils.clickElement('button:has-text("Check Backend Status")');
        await expect(page.locator('div[role="status"]')).toContainText('🔴 Backend is not responding');
    });

    test('should display warning for invalid email format on blur', async ({ page }) => {
        await utils.fillField('input[name="email"]', 'invalid-email');
        await page.locator('input[name="email"]').blur();
        await expect(page.locator('p:has-text("❌ Invalid email format")')).toBeVisible();
    });

    test('should validate email successfully on blur', async ({ page }) => {
        await utils.mockApiResponse('http://localhost:8080/api/validate-email', { valid: true });
        await utils.fillField('input[name="email"]', 'test@example.com');
        await page.locator('input[name="email"]').blur();
        // Expect no warning message and a green border
        await expect(page.locator('p:has-text("❌ Invalid email format")')).not.toBeVisible();
        await expect(page.locator('input[name="email"]')).toHaveClass(/border-green-400/);
    });

    test('should handle soft-fail for email validation service unavailability', async ({ page }) => {
        await utils.mockApiResponse('http://localhost:8080/api/validate-email', {}, 500);
        await utils.fillField('input[name="email"]', 'test@example.com');
        await page.locator('input[name="email"]').blur();
        await expect(page.locator('p:has-text("⚠️ Email validation service temporarily unavailable.")')).toBeVisible();
        await expect(page.locator('input[name="email"]')).toHaveClass(/border-green-400/); // Still soft-fails as valid
    });

    test('should display error for invalid card number on blur', async ({ page }) => {
        await utils.mockApiResponse('http://localhost:8080/api/validate-card', { valid: false });
        await utils.fillField('input[name="cardNumber"]', '1111222233334444');
        await page.locator('input[name="cardNumber"]').blur();
        await expect(page.locator('p:has-text("❌ Invalid card number (Luhn check failed)")')).toBeVisible();
        await expect(page.locator('input[name="cardNumber"]')).toHaveClass(/border-red-400/);
    });

    test('should display success for valid card number on blur', async ({ page }) => {
        await utils.mockApiResponse('http://localhost:8080/api/validate-card', { valid: true });
        await utils.fillField('input[name="cardNumber"]', '4111111111111111');
        await page.locator('input[name="cardNumber"]').blur();
        await expect(page.locator('p:has-text("✅ Valid card number (Luhn check passed)")')).toBeVisible();
        await expect(page.locator('input[name="cardNumber"]')).toHaveClass(/border-green-400/);
    });

    test('should format card number with spaces', async ({ page }) => {
        await utils.fillField('input[name="cardNumber"]', '1234567890123456');
        await expect(page.locator('input[name="cardNumber"]')).toHaveValue('1234 5678 9012 3456');
    });

    test('should format expiry date with slash', async ({ page }) => {
        await utils.fillField('input[name="expiry"]', '1225');
        await expect(page.locator('input[name="expiry"]')).toHaveValue('12/25');
    });

    test('should update payment button text with amount', async ({ page }) => {
        await utils.fillField('input[name="amount"]', '123.45');
        await expect(page.locator('button[type="submit"]')).toHaveText('Pay $123.45');
    });

    test('should complete payment successfully', async ({ page }) => {
        await utils.mockApiResponse('http://localhost:8080/api/validate-email', { valid: true });
        await utils.mockApiResponse('http://localhost:8080/api/validate-card', { valid: true });
        await utils.mockApiResponse('http://localhost:8080/api/checkout', { message: 'Payment successful!' });

        await utils.fillField('input[name="email"]', 'test@example.com');
        await page.locator('input[name="email"]').blur(); // Trigger email validation
        await utils.fillField('input[name="cardNumber"]', '4111111111111111');
        await page.locator('input[name="cardNumber"]').blur(); // Trigger card validation
        await utils.fillField('input[name="expiry"]', '1225');
        await utils.fillField('input[name="cvv"]', '123');
        await utils.fillField('input[name="amount"]', '50.00');

        await utils.clickElement('button[type="submit"]');
        await expect(page.locator('div[role="status"]')).toContainText('✅ Payment successful!');
    });

    test('should prevent payment with previously invalidated card number', async ({ page }) => {
        await utils.mockApiResponse('http://localhost:8080/api/validate-email', { valid: true });
        await utils.mockApiResponse('http://localhost:8080/api/validate-card', { valid: false }); // Invalid card
        // No mock for /api/checkout, as it should not be called

        await utils.fillField('input[name="email"]', 'test@example.com');
        await page.locator('input[name="email"]').blur();
        await utils.fillField('input[name="cardNumber"]', '1111222233334444');
        await page.locator('input[name="cardNumber"]').blur();
        await utils.fillField('input[name="expiry"]', '1225');
        await utils.fillField('input[name="cvv"]', '123');
        await utils.fillField('input[name="amount"]', '50.00');

        await utils.clickElement('button[type="submit"]');
        await expect(page.locator('div[role="status"]')).toContainText('❌ Please enter a valid card number');
        // Verify that /api/checkout was NOT called (no successful mock was provided for it)
    });

    test('should display error message on backend checkout failure', async ({ page }) => {
        await utils.mockApiResponse('http://localhost:8080/api/validate-email', { valid: true });
        await utils.mockApiResponse('http://localhost:8080/api/validate-card', { valid: true });
        await utils.mockApiResponse('http://localhost:8080/api/checkout', { error: 'Insufficient funds' }, 400); // Simulate backend error

        await utils.fillField('input[name="email"]', 'test@example.com');
        await page.locator('input[name="email"]').blur();
        await utils.fillField('input[name="cardNumber"]', '4111111111111111');
        await page.locator('input[name="cardNumber"]').blur();
        await utils.fillField('input[name="expiry"]', '1225');
        await utils.fillField('input[name="cvv"]', '123');
        await utils.fillField('input[name="amount"]', '50.00');

        await utils.clickElement('button[type="submit"]');
        await expect(page.locator('div[role="status"]')).toContainText('❌ Payment failed: Insufficient funds');
    });

    test('should display error message on network failure during checkout', async ({ page }) => {
        await utils.mockApiResponse('http://localhost:8080/api/validate-email', { valid: true });
        await utils.mockApiResponse('http://localhost:8080/api/validate-card', { valid: true });
        // Do not mock /api/checkout to simulate network failure

        await utils.fillField('input[name="email"]', 'test@example.com');
        await page.locator('input[name="email"]').blur();
        await utils.fillField('input[name="cardNumber"]', '4111111111111111');
        await page.locator('input[name="cardNumber"]').blur();
        await utils.fillField('input[name="expiry"]', '1225');
        await utils.fillField('input[name="cvv"]', '123');
        await utils.fillField('input[name="amount"]', '50.00');

        await utils.clickElement('button[type="submit"]');
        await expect(page.locator('div[role="status"]')).toContainText('❌ Failed to connect to backend server');
    });
});
