import { test, expect } from '@playwright/test';
import { TestUtils } from '../../playwright_template/utils/test-utils';

test.describe('Checkout E2E Scenarios', () => {
    let testUtils: TestUtils;

    test.beforeEach(async ({ page }) => {
        testUtils = new TestUtils(page);
        await page.goto('/');
        await testUtils.waitForPageLoad();
    });

    test('should successfully complete a checkout with valid details', async ({ page }) => {
        const testData = testUtils.generateTestData();
        const validCardNumber = '4242 4242 4242 4242'; // A common test card number that passes Luhn
        const validExpiry = '12/25';
        const validCvv = '123';
        const validAmount = '100.00';

        // Fill email and await validation
        await page.locator('[name="email"]').fill(testData.email);
        await page.locator('[name="email"]').blur();
        await testUtils.waitForApiResponse(/api\/validate-email/);
        await expect(page.locator('[name="email"]')).toHaveAttribute('class', /border-green-400/);

        // Fill card number and await validation
        await page.locator('[name="cardNumber"]').fill(validCardNumber);
        await page.locator('[name="cardNumber"]').blur();
        await testUtils.waitForApiResponse(/api\/validate-card/);
        await expect(page.locator('[name="cardNumber"]')).toHaveAttribute('class', /border-green-400/);
        await expect(page.locator('p:has-text("Valid card number")')).toBeVisible();

        // Fill other fields
        await page.locator('[name="expiry"]').fill(validExpiry);
        await page.locator('[name="cvv"]').fill(validCvv);
        await page.locator('[name="amount"]').fill(validAmount);

        // Submit form
        const checkoutResponsePromise = testUtils.waitForApiResponse(/api\/checkout/);
        await page.locator('[type="submit"]').click();

        const checkoutResponse = await checkoutResponsePromise;
        expect(checkoutResponse.status).toBe("success");
        expect(checkoutResponse.message).toContain("Payment processed successfully");

        // Assert success message on UI
        await expect(page.locator('div:has-text("Payment processed successfully")')).toBeVisible();
    });

    test('should prevent checkout with an invalid card number', async ({ page }) => {
        const testData = testUtils.generateTestData();
        const invalidCardNumber = '1111 1111 1111 1111'; // A common invalid test card number
        const validExpiry = '12/25';
        const validCvv = '123';
        const validAmount = '50.00';

        // Fill email and await validation
        await page.locator('[name="email"]').fill(testData.email);
        await page.locator('[name="email"]').blur();
        await testUtils.waitForApiResponse(/api\/validate-email/);

        // Fill invalid card number and await validation
        await page.locator('[name="cardNumber"]').fill(invalidCardNumber);
        await page.locator('[name="cardNumber"]').blur();
        await testUtils.waitForApiResponse(/api\/validate-card/);
        await expect(page.locator('[name="cardNumber"]')).toHaveAttribute('class', /border-red-400/);
        await expect(page.locator('p:has-text("Invalid card number")')).toBeVisible();

        // Fill other fields
        await page.locator('[name="expiry"]').fill(validExpiry);
        await page.locator('[name="cvv"]').fill(validCvv);
        await page.locator('[name="amount"]').fill(validAmount);

        // Assert submit button is disabled
        await expect(page.locator('[type="submit"]')).toBeDisabled();
    });

    test('should allow checkout even if email validation service is unavailable (soft fail)', async ({ page }) => {
        const softFailEmail = 'softfail@example.com';
        const validCardNumber = '4242 4242 4242 4242';
        const validExpiry = '12/25';
        const validCvv = '123';
        const validAmount = '75.00';

        // Mock the email validation endpoint to return a 500
        await testUtils.mockApiResponse(/api\/validate-email/, { message: 'Internal Server Error' }, 500);

        // Fill email and await validation (which will be a soft fail due to mock)
        await page.locator('[name="email"]').fill(softFailEmail);
        await page.locator('[name="email"]').blur();
        await testUtils.waitForApiResponse(/api\/validate-email/);

        // Assert soft fail warning message
        await expect(page.locator('p:has-text("Email validation service temporarily unavailable")')).toBeVisible();
        await expect(page.locator('[name="email"]')).toHaveAttribute('class', /border-green-400/); // Still marked valid due to soft fail

        // Fill valid card number and await validation
        await page.locator('[name="cardNumber"]').fill(validCardNumber);
        await page.locator('[name="cardNumber"]').blur();
        await testUtils.waitForApiResponse(/api\/validate-card/);
        await expect(page.locator('[name="cardNumber"]')).toHaveAttribute('class', /border-green-400/);
        await expect(page.locator('p:has-text("Valid card number")')).toBeVisible();

        // Fill other fields
        await page.locator('[name="expiry"]').fill(validExpiry);
        await page.locator('[name="cvv"]').fill(validCvv);
        await page.locator('[name="amount"]').fill(validAmount);

        // Submit form
        const checkoutResponsePromise = testUtils.waitForApiResponse(/api\/checkout/);
        await page.locator('[type="submit"]').click();

        const checkoutResponse = await checkoutResponsePromise;
        expect(checkoutResponse.status).toBe("success");
        expect(checkoutResponse.message).toContain("Payment processed successfully");

        // Assert success message on UI
        await expect(page.locator('div:has-text("Payment processed successfully")')).toBeVisible();
    });
});
