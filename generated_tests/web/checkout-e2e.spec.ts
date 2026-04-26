import { test, expect } from '@playwright/test';
import { TestUtils } from '../../utils/test-utils';

test.describe('Checkout E2E Tests', () => {
  let testUtils: TestUtils;
  let page: Page;

  test.beforeEach(async ({ page: browserPage }) => {
    page = browserPage;
    testUtils = new TestUtils(page);
    // Navigate to the checkout page and wait for it to load
    await page.goto('http://localhost:3000'); // Assuming the frontend is served at port 3000
    await testUtils.waitForPageLoad();
  });

  test('1. Happy path — fill all fields and submit, Skip per-field validation checks.', async () => {
    // Fill all fields, skipping individual validation checks as per requirement
    await testUtils.fillField('input[name="email"]', 'test@example.com');
    await testUtils.fillField('input[name="cardNumber"]', '4111111111111111'); // Use a valid test card number
    await testUtils.fillField('input[name="expiry"]', '12/25');
    await testUtils.fillField('input[name="cvv"]', '123');
    await testUtils.fillField('input[name="amount"]', '100.50');

    // Submit the form
    await testUtils.clickElement('button[type="submit"]');

    // Assert that the payment was successful or a success message is displayed
    // This will depend on the success message shown in application_code/app/page.tsx
    await testUtils.waitForText('✅ Payment successful'); // Adjust this text based on actual success message
  });

  test('2. Negative test 1 — derived from page.tsx: Invalid email format and card number.', async () => {
    // Fill form with invalid email and card number
    await testUtils.fillField('input[name="email"]', 'invalid-email');
    await testUtils.fillField('input[name="cardNumber"]', '1234'); // Invalid card number
    await testUtils.fillField('input[name="expiry"]', '12/25');
    await testUtils.fillField('input[name="cvv"]', '123');
    await testUtils.fillField('input[name="amount', '50.00');

    // Trigger email blur to show validation warning
    await page.locator('input[name="email"]').blur();
    // Trigger card blur to show validation warning
    await page.locator('input[name="cardNumber"]').blur();

    // Assert that the warnings for invalid email and card number are displayed
    await testUtils.waitForText('❌ Invalid email format');
    await testUtils.waitForText('❌ Invalid card number (Luhn check failed)');

    // Attempt to submit the form
    await testUtils.clickElement('button[type="submit"]');

    // Assert that submission is blocked or an error message is shown,
    // and that the success message is NOT displayed.
    await expect(page.locator('button[type="submit"]')).toBeEnabled(); // Or check if disabled if that's the behavior
    await testUtils.waitForText('❌ Please enter a valid card number'); // Specific error message for submission block
    await expect(page.locator('text=✅ Payment successful')).not.toBeVisible(); // Ensure success message is not shown
  });

  test('3. Negative test 2 — derived from page.tsx: Empty required fields.', async () => {
    // Attempt to submit the form with all fields empty
    await testUtils.clickElement('button[type="submit"]');

    // Assert that the browser's validation (or our custom JS validation) prevents submission
    // or shows appropriate error messages for required fields.
    // For Playwright, we often check for the 'required' attribute and its effect,
    // or specific error messages if the frontend provides them.

    // Checking for the presence of required attribute for each field
    await expect(page.locator('input[name="email"]')).toBeRequired();
    await expect(page.locator('input[name="cardNumber"]')).toBeRequired();
    await expect(page.locator('input[name="expiry"]')).toBeRequired();
    await expect(page.locator('input[name="cvv"]')).toBeRequired();
    await expect(page.locator('input[name="amount"]')).toBeRequired();

    // Additionally, check if submission was blocked and no success message appeared
    await expect(page.locator('button[type="submit"]')).toBeEnabled(); // Assuming it remains enabled until valid
    await expect(page.locator('text=✅ Payment successful')).not.toBeVisible(); // Ensure success message is not shown
  });
});
