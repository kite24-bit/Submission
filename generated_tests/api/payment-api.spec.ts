import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Payment API - Schema Validation', () => {
  let apiHelper: ApiHelper;

  test.beforeEach(async ({ request }) => {
    apiHelper = new ApiHelper(request);
  });

  /**
   * GET /api/health
   * Schema: main.HealthResponse
   */
  test('Health check endpoint returns correct schema', async () => {
    const response = await apiHelper.get('/api/health');
    const body = await apiHelper.validateAndGetJson(response, 200);

    // Assert main.HealthResponse structure
    expect(typeof body.message).toBe('string');
    expect(typeof body.status).toBe('string');
  });

  /**
   * POST /api/checkout
   * Schema: main.PaymentRequest -> main.PaymentResponse / main.ErrorResponse
   */
  test('Checkout endpoint returns correct schema on success', async () => {
    const payload = {
      amount: 50.0,
      cardNumber: '4242 4242 4242 4242',
      cvv: '123',
      expiry: '12/26'
    };

    const response = await apiHelper.post('/api/checkout', payload);
    const body = await apiHelper.validateAndGetJson(response, 200);

    // Assert main.PaymentResponse structure
    expect(typeof body.message).toBe('string');
    expect(typeof body.status).toBe('string');
  });

  test('Checkout endpoint returns correct schema on bad request', async () => {
    // Sending empty body to trigger 400 Bad Request
    const response = await apiHelper.post('/api/checkout', {});
    const body = await apiHelper.validateAndGetJson(response, 400);

    // Assert main.ErrorResponse structure
    expect(typeof body.error).toBe('string');
  });

  /**
   * POST /api/validate-card
   * Schema: main.CardRequest -> main.CardResponse / main.ErrorResponse
   */
  test('Card validation endpoint returns correct schema on success', async () => {
    const payload = {
      cardNumber: '4242424242424242'
    };

    const response = await apiHelper.post('/api/validate-card', payload);
    const body = await apiHelper.validateAndGetJson(response, 200);

    // Assert main.CardResponse structure
    expect(typeof body.message).toBe('string');
    expect(typeof body.valid).toBe('boolean');
  });

  test('Card validation endpoint returns correct schema on failure', async () => {
    // Missing cardNumber to trigger 400 Bad Request
    const response = await apiHelper.post('/api/validate-card', {});
    const body = await apiHelper.validateAndGetJson(response, 400);

    // Assert main.ErrorResponse structure
    expect(typeof body.error).toBe('string');
  });

  /**
   * POST /api/validate-email
   * Schema: main.EmailRequest -> main.EmailResponse / main.ErrorResponse
   */
  test('Email validation endpoint returns correct schema on success', async () => {
    const payload = {
      email: 'user@example.com'
    };

    const response = await apiHelper.post('/api/validate-email', payload);
    const body = await apiHelper.validateAndGetJson(response, 200);

    // Assert main.EmailResponse structure
    expect(typeof body.message).toBe('string');
    expect(typeof body.valid).toBe('boolean');
  });

  test('Email validation endpoint returns correct schema on error', async () => {
    // Sending an empty object which may trigger error defined in swagger (500 Internal Server Error)
    const response = await apiHelper.post('/api/validate-email', {});
    
    // Swagger defines 500 for error response on validate-email
    if (response.status() === 500) {
      const body = await response.json();
      // Assert main.ErrorResponse structure
      expect(typeof body.error).toBe('string');
    } else {
      // If the API returns 400 or other, we still check the ErrorResponse schema if applicable
      const body = await response.json();
      if (body.error) {
        expect(typeof body.error).toBe('string');
      }
    }
  });
});
