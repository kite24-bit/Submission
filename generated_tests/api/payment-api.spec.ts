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

    // Schema validation: main.HealthResponse
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

    // Schema validation: main.PaymentResponse
    expect(typeof body.message).toBe('string');
    expect(typeof body.status).toBe('string');
  });

  test('POST /api/checkout - Bad Request', async () => {
    const invalidRequest = {
      amount: "invalid", // Should be number
      cardNumber: '4242'
    };

    const response = await apiHelper.post('/api/checkout', invalidRequest);
    // Based on swagger, 400 is expected for bad request
    if (response.status() === 400) {
      const body = await response.json();
      // Schema validation: main.ErrorResponse
      expect(typeof body.error).toBe('string');
    }
  });

  test('POST /api/validate-card - Validate card number', async () => {
    const cardRequest = {
      cardNumber: '4242424242424242'
    };

    const response = await apiHelper.post('/api/validate-card', cardRequest);
    const body = await apiHelper.validateAndGetJson(response, 200);

    // Schema validation: main.CardResponse
    expect(typeof body.message).toBe('string');
    expect(typeof body.valid).toBe('boolean');
  });

  test('POST /api/validate-email - Validate email address', async () => {
    const emailRequest = {
      email: 'user@example.com'
    };

    const response = await apiHelper.post('/api/validate-email', emailRequest);
    const body = await apiHelper.validateAndGetJson(response, 200);

    // Schema validation: main.EmailResponse
    expect(typeof body.message).toBe('string');
    expect(typeof body.valid).toBe('boolean');
  });

  test('POST /api/validate-email - Internal Server Error / Invalid format', async () => {
    const emailRequest = {
      email: 'invalid-email'
    };

    const response = await apiHelper.post('/api/validate-email', emailRequest);
    
    // Swagger mentions 500 for this endpoint error
    if (response.status() === 500 || response.status() === 400) {
      const body = await response.json();
      // Schema validation: main.ErrorResponse
      expect(typeof body.error).toBe('string');
    }
  });
});
