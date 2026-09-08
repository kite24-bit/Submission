import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Payment API', () => {
    let apiHelper: ApiHelper;

    test.beforeEach(async ({ request }) => {
        apiHelper = new ApiHelper(request);
    });

    test.describe('GET /api/health', () => {
        test('returns healthy status conforming to main.HealthResponse schema', async () => {
            const response = await apiHelper.get('/api/health');
            const body = await apiHelper.validateAndGetJson(response, 200);

            // main.HealthResponse: { status: string, message: string }
            expect(typeof body.status).toBe('string');
            expect(typeof body.message).toBe('string');

            expect(body.status).toBe('healthy');
            expect(body.message).toBe('Server is running');
        });
    });

    test.describe('POST /api/checkout', () => {
        test('processes a valid payment and returns main.PaymentResponse schema', async () => {
            // main.PaymentRequest: { amount: number, cardNumber: string, cvv: string, expiry: string }
            const payload = {
                amount: 50,
                cardNumber: '4242 4242 4242 4242',
                cvv: '123',
                expiry: '12/26',
            };

            expect(typeof payload.amount).toBe('number');
            expect(typeof payload.cardNumber).toBe('string');
            expect(typeof payload.cvv).toBe('string');
            expect(typeof payload.expiry).toBe('string');

            const response = await apiHelper.post('/api/checkout', payload);
            const body = await apiHelper.validateAndGetJson(response, 200);

            // main.PaymentResponse: { status: string, message: string }
            expect(typeof body.status).toBe('string');
            expect(typeof body.message).toBe('string');

            expect(body.status).toBe('success');
            expect(body.message).toBe('Payment processed successfully!');
        });

        test('returns 400 with main.ErrorResponse schema for malformed JSON', async () => {
            const response = await apiHelper.post('/api/checkout', 'this is not json');
            const body = await apiHelper.validateAndGetJson(response, 400);

            // main.ErrorResponse: { error: string }
            expect(typeof body.error).toBe('string');
        });

        test('returns 400 with main.ErrorResponse schema for invalid amount type', async () => {
            const payload = { amount: 'not-a-number' };

            const response = await apiHelper.post('/api/checkout', payload);
            const body = await apiHelper.validateAndGetJson(response, 400);

            // main.ErrorResponse: { error: string }
            expect(typeof body.error).toBe('string');
        });
    });

    test.describe('POST /api/validate-card', () => {
        test('returns valid=true for a Luhn-valid card (main.CardResponse schema)', async () => {
            const payload = { cardNumber: '4242424242424242' };

            const response = await apiHelper.post('/api/validate-card', payload);
            const body = await apiHelper.validateAndGetJson(response, 200);

            // main.CardResponse: { valid: boolean, message: string }
            expect(typeof body.valid).toBe('boolean');
            expect(typeof body.message).toBe('string');

            expect(body.valid).toBe(true);
            expect(body.message).toBe('Card number validated');
        });

        test('returns valid=false for a Luhn-invalid card (main.CardResponse schema)', async () => {
            const payload = { cardNumber: '1234567890123456' };

            const response = await apiHelper.post('/api/validate-card', payload);
            const body = await apiHelper.validateAndGetJson(response, 200);

            // main.CardResponse: { valid: boolean, message: string }
            expect(typeof body.valid).toBe('boolean');
            expect(typeof body.message).toBe('string');

            expect(body.valid).toBe(false);
            expect(body.message).toBe('Invalid card number (Luhn check failed)');
        });

        test('returns valid=false when card number is missing', async () => {
            const response = await apiHelper.post('/api/validate-card', {});
            const body = await apiHelper.validateAndGetJson(response, 200);

            // main.CardResponse: { valid: boolean, message: string }
            expect(typeof body.valid).toBe('boolean');
            expect(typeof body.message).toBe('string');

            expect(body.valid).toBe(false);
        });

        test('returns 400 with main.ErrorResponse schema for malformed JSON', async () => {
            const response = await apiHelper.post('/api/validate-card', 'this is not json');
            const body = await apiHelper.validateAndGetJson(response, 400);

            // main.ErrorResponse: { error: string }
            expect(typeof body.error).toBe('string');
        });
    });

    test.describe('POST /api/validate-email', () => {
        test('returns 500 with main.ErrorResponse schema when service is unavailable', async () => {
            // main.EmailRequest: { email: string }
            const payload = { email: 'user@example.com' };

            expect(typeof payload.email).toBe('string');

            const response = await apiHelper.post('/api/validate-email', payload);
            const body = await apiHelper.validateAndGetJson(response, 500);

            // main.ErrorResponse: { error: string }
            expect(typeof body.error).toBe('string');
            expect(body.error).toBe('Email validation service temporarily unavailable');
        });

        test('returns 400 with main.ErrorResponse schema for malformed JSON', async () => {
            const response = await apiHelper.post('/api/validate-email', 'this is not json');
            const body = await apiHelper.validateAndGetJson(response, 400);

            // main.ErrorResponse: { error: string }
            expect(typeof body.error).toBe('string');
        });
    });
});