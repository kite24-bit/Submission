import { test, expect } from '@playwright/test';
import { TestUtils } from '../../utils/test-utils';

test.describe('Checkout Page E2E Tests', () => {
    let testUtils: TestUtils;

    test.beforeEach(async ({ page }) => {
        testUtils = new TestUtils(page);
        await page.goto('/');
        await testUtils.waitForPageLoad();
    });

    test('1. Happy path - fill all fields and submit, assert success', async ({ page }) => {
        // Fill form fields
        await page.locator('input[name="email"]').fill('test.user@example.com');
        await page.locator('input[name="cardNumber"]').fill('4111 1111 1111 1111');
        await page.locator('input[name="expiry"]').fill('12/25');
        await page.locator('input[name="cvv"]').fill('123');
        await page.locator('input[name="amount"]').fill('100.00');

        // Wait for email and card validation to complete on blur
        await page.locator('input[name="email"]').blur();
        await page.locator('input[name="cardNumber"]').blur();

        await expect(page.locator('span:has-text("Validating...")')).toHaveCount(0); // Ensure no validating messages are present

        // Intercept checkout API call and mock a successful response
        await page.route('http://localhost:8080/api/checkout', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Payment processed successfully!' }),
            });
        });

        // Click submit button
        await page.locator('button[type="submit"]').click();

        // Assert processing payment message
        await expect(page.locator('button[type="submit"]:has-text("Processing Payment...")')).toBeVisible();

        // Wait for the success message after form submission
        await expect(page.locator('div[class*="rounded-xl mb-6"]')).toContainText('✅ Payment processed successfully!');
    });

    test('2. Negative test - invalid card number blocks submission', async ({ page }) => {
        // Fill form fields with an invalid card number
        await page.locator('input[name="email"]').fill('test.user@example.com');
        await page.locator('input[name="cardNumber"]').fill('4111 1111 1111 1110'); // Invalid Luhn
        await page.locator('input[name="expiry"]').fill('12/25');
        await page.locator('input[name="cvv"]').fill('123');
        await page.locator('input[name="amount"]').fill('50.00');

        // Trigger card validation on blur
        await page.locator('input[name="cardNumber"]').blur();
        await expect(page.locator('span:has-text("Validating...")')).toHaveCount(0); // Ensure no validating messages are present

        // Wait for card validation message to appear
        await expect(page.locator('p:has-text("❌ Invalid card number (Luhn check failed)")')).toBeVisible();

        // Attempt to submit the form
        await page.locator('button[type="submit"]').click();

        // Assert that submission is blocked with an error message
        await expect(page.locator('div[class*="rounded-xl mb-6"]')).toContainText('❌ Please enter a valid card number');
        // Ensure "Processing Payment..." is not visible
        await expect(page.locator('button[type="submit"]:has-text("Processing Payment...")')).not.toBeVisible();
    });

    test('3. Negative test - email validation service unavailable (soft-fail)', async ({ page }) => {
        // Intercept email validation API call and mock a 500 error
        await page.route('http://localhost:8080/api/validate-email', async route => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Internal Server Error' }),
            });
        });

        // Fill email field to trigger validation on blur
        await page.locator('input[name="email"]').fill('test.user@example.com');
        await page.locator('input[name="email"]').blur();

        // Assert that the soft-fail warning is visible
        await expect(page.locator('p:has-text("⚠️ Email validation service temporarily unavailable. You can still proceed.")')).toBeVisible();

        // Continue filling other fields and submit
        await page.locator('input[name="cardNumber"]').fill('4111 1111 1111 1111');
        await page.locator('input[name="expiry"]').fill('12/25');
        await page.locator('input[name="cvv"]').fill('123');
        await page.locator('input[name="amount"]').fill('75.00');

        await page.locator('input[name="cardNumber"]').blur();
        await expect(page.locator('p:has-text("✅ Valid card number (Luhn check passed)")')).toBeVisible();

        // Intercept checkout API call and mock a successful response
        await page.route('http://localhost:8080/api/checkout', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Payment processed successfully!' }),
            });
        });

        // Click submit button
        await page.locator('button[type="submit"]').click();

        // Assert processing payment message
        await expect(page.locator('button[type="submit"]:has-text("Processing Payment...")')).toBeVisible();

        // Assert that the payment still goes through despite the email warning
        await expect(page.locator('div[class*="rounded-xl mb-6"]')).toContainText('✅ Payment processed successfully!');
    });
});
