import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Payment API Tests', () => {
  let apiHelper: ApiHelper;
  let createdPaymentId: string;

  test.beforeAll(async ({ request }) => {
    apiHelper = new ApiHelper(request);
  });

  // Helper function to validate Payment schema
  const validatePaymentSchema = (payment: any) => {
    expect(payment).toBeDefined();
    expect(typeof payment.id).toBe('string');
    expect(typeof payment.amount).toBe('number');
    expect(typeof payment.currency).toBe('string');
    expect(typeof payment.status).toBe('string');
    // createdAt is optional, so check if it exists before checking its type
    if (payment.createdAt !== undefined) {
      expect(typeof payment.createdAt).toBe('string');
    }
  };

  test('should create a new payment', async () => {
    const newPayment = {
      amount: 100.50,
      currency: 'USD',
    };
    const response = await apiHelper.post('/api/payments', newPayment);
    expect(response.status()).toBe(201);
    const payment = await response.json();
    validatePaymentSchema(payment);
    createdPaymentId = payment.id;
  });

  test('should get all payments', async () => {
    const response = await apiHelper.get('/api/payments');
    expect(response.status()).toBe(200);
    const payments = await response.json();
    expect(Array.isArray(payments)).toBe(true);
    payments.forEach((payment: any) => {
      validatePaymentSchema(payment);
    });
  });

  test('should get a payment by ID', async () => {
    // Ensure a payment has been created before trying to retrieve it by ID
    await test.step('Create a payment for lookup', async () => {
      const newPayment = {
        amount: 200.75,
        currency: 'EUR',
      };
      const response = await apiHelper.post('/api/payments', newPayment);
      expect(response.status()).toBe(201);
      const payment = await response.json();
      createdPaymentId = payment.id;
    });

    const response = await apiHelper.get(`/api/payments/${createdPaymentId}`);
    expect(response.status()).toBe(200);
    const payment = await response.json();
    validatePaymentSchema(payment);
    expect(payment.id).toBe(createdPaymentId);
  });

  test('should return 404 for a non-existent payment ID', async () => {
    const nonExistentId = 'non-existent-id-123';
    const response = await apiHelper.get(`/api/payments/${nonExistentId}`);
    expect(response.status()).toBe(404);
  });
});
