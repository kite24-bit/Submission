import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Payment API Tests', () => {
  let apiHelper: ApiHelper;

  test.beforeAll(async ({ request }) => {
    apiHelper = new ApiHelper(request);
  });

  test('GET /api/health - Health check', async () => {
    const response = await apiHelper.get('/api/health');
    const body = await apiHelper.validateAndGetJson(response, 200);

    // Schema-aware assertions for main.HealthResponse
    expect(typeof body.message).toBe('string');
    expect(typeof body.status).toBe('string');
    
    // Values verification (optional but good practice)
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

    // Schema-aware assertions for main.PaymentResponse
    expect(typeof body.message).toBe('string');
    expect(typeof body.status).toBe('string');
    
    expect(body.status).toBe('success');
  });

  test('POST /api/checkout - Bad Request', async () => {
    const invalidRequest = {
      amount: -10, // Invalid amount
      cardNumber: 'invalid',
      cvv: 'abc',
      expiry: '99/99'
    };

    const response = await apiHelper.post('/api/checkout', invalidRequest);
    const body = await apiHelper.validateAndGetJson(response, 400);

    // Schema-aware assertions for main.ErrorResponse
    expect(typeof body.error).toBe('string');
  });

  test('POST /api/validate-card - Validate card number', async () => {
    const cardRequest = {
      cardNumber: '4242424242424242'
    };

    const response = await apiHelper.post('/api/validate-card', cardRequest);
    const body = await apiHelper.validateAndGetJson(response, 200);

    // Schema-aware assertions for main.CardResponse
    expect(typeof body.message).toBe('string');
    expect(typeof body.valid).toBe('boolean');
  });

  test('POST /api/validate-card - Bad Request', async () => {
    const cardRequest = {
      cardNumber: '' // Empty card number
    };

    const response = await apiHelper.post('/api/validate-card', cardRequest);
    const body = await apiHelper.validateAndGetJson(response, 400);

    // Schema-aware assertions for main.ErrorResponse
    expect(typeof body.error).toBe('string');
  });

  test('POST /api/validate-email - Validate email address', async () => {
    const emailRequest = {
      email: 'user@example.com'
    };

    const response = await apiHelper.post('/api/validate-email', emailRequest);
    const body = await apiHelper.validateAndGetJson(response, 200);

    // Schema-aware assertions for main.EmailResponse
    expect(typeof body.message).toBe('string');
    expect(typeof body.valid).toBe('boolean');
  });

  test('POST /api/validate-email - Internal Server Error / Invalid format', async () => {
    const emailRequest = {
      email: 'invalid-email'
    };

    const response = await apiHelper.post('/api/validate-email', emailRequest);
    
    // The swagger says 500 for error response in validate-email
    const body = await apiHelper.validateAndGetJson(response, 500);

    // Schema-aware assertions for main.ErrorResponse
    expect(typeof body.error).toBe('string');
  });
});
