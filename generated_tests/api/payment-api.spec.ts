import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Payment API Testing', () => {
    let apiHelper: ApiHelper;

    test.beforeAll(async ({ request }) => {
        apiHelper = new ApiHelper(request);
    });

    test('should get health check endpoint successfully', async () => {
        const response = await apiHelper.get('/api/health');
        expect(response.status()).toBe(200);

        const responseBody = await response.json();
        expect(responseBody).toHaveProperty('status');
        expect(typeof responseBody.status).toBe('string');
        expect(responseBody.status).toBe('healthy');
        expect(responseBody).toHaveProperty('message');
        expect(typeof responseBody.message).toBe('string');
    });

    test.describe('Checkout API', () => {
        const validPaymentRequest = {
            cardNumber: '4242424242424242',
            cvv: '123',
            expiry: '12/26',
            amount: 100.00
        };

        test('should process a valid payment successfully', async () => {
            const response = await apiHelper.post('/api/checkout', validPaymentRequest);
            expect(response.status()).toBe(200);

            const responseBody = await response.json();
            expect(responseBody).toHaveProperty('status');
            expect(typeof responseBody.status).toBe('string');
            expect(responseBody.status).toBe('success');
            expect(responseBody).toHaveProperty('message');
            expect(typeof responseBody.message).toBe('string');
        });

        test('should return 400 for missing cardNumber in checkout request', async () => {
            const invalidRequest = { ...validPaymentRequest, cardNumber: undefined };
            const response = await apiHelper.post('/api/checkout', invalidRequest);
            expect(response.status()).toBe(400);

            const responseBody = await response.json();
            expect(responseBody).toHaveProperty('error');
            expect(typeof responseBody.error).toBe('string');
        });

        test('should return 400 for invalid amount type in checkout request', async () => {
            const invalidRequest = { ...validPaymentRequest, amount: 'not-a-number' };
            const response = await apiHelper.post('/api/checkout', invalidRequest);
            expect(response.status()).toBe(400);

            const responseBody = await response.json();
            expect(responseBody).toHaveProperty('error');
            expect(typeof responseBody.error).toBe('string');
        });
    });

    test.describe('Validate Card API', () => {
        test('should validate a valid card number successfully', async () => {
            const response = await apiHelper.post('/api/validate-card', { cardNumber: '4242424242424241' }); // Valid Luhn number
            expect(response.status()).toBe(200);

            const responseBody = await response.json();
            expect(responseBody).toHaveProperty('valid');
            expect(typeof responseBody.valid).toBe('boolean');
            expect(responseBody.valid).toBe(true);
            expect(responseBody).toHaveProperty('message');
            expect(typeof responseBody.message).toBe('string');
        });

        test('should return 200 with valid: false for an invalid Luhn card number', async () => {
            const response = await apiHelper.post('/api/validate-card', { cardNumber: '4242424242424242' }); // Invalid Luhn number (example in swagger is not Luhn valid)
            expect(response.status()).toBe(200);

            const responseBody = await response.json();
            expect(responseBody).toHaveProperty('valid');
            expect(typeof responseBody.valid).toBe('boolean');
            expect(responseBody.valid).toBe(false);
            expect(responseBody).toHaveProperty('message');
            expect(typeof responseBody.message).toBe('string');
        });

        test('should return 400 for missing cardNumber in validate card request', async () => {
            const response = await apiHelper.post('/api/validate-card', {});
            expect(response.status()).toBe(400);

            const responseBody = await response.json();
            expect(responseBody).toHaveProperty('error');
            expect(typeof responseBody.error).toBe('string');
        });
    });

    test.describe('Validate Email API', () => {
        test('should validate a valid email successfully', async () => {
            const response = await apiHelper.post('/api/validate-email', { email: 'test@example.com' });
            expect(response.status()).toBe(200);

            const responseBody = await response.json();
            expect(responseBody).toHaveProperty('valid');
            expect(typeof responseBody.valid).toBe('boolean');
            expect(responseBody.valid).toBe(true);
            expect(responseBody).toHaveProperty('message');
            expect(typeof responseBody.message).toBe('string');
        });

        test('should return 400 for missing email in validate email request', async () => {
            const response = await apiHelper.post('/api/validate-email', {});
            expect(response.status()).toBe(400);

            const responseBody = await response.json();
            expect(responseBody).toHaveProperty('error');
            expect(typeof responseBody.error).toBe('string');
        });

        test('should return 500 for an internal server error due to invalid email format', async () => {
            // According to GEMINI.md, /api/validate-email returns 500 as a "soft fail" for certain scenarios.
            // This test simulates a case where the backend might return a 500 for a malformed email that passes basic schema validation.
            const response = await apiHelper.post('/api/validate-email', { email: 'invalid-email-format' });
            expect(response.status()).toBe(500);

            const responseBody = await response.json();
            expect(responseBody).toHaveProperty('error');
            expect(typeof responseBody.error).toBe('string');
        });
    });
});
