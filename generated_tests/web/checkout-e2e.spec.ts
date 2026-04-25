
import { test, expect } from '@playwright/test';
import { TestUtils } from '../../utils/test-utils'; // Adjust path as needed

// Define the base URL from the project context or environment
const STAGING_BASE_URL = 'http://localhost:3000'; // Assuming frontend runs on 3000

test.describe('Checkout Flow E2E Tests', () => {
    let testUtils: TestUtils;

    test.beforeEach(async ({ page }) => {
        testUtils = new TestUtils(page);
        await page.goto(STAGING_BASE_URL);
        // Assume navigation to checkout page or filling initial form elements
        // For this example, we'll directly navigate to a checkout-like page
        await page.goto(`${STAGING_BASE_URL}/checkout`); // Adjust URL as necessary
        await testUtils.waitForPageLoad();
    });

    // Happy Path: Successful checkout
    test('should complete checkout successfully', async ({ page }) => {
        // Fill in all required fields for a successful checkout
        await testUtils.fillField('[name="email"]', 'happy.path@example.com');
        await testUtils.fillField('[name="cardNumber"]', '4111111111111111'); // Valid test card
        await testUtils.fillField('[name="expiry"]', '12/25');
        await testUtils.fillField('[name="cvv"]', '123');
        await testUtils.fillField('[name="amount"]', '100.00');

        // Mock the API response for a successful checkout
        await testUtils.mockApiResponse('/api/checkout', { status: 'success', message: 'Checkout completed' });

        // Click the submit button
        await testUtils.clickElement('[type="submit"]');

        // Wait for the checkout API response and assert success
        const response = await testUtils.waitForApiResponse('/api/checkout');
        expect(response.status).toBe('success');

        // Verify navigation to a success page or display of a success message
        await expect(page).toHaveURL(/.*\/order-confirmation/);
        await expect(page.locator('text=Checkout completed')).toBeVisible();
    });

    // Critical Validation Error: Invalid card number
    test('should show validation error for invalid card number', async ({ page }) => {
        // Fill in fields, but with an invalid card number
        await testUtils.fillField('[name="email"]', 'validation.error@example.com');
        await testUtils.fillField('[name="cardNumber"]', '1111'); // Invalid card number
        await testUtils.fillField('[name="expiry"]', '12/25');
        await testUtils.fillField('[name="cvv"]', '123');
        await testUtils.fillField('[name="amount"]', '100.00');

        // Wait for the card validation API response (blur event on cardNumber)
        // The API should respond with 'valid: false'
        await testUtils.mockApiResponse('/api/validate-card', { valid: false, message: 'Invalid card number format' });

        // Trigger blur event on cardNumber to initiate validation
        await page.locator('[name="cardNumber"]').blur();

        // Assert that the validation error message is displayed
        await expect(page.locator('text=Invalid card number format')).toBeVisible();

        // Assert that the submit button is disabled
        await expect(page.locator('[type="submit"]')).toBeDisabled();
    });

    // Network Failure Scenario: API timeout during checkout
    test('should handle network failure during checkout', async ({ page }) => {
        // Fill in all required fields
        await testUtils.fillField('[name="email"]', 'network.failure@example.com');
        await testUtils.fillField('[name="cardNumber"]', '4111111111111111');
        await testUtils.fillField('[name="expiry"]', '12/25');
        await testUtils.fillField('[name="cvv"]', '123');
        await testUtils.fillField('[name="amount"]', '100.00');

        // Mock the API to simulate a network failure (e.g., timeout or server error)
        // Using a status code outside the 2xx range or a specific error response
        await testUtils.mockApiResponse('/api/checkout', { status: 'error', message: 'Checkout failed due to server error' }, 500);

        // Click the submit button
        await testUtils.clickElement('[type="submit"]');

        // Wait for the API response and assert the error state
        // Since we mocked a 500, waitForApiResponse should still catch it.
        // We then assert the error message displayed to the user.
        const response = await testUtils.waitForApiResponse('/api/checkout');
        expect(response.status).toBe('error');
        await expect(page.locator('text=Checkout failed due to server error')).toBeVisible();
    });
});
