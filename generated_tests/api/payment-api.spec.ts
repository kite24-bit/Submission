import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Payment API', () => {
  let apiHelper: ApiHelper;
  let apiBaseUrl: string;

  test.beforeAll(async ({ config }) => {
    apiHelper = new ApiHelper(config.projects[0].use.baseURL!);
    apiBaseUrl = config.projects[0].use.baseURL!;
  });

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      console.log(`Test Failed: ${testInfo.title}`);
    }
  });

  // Mock schema definitions from swagger.json - replace with actual schema parsing if available
  const paymentSchemas = {
    "PaymentIntent": {
      "type": "object",
      "properties": {
        "id": {"type": "string"},
        "amount": {"type": "number"},
        "currency": {"type": "string"},
        "status": {"type": "string", "enum": ["requires_payment_method", "processing", "succeeded", "failed"]},
        "client_secret": {"type": "string"}
      },
      "required": ["id", "amount", "currency", "status", "client_secret"]
    },
    "Error": {
      "type": "object",
      "properties": {
        "message": {"type": "string"},
        "code": {"type": "string"}
      },
      "required": ["message", "code"]
    }
  };

  // Helper function to assert schema compliance
  const expectSchema = (data: any, schema: any) => {
    expect(data).toBeDefined();
    if (schema.type === 'object') {
      if (schema.required) {
        for (const key of schema.required) {
          expect(data, `Missing required property: ${key}`).toHaveProperty(key);
        }
      }
      for (const key in schema.properties) {
        const propertySchema = schema.properties[key];
        if (data.hasOwnProperty(key)) {
          expect(typeof data[key], `Incorrect type for property "${key}". Expected ${propertySchema.type}, got ${typeof data[key]}`).toBe(propertySchema.type);
          if (propertySchema.enum) {
            expect(propertySchema.enum, `Enum values for property "${key}" are invalid.`).toContain(data[key]);
          }
          if (propertySchema.type === 'object') {
            expectSchema(data[key], propertySchema);
          }
        }
      }
    } else {
      expect(typeof data).toBe(schema.type);
    }
  };

  // --- Payment Intents ---

  test('POST /payments/intents - Create a Payment Intent', async () => {
    const paymentData = {
      amount: 1000,
      currency: 'USD',
    };
    const response = await apiHelper.post('/payments/intents', { data: paymentData });
    expect(response.ok()).toBeTruthy();
    const responseBody = await response.json();
    expectSchema(responseBody, paymentSchemas.PaymentIntent);
    expect(responseBody.amount).toBe(paymentData.amount);
    expect(responseBody.currency).toBe(paymentData.currency);
    expect(responseBody.status).toBe('requires_payment_method');
  });

  test('GET /payments/intents/:id - Get a Payment Intent', async () => {
    // First, create a payment intent to get an ID
    const createResponse = await apiHelper.post('/payments/intents', { data: { amount: 2000, currency: 'USD' } });
    const createdPayment = await createResponse.json();
    const paymentId = createdPayment.id;

    const response = await apiHelper.get(`/payments/intents/${paymentId}`);
    expect(response.ok()).toBeTruthy();
    const responseBody = await response.json();
    expectSchema(responseBody, paymentSchemas.PaymentIntent);
    expect(responseBody.id).toBe(paymentId);
  });

  test('POST /payments/intents/:id/cancel - Cancel a Payment Intent', async () => {
    // First, create a payment intent to get an ID
    const createResponse = await apiHelper.post('/payments/intents', { data: { amount: 3000, currency: 'USD' } });
    const createdPayment = await createResponse.json();
    const paymentId = createdPayment.id;

    const response = await apiHelper.post(`/payments/intents/${paymentId}/cancel`);
    expect(response.ok()).toBeTruthy();
    const responseBody = await response.json();
    expectSchema(responseBody, paymentSchemas.PaymentIntent);
    expect(responseBody.status).toBe('failed'); // Assuming cancellation leads to a failed state
  });

  // --- Other Endpoints (Add more tests as needed based on swagger.json) ---

  // Example: Test for a hypothetical /payments/webhooks endpoint
  test('POST /payments/webhooks - Handle incoming webhooks', async () => {
    const webhookPayload = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_webhook_123',
          amount: 500,
          currency: 'EUR',
          status: 'succeeded'
        }
      }
    };
    const response = await apiHelper.post('/payments/webhooks', { data: webhookPayload });
    // Depending on the webhook implementation, the response might be 200 OK, or it might return specific data.
    // For now, we'll just check if it's OK.
    expect(response.ok()).toBeTruthy();
    // If the webhook endpoint returns JSON, you might want to assert its structure here.
    // For example:
    // const responseBody = await response.json();
    // expectSchema(responseBody, someWebhookResponseSchema);
  });

  // Example: Test for a hypothetical /payments/refunds endpoint
  test('POST /payments/refunds - Create a refund', async () => {
    const refundData = {
      paymentIntentId: 'pi_refund_abc',
      amount: 500,
      currency: 'USD'
    };
    const response = await apiHelper.post('/payments/refunds', { data: refundData });
    expect(response.ok()).toBeTruthy();
    const responseBody = await response.json();
    // Assuming a Refund object schema similar to PaymentIntent
    // expectSchema(responseBody, paymentSchemas.Refund);
    // expect(responseBody.paymentIntentId).toBe(refundData.paymentIntentId);
    // expect(responseBody.amount).toBe(refundData.amount);
  });

  // Add tests for other endpoints like GET /payments, PUT /payments/:id, DELETE /payments/:id etc. based on swagger.json
});
