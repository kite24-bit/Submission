import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Payment API Tests', () => {
  let apiHelper: ApiHelper;

  test.beforeEach(async ({ request }) => {
    apiHelper = new ApiHelper(request);
  });

  test('GET /api/health - Health check', async () => {
    const response = await apiHelper.get('/api/health');
    const body = await apiHelper.validateAndGetJson(response, 200);

    // main.HealthResponse schema validation
    expect(typeof body.message).toBe('string');
    expect(typeof body.status).toBe('string');
    
    expect(body.status).toBe('healthy');
  });

  test('POST /api/checkout - Process payment checkout', async () => {
    const paymentRequest = {
      amount: 50,
      cardNumber: '4242 4242 4242 4242',
      cvv: '123',
      expiry: '12/26'
    };

    const response = await apiHelper.post('/api/checkout', paymentRequest);
    const body = await apiHelper.validateAndGetJson(response, 200);

    // main.PaymentResponse schema validation
    expect(typeof body.message).toBe('string');
    expect(typeof body.status).toBe('string');
  });

  test('POST /api/checkout - Bad Request', async () => {
    // Missing required fields or invalid data to trigger 400
    const invalidRequest = {
      amount: "invalid_amount" // should be number
    };

    const response = await apiHelper.post('/api/checkout', invalidRequest);
    const body = await apiHelper.validateAndGetJson(response, 400);

    // main.ErrorResponse schema validation
    expect(typeof body.error).toBe('string');
  });

  test('POST /api/validate-card - Validate card number', async () => {
    const cardRequest = {
      cardNumber: '4242424242424242'
    };

    const response = await apiHelper.post('/api/validate-card', cardRequest);
    const body = await apiHelper.validateAndGetJson(response, 200);

    // main.CardResponse schema validation
    expect(typeof body.message).toBe('string');
    expect(typeof body.valid).toBe('boolean');
  });

  test('POST /api/validate-card - Bad Request', async () => {
    const response = await apiHelper.post('/api/validate-card', {});
    const body = await apiHelper.validateAndGetJson(response, 400);

    // main.ErrorResponse schema validation
    expect(typeof body.error).toBe('string');
  });

  test('POST /api/validate-email - Validate email address', async () => {
    const emailRequest = {
      email: 'user@example.com'
    };

    const response = await apiHelper.post('/api/validate-email', emailRequest);
    const body = await apiHelper.validateAndGetJson(response, 200);

    // main.EmailResponse schema validation
    expect(typeof body.message).toBe('string');
    expect(typeof body.valid).toBe('boolean');
  });

  test('POST /api/validate-email - Internal Server Error / Validation Failure', async () => {
    // Using an invalid email might trigger the error response path depending on implementation
    const emailRequest = {
      email: 'invalid-email'
    };

    const response = await apiHelper.post('/api/validate-email', emailRequest);
    
    // Swagger says 500 for error response on this endpoint
    if (response.status() === 500) {
      const body = await apiHelper.validateAndGetJson(response, 500);
      // main.ErrorResponse schema validation
      expect(typeof body.error).toBe('string');
    } else {
      // If implementation returns 200 even for invalid email format but valid: false
      const body = await apiHelper.validateAndGetJson(response, 200);
      expect(typeof body.message).toBe('string');
      expect(typeof body.valid).toBe('boolean');
    }
  });
});
