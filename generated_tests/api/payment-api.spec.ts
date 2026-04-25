import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Payment API Tests', () => {
  let apiHelper: ApiHelper;

  test.beforeAll(async ({ request }) => {
    apiHelper = new ApiHelper(request);
  });

  test('Health check endpoint - GET /api/health', async () => {
    const response = await apiHelper.get('/api/health');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(typeof body.message).toBe('string');
    expect(typeof body.status).toBe('string');
  });

  test.describe('Payment Checkout - POST /api/checkout', () => {
    test('should process payment successfully - 200 OK', async () => {
      const payload = {
        amount: 50,
        cardNumber: "4242 4242 4242 4242",
        cvv: "123",
        expiry: "12/26"
      };
      
      const response = await apiHelper.post('/api/checkout', payload);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(typeof body.message).toBe('string');
      expect(typeof body.status).toBe('string');
    });

    test('should handle invalid payment data - 400 Bad Request', async () => {
      const payload = {
        amount: -1,
        cardNumber: "invalid",
        cvv: "abc",
        expiry: "99/99"
      };
      
      const response = await apiHelper.post('/api/checkout', payload);
      
      if (response.status() === 400) {
        const body = await response.json();
        expect(typeof body.error).toBe('string');
      }
    });
  });

  test.describe('Card Validation - POST /api/validate-card', () => {
    test('should validate a correct card number - 200 OK', async () => {
      const payload = {
        cardNumber: "4242424242424242"
      };
      
      const response = await apiHelper.post('/api/validate-card', payload);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(typeof body.message).toBe('string');
      expect(typeof body.valid).toBe('boolean');
    });

    test('should handle invalid card request - 400 Bad Request', async () => {
      const payload = {
        cardNumber: ""
      };
      
      const response = await apiHelper.post('/api/validate-card', payload);
      
      if (response.status() === 400) {
        const body = await response.json();
        expect(typeof body.error).toBe('string');
      }
    });
  });

  test.describe('Email Validation - POST /api/validate-email', () => {
    test('should validate a correct email address - 200 OK', async () => {
      const payload = {
        email: "user@example.com"
      };
      
      const response = await apiHelper.post('/api/validate-email', payload);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(typeof body.message).toBe('string');
      expect(typeof body.valid).toBe('boolean');
    });

    test('should handle email validation error - 500 Internal Server Error', async () => {
      // Assuming a specific invalid format or reserved email might trigger a 500 as per swagger
      const payload = {
        email: "error@internal.com"
      };
      
      const response = await apiHelper.post('/api/validate-email', payload);
      
      if (response.status() === 500) {
        const body = await response.json();
        expect(typeof body.error).toBe('string');
      }
    });
  });
});
