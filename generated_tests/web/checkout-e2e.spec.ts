import { test, expect } from '@playwright/test';

test.describe('Checkout E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the checkout page before each test
    await page.goto('/');
  });

  test('should complete a successful checkout flow with valid data', async ({ page }) => {
    // 1. Check backend health to ensure system is ready
    const healthCheck = page.waitForResponse(resp => resp.url().includes('/api/health'));
    await page.click('button:has-text("Check Backend Status")');
    await healthCheck;
    await expect(page.locator('text=🟢 Backend Status')).toBeVisible();

    // 2. Fill Email and trigger async validation on blur
    const emailValidation = page.waitForResponse(resp => 
      resp.url().includes('/api/validate-email') && resp.request().method() === 'POST'
    );
    await page.fill('[name="email"]', 'customer@example.com');
    await page.locator('[name="email"]').blur();
    await emailValidation;
    
    // Check visual feedback for valid email
    await expect(page.locator('[name="email"]')).toHaveClass(/border-green-400/);

    // 3. Fill Card Number and check auto-formatting and async validation on blur
    const cardValidation = page.waitForResponse(resp => 
      resp.url().includes('/api/validate-card') && resp.request().method() === 'POST'
    );
    // Use a number that passes validation
    await page.fill('[name="cardNumber"]', '1234567890123452');
    await page.locator('[name="cardNumber"]').blur();
    await cardValidation;
    
    // Assert auto-formatting (spaces every 4 digits)
    await expect(page.locator('[name="cardNumber"]')).toHaveValue('1234 5678 9012 3452');
    await expect(page.locator('text=✅ Valid card number')).toBeVisible();

    // 4. Fill Expiry and check MM/YY auto-formatting
    await page.fill('[name="expiry"]', '1226');
    await expect(page.locator('[name="expiry"]')).toHaveValue('12/26');

    // 5. Fill CVV (type="password")
    await page.fill('[name="cvv"]', '123');

    // 6. Fill Amount (type="number")
    await page.fill('[name="amount"]', '150.00');

    // 7. Submit and wait for checkout response
    const checkoutResponse = page.waitForResponse(resp => 
      resp.url().includes('/api/checkout') && resp.request().method() === 'POST'
    );
    await page.click('[type="submit"]');
    const response = await checkoutResponse;
    const body = await response.json();

    // Verify success message returned by API
    await expect(page.locator(`text=✅ ${body.message}`)).toBeVisible();
  });

  test('should show error for invalid card number and prevent submission', async ({ page }) => {
    // Fill invalid card number
    const cardValidation = page.waitForResponse(resp => 
      resp.url().includes('/api/validate-card')
    );
    await page.fill('[name="cardNumber"]', '1111111111111111');
    await page.locator('[name="cardNumber"]').blur();
    await cardValidation;

    // Check error feedback
    await expect(page.locator('text=❌ Invalid card number')).toBeVisible();
    await expect(page.locator('[name="cardNumber"]')).toHaveClass(/border-red-400/);

    // Fill remaining required fields
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="expiry"]', '12/25');
    await page.fill('[name="cvv"]', '123');
    await page.fill('[name="amount"]', '10.00');
    
    // Attempt to submit - app should block and show warning
    await page.click('[type="submit"]');
    await expect(page.locator('text=❌ Please enter a valid card number')).toBeVisible();
  });

  test('should handle email validation soft-fail when service returns 500', async ({ page }) => {
    // Mock a 500 error for the email validation endpoint
    await page.route('**/api/validate-email', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal Server Error' })
    }));

    const emailValidation = page.waitForResponse(resp => resp.url().includes('/api/validate-email'));
    await page.fill('[name="email"]', 'user@example.com');
    await page.locator('[name="email"]').blur();
    await emailValidation;

    // Verify soft-fail message: user can still proceed
    await expect(page.locator('text=⚠️ Email validation service temporarily unavailable')).toBeVisible();
    
    // Fill the rest of the form to confirm flow continues
    await page.fill('[name="cardNumber"]', '1234567890123452');
    await page.fill('[name="expiry"]', '12/25');
    await page.fill('[name="cvv"]', '123');
    await page.fill('[name="amount"]', '50.00');

    const checkoutResponse = page.waitForResponse(resp => resp.url().includes('/api/checkout'));
    await page.click('[type="submit"]');
    await checkoutResponse;

    // Expect successful payment despite email validation service failure
    await expect(page.locator('text=✅')).toBeVisible();
  });

  test('should validate CVV and Expiry fields are present and interactive', async ({ page }) => {
    // Basic interaction test for field presence
    const expiry = page.locator('[name="expiry"]');
    const cvv = page.locator('[name="cvv"]');
    
    await expect(expiry).toBeVisible();
    await expect(cvv).toBeVisible();
    await expect(cvv).toHaveAttribute('type', 'password');
    
    await expiry.fill('1124');
    await expect(expiry).toHaveValue('11/24');
    
    await cvv.fill('999');
    await expect(cvv).toHaveValue('999');
  });
});
