import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Payment API Tests', () => {
  let apiHelper: ApiHelper;

  test.beforeEach(({ request }) => {
    apiHelper = new ApiHelper(request);
  });

  /**
   * Test Coverage for /api/health
   * Schema: main.HealthResponse
   */
  test('Health check - GET /api/health', async () => {
    const response = await apiHelper.get('/api/health');
    const body = await apiHelper.validateAndGetJson(response, 200);

    // Schema validation for main.HealthResponse
    expect(typeof body.message).toBe('string');
    expect(typeof body.status).toBe('string');
    
    // Values check
    expect(body.status).toBe('healthy');
  });

  /**
   * Test Coverage for /api/checkout
   * Schema: main.PaymentRequest -> main.PaymentResponse
   */
  test('Process payment checkout - POST /api/checkout', async () => {
    const paymentRequest = {
      amount: 50,
      cardNumber: '4242 4242 4242 4242',
      cvv: '123',
      expiry: '12/26',
    };

    const response = await apiHelper.post('/api/checkout', paymentRequest);
    const body = await apiHelper.validateAndGetJson(response, 200);

    // Schema validation for main.PaymentResponse
    expect(typeof body.message).toBe('string');
    expect(typeof body.status).toBe('string');
    
    // Values check
    expect(body.status).toBe('success');
  });

  /**
   * Test Coverage for /api/checkout - Error handling
   * Schema: main.ErrorResponse
   */
  test('Process payment checkout with invalid data - POST /api/checkout', async () => {
    const invalidRequest = {
      amount: -1,
      cardNumber: 'invalid',
      cvv: '0',
      expiry: 'past',
    };

    const response = await apiHelper.post('/api/checkout', invalidRequest);
    const body = await apiHelper.validateAndGetJson(response, 400);

    // Schema validation for main.ErrorResponse
    expect(typeof body.error).toBe('string');
  });

  /**
   * Test Coverage for /api/validate-card
   * Schema: main.CardRequest -> main.CardResponse
   */
  test('Validate valid card number - POST /api/validate-card', async () => {
    const cardRequest = {
      cardNumber: '4242424242424242',
    };

    const response = await apiHelper.post('/api/validate-card', cardRequest);
    const body = await apiHelper.validateAndGetJson(response, 200);

    // Schema validation for main.CardResponse
    expect(typeof body.message).toBe('string');
    expect(typeof body.valid).toBe('boolean');
    
    // Values check
    expect(body.valid).toBe(true);
  });

  test('Validate invalid card number - POST /api/validate-card', async () => {
    const cardRequest = {
      cardNumber: '1234567812345678',
    };

    const response = await apiHelper.post('/api/validate-card', cardRequest);
    const body = await apiHelper.validateAndGetJson(response, 200);

    // Schema validation for main.CardResponse
    expect(typeof body.message).toBe('string');
    expect(typeof body.valid).toBe('boolean');
    
    // Values check
    expect(body.valid).toBe(false);
  });

  test('Validate card number with bad request - POST /api/validate-card', async () => {
    const invalidRequest = {}; // Missing cardNumber

    const response = await apiHelper.post('/api/validate-card', invalidRequest);
    const body = await apiHelper.validateAndGetJson(response, 400);

    // Schema validation for main.ErrorResponse
    expect(typeof body.error).toBe('string');
  });

  /**
   * Test Coverage for /api/validate-email
   * Schema: main.EmailRequest -> main.EmailResponse
   */
  test('Validate valid email address - POST /api/validate-email', async () => {
    const emailRequest = {
      email: 'user@example.com',
    };

    const response = await apiHelper.post('/api/validate-email', emailRequest);
    const body = await apiHelper.validateAndGetJson(response, 200);

    // Schema validation for main.EmailResponse
    expect(typeof body.message).toBe('string');
    expect(typeof body.valid).toBe('boolean');
    
    // Values check
    expect(body.valid).toBe(true);
  });

  test('Validate invalid email address - POST /api/validate-email', async () => {
    const emailRequest = {
      email: 'invalid-email',
    };

    const response = await apiHelper.post('/api/validate-email', emailRequest);
    const body = await apiHelper.validateAndGetJson(response, 200);

    // Schema validation for main.EmailResponse
    expect(typeof body.message).toBe('string');
    expect(typeof body.valid).toBe('boolean');
    
    // Values check
    expect(body.valid).toBe(false);
  });
});
