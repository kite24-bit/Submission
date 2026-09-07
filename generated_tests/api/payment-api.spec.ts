import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Payment API', () => {
    let apiHelper: ApiHelper;

    test.beforeEach(async ({ request }) => {
        apiHelper = new ApiHelper(request);
    });

    test.describe('GET /api/health', () => {
        test('returns healthy status with valid schema', async () => {
            const response = await apiHelper.get('/api/health');
            const body = await apiHelper.validateAndGetJson(response, 200);

            // Schema validation: main.HealthResponse
            expect(typeof body.status).toBe('string');
            expect(typeof body.message).toBe('string');
        });
    });

    test.describe('POST /api/checkout', () => {
        test('processes payment with valid payload', async () => {
            const payload = {
                amount: 50,
                cardNumber: '4242 4242 4242 4242',
                cvv: '123',
                expiry: '12/26'
            };

            const response = await apiHelper.post('/api/checkout', payload);
            const body = await apiHelper.validateAndGetJson(response, 200);

            // Schema validation: main.PaymentResponse
            expect(typeof body.status).toBe('string');
            expect(typeof body.message).toBe('string');
        });

        test('returns 400 for invalid JSON body', async () => {
            const response = await apiHelper.post('/api/checkout', {
                amount: "not-a-number",
            });
            const body = await apiHelper.validateAndGetJson(response, 400);

            // Schema validation: main.ErrorResponse
            expect(typeof body.error).toBe('string');
        });
    });

    test.describe('POST /api/validate-card', () => {
        test('validates a valid credit card (Luhn check)', async () => {
            const payload = {
                cardNumber: '4242424242424242'
            };

            const response = await apiHelper.post('/api/validate-card', payload);
            const body = await apiHelper.validateAndGetJson(response, 200);

            // Schema validation: main.CardResponse
            expect(typeof body.valid).toBe('boolean');
            expect(typeof body.message).toBe('string');
            expect(body.valid).toBe(true);
        });

        test('rejects an invalid credit card (Luhn check fails)', async () => {
            const payload = {
                cardNumber: '1234567890123456'
            };

            const response = await apiHelper.post('/api/validate-card', payload);
            const body = await apiHelper.validateAndGetJson(response, 200);

            // Schema validation: main.CardResponse
            expect(typeof body.valid).toBe('boolean');
            expect(typeof body.message).toBe('string');
            expect(body.valid).toBe(false);
        });

        test('returns 400 for empty/invalid body', async () => {
            const response = await apiHelper.post('/api/validate-card', {});
            const body = await apiHelper.validateAndGetJson(response, 400);

            // Schema validation: main.ErrorResponse
            expect(typeof body.error).toBe('string');
        });
    });

    test.describe('POST /api/validate-email', () => {
        test('returns 500 with error schema (service temporarily unavailable)', async () => {
            const payload = {
                email: 'user@example.com'
            };

            const response = await apiHelper.post('/api/validate-email', payload);
            const body = await apiHelper.validateAndGetJson(response, 500);

            // Schema validation: main.ErrorResponse
            expect(typeof body.error).toBe('string');
        });
    });
});
