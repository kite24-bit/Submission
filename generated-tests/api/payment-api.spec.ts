import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Payment API', () => {
  let apiHelper: ApiHelper;

  test.beforeEach(async ({ request }) => {
    apiHelper = new ApiHelper(request);
  });

  /**
   * 1. GET /api/health
   */
  test.describe('GET /api/health', () => {
    test('should return health status (happy path)', async () => {
      const response = await apiHelper.get('/api/health');
      const body = await apiHelper.validateAndGetJson(response, 200);

      // HealthResponse: { status: string, message: string }
      expect(body).toMatchObject({
        status: expect.any(String),
        message: expect.any(String),
      });
      expect(body.status).toBe('healthy');
    });

    test('should handle unexpected query parameters (edge case)', async () => {
      const response = await apiHelper.get('/api/health?extra=param');
      const body = await apiHelper.validateAndGetJson(response, 200);
      
      expect(body.status).toBe('healthy');
      expect(body.message).toBeDefined();
    });
  });

  /**
   * 2. POST /api/checkout
   */
  test.describe('POST /api/checkout', () => {
    test('should process payment successfully (happy path)', async () => {
      const payload = {
        amount: 50,
        cardNumber: "4242 4242 4242 4242",
        cvv: "123",
        expiry: "12/26"
      };
      const response = await apiHelper.post('/api/checkout', payload);
      const body = await apiHelper.validateAndGetJson(response, 200);

      // PaymentResponse: { status: string, message: string }
      expect(body).toMatchObject({
        status: 'success',
        message: expect.any(String),
      });
    });

    test('should return error for missing amount (negative)', async () => {
      const payload = {
        cardNumber: "4242 4242 4242 4242",
        cvv: "123",
        expiry: "12/26"
      };
      const response = await apiHelper.post('/api/checkout', payload);
      const body = await apiHelper.validateAndGetJson(response, 400);

      // ErrorResponse: { error: string }
      expect(body).toMatchObject({
        error: expect.any(String),
      });
    });
  });

  /**
   * 3. POST /api/validate-card
   */
  test.describe('POST /api/validate-card', () => {
    test('should validate card number successfully (happy path)', async () => {
      const payload = {
        cardNumber: "4242424242424242"
      };
      const response = await apiHelper.post('/api/validate-card', payload);
      const body = await apiHelper.validateAndGetJson(response, 200);

      // CardResponse: { valid: boolean, message: string }
      expect(body).toMatchObject({
        valid: true,
        message: expect.any(String),
      });
    });

    test('should return error for invalid card number type (negative)', async () => {
      const payload = {
        cardNumber: 12345678 // Expected string
      };
      const response = await apiHelper.post('/api/validate-card', payload);
      const body = await apiHelper.validateAndGetJson(response, 400);

      // ErrorResponse: { error: string }
      expect(body).toMatchObject({
        error: expect.any(String),
      });
    });
  });

  /**
   * 4. POST /api/validate-email
   */
  test.describe('POST /api/validate-email', () => {
    test('should validate email successfully (happy path)', async () => {
      const payload = {
        email: "user@example.com"
      };
      const response = await apiHelper.post('/api/validate-email', payload);
      const body = await apiHelper.validateAndGetJson(response, 200);

      // EmailResponse: { valid: boolean, message: string }
      expect(body).toMatchObject({
        valid: true,
        message: expect.any(String),
      });
    });

    test('should return error for missing email field (negative)', async () => {
      const payload = {};
      const response = await apiHelper.post('/api/validate-email', payload);
      const body = await apiHelper.validateAndGetJson(response, 500);

      // ErrorResponse: { error: string }
      expect(body).toMatchObject({
        error: expect.any(String),
      });
    });
  });
});
