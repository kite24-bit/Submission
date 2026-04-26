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
        // Fill out all fields with valid data
        await testUtils.fillField('input[name="email"]', 'test@example.com');
        await page.locator('input[name="email"]').blur(); // Trigger email validation
        await testUtils.fillField('input[name="cardNumber"]', '4111 1111 1111 1111');
        await page.locator('input[name="cardNumber"]').blur(); // Trigger card validation
        await testUtils.fillField('input[name="expiry"]', '12/25');
        await testUtils.fillField('input[name="cvv"]', '123');
        await testUtils.fillField('input[name="amount"]', '100.00');

        // Submit the form
        await testUtils.clickElement('button[type="submit"]');

        // Assert success message
        await expect(page.locator('div.p-4.rounded-xl.mb-6.text-sm.font-medium.shadow-lg')).toContainText('✅');
        await expect(page.locator('div.p-4.rounded-xl.mb-6.text-sm.font-medium.shadow-lg')).toContainText('Payment successful');
    });

    test('2. Negative test - invalid card number (Luhn check failed) should block submission', async ({ page }) => {
        // Fill with valid email and other fields
        await testUtils.fillField('input[name="email"]', 'valid@example.com');
        await page.locator('input[name="email"]').blur();
        // Fill with an invalid card number (Luhn check fails for '4111 1111 1111 1110')
        await testUtils.fillField('input[name="cardNumber"]', '4111 1111 1111 1110');
        await page.locator('input[name="cardNumber"]').blur(); // Trigger card validation
        await expect(page.locator('p.text-xs.mt-1.5.ml-1.font-medium')).toContainText('❌ Invalid card number (Luhn check failed)');
        await expect(page.locator('svg.absolute.right-4.top-1/2.-translate-y-1/2.w-5.h-5.text-red-500')).toBeVisible();

        await testUtils.fillField('input[name="expiry"]', '12/25');
        await testUtils.fillField('input[name="cvv"]', '123');
        await testUtils.fillField('input[name="amount"]', '50.00');

        // Attempt to submit
        await testUtils.clickElement('button[type="submit"]');

        // Assert that a blocking error message appears and payment is not processed
        await expect(page.locator('div.p-4.rounded-xl.mb-6.text-sm.font-medium.shadow-lg')).toContainText('❌ Please enter a valid card number');
        await expect(page.locator('text=Pay $50.00')).toBeVisible(); // Button should not show "Processing Payment..."
    });

    test('3. Negative test - empty required fields should trigger browser validation', async ({ page }) => {
        // Attempt to submit without filling any required fields
        await testUtils.clickElement('button[type="submit"]');

        // Browser's native 'required' validation should prevent submission
        // We can assert that the success message is NOT visible, and the form remains.
        await expect(page.locator('div.p-4.rounded-xl.mb-6.text-sm.font-medium.shadow-lg')).not.toBeVisible();

        // Check for specific browser validation messages (though these are hard to assert directly in Playwright)
        // A more reliable check is to ensure that no success/error message from the server is displayed
        // and the input fields retain their invalid state (e.g., :invalid pseudo-class)
        const emailInput = page.locator('input[name="email"]');
        await expect(emailInput).toBeFocused(); // Browser typically focuses on the first invalid field
        await expect(emailInput).toHaveAttribute('required', ''); // Confirm the required attribute
    });
});