import { test, expect, Page } from '@playwright/test';
import { ApiHelper } from '../../playwright_template/utils/api-helper';
import { environment } from '../../playwright_template/config/environment';

// Helper function to fill out the checkout form
async function fillCheckoutForm(page: Page, cardNumber: string, expiry: string, cvv: string, amount: string) {
    await page.locator('[name="cardNumber"]').fill(cardNumber);
    await page.locator('[name="expiry"]').fill(expiry);
    await page.locator('[name="cvv"]').fill(cvv);
    await page.locator('[name="amount"]').fill(amount);
}

// Mock API responses for network failure scenarios
async function mockApiResponses(page: Page) {
    await page.route('**/api/validate-card', async route => {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ valid: false, message: 'Internal Server Error' }) });
    });
    await page.route('**/api/validate-email', async route => {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ valid: false, message: 'Internal Server Error' }) });
    });
    await page.route('**/api/checkout', async route => {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ status: 'failed', message: 'Internal Server Error' }) });
    });
}

test.describe('Checkout Flow E2E Tests', () => {
    let apiHelper: ApiHelper;

    test.beforeEach(async ({ page, request }) => {
        apiHelper = new ApiHelper(request);
        await page.goto('/'); // Assuming '/' maps to the checkout page
    });

    // Happy Path: Successful checkout
    test('should successfully complete checkout with valid details', async ({ page }) => {
        await fillCheckoutForm(page, '1234 5678 1234 5678', '12/25', '123', '100.00');

        // Wait for card validation and then submit
        await page.locator('[name="cardNumber"]').blur(); // Trigger blur for card validation
        await page.waitForResponse('**/api/validate-card');

        await page.locator('[name="email"]').blur(); // Trigger blur for email validation
        await page.waitForResponse('**/api/validate-email');

        // Ensure submit button is enabled and click it
        await expect(page.locator('[type="submit"]')).toBeEnabled();
        await page.click('[type="submit"]');

        // Wait for checkout API call and verify success
        await page.waitForResponse('**/api/checkout');
        await expect(page).toHaveURL('/success'); // Assuming success page URL
        await expect(page.locator('body')).toContainText('Checkout successful'); // Assuming a success message
    });

    // Critical Validation Error: Invalid card number
    test('should show validation error for invalid card number', async ({ page }) => {
        await fillCheckoutForm(page, 'invalid-card-number', '12/25', '123', '100.00');

        // Trigger blur and wait for validation response
        await page.locator('[name="cardNumber"]').blur();
        const response = await page.waitForResponse('**/api/validate-card');
        const responseBody = await response.json();

        // Assert that the card is not valid
        expect(responseBody.valid).toBe(false);
        expect(responseBody.message).toBeDefined(); // Expect a message explaining the error
        await expect(page.locator('[type="submit"]')).toBeDisabled();
    });

    // Network Failure Scenario: API returns 500 during checkout
    test('should handle network failure during checkout', async ({ page }) => {
        // Mock API to return 500 for all relevant endpoints
        await mockApiResponses(page);

        await fillCheckoutForm(page, '1234 5678 1234 5678', '12/25', '123', '100.00');

        // Trigger blur events to initiate API calls
        await page.locator('[name="cardNumber"]').blur();
        await page.waitForResponse('**/api/validate-card'); // Wait for the mocked response

        await page.locator('[name="email"]').blur();
        await page.waitForResponse('**/api/validate-email'); // Wait for the mocked response

        // Attempt to submit, expecting the button to be enabled if validations pass (even if mocked)
        // In a real scenario, if validation failed due to 500, submit would be disabled.
        // Here, we assume mocks allow the submit to be enabled to test the checkout API failure.
        await expect(page.locator('[type="submit"]')).toBeEnabled();
        await page.click('[type="submit"]');

        // Wait for the checkout API call and verify error handling
        const checkoutResponse = await page.waitForResponse('**/api/checkout');
        expect(checkoutResponse.status()).toBe(500);

        // Assert that an error message is displayed
        await expect(page.locator('body')).toContainText('Checkout failed'); // Assuming a failure message
    });
});
