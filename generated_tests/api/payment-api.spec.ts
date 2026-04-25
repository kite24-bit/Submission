import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Payment API Tests', () => {
  let apiHelper: ApiHelper;

  test.beforeAll(async ({ request }) => {
    apiHelper = new ApiHelper(request);
  });

  test('GET /api/health - Success', async () => {
    const response = await apiHelper.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(typeof body.message).toBe('string');
    expect(typeof body.status).toBe('string');
  });

  test('POST /api/checkout - Success', async () => {
    const response = await apiHelper.post('/api/checkout', {
      amount: 50,
      cardNumber: '4242 4242 4242 4242',
      cvv: '123',
      expiry: '12/26'
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(typeof body.message).toBe('string');
    expect(typeof body.status).toBe('string');
  });

  test('POST /api/checkout - Bad Request', async () => {
    const response = await apiHelper.post('/api/checkout', {
      amount: -1,
      cardNumber: '',
      cvv: '',
      expiry: ''
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(typeof body.error).toBe('string');
  });

  test('POST /api/validate-card - Success', async () => {
    const response = await apiHelper.post('/api/validate-card', {
      cardNumber: '4242424242424242'
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(typeof body.message).toBe('string');
    expect(typeof body.valid).toBe('boolean');
  });

  test('POST /api/validate-card - Bad Request', async () => {
    const response = await apiHelper.post('/api/validate-card', {
      cardNumber: 'invalid-card-number'
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(typeof body.error).toBe('string');
  });

  test('POST /api/validate-email - Success', async () => {
    const response = await apiHelper.post('/api/validate-email', {
      email: 'user@example.com'
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(typeof body.message).toBe('string');
    expect(typeof body.valid).toBe('boolean');
  });

  test('POST /api/validate-email - Internal Server Error', async () => {
    const response = await apiHelper.post('/api/validate-email', {
      email: 'trigger-500@error.com'
    });
    expect(response.status()).toBe(500);
    const body = await response.json();
    expect(typeof body.error).toBe('string');
  });
});
