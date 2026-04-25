import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Payment API Tests', () => {
    let apiHelper: ApiHelper;

    test.beforeEach(async ({ request }) => {
        apiHelper = new ApiHelper(request);
    });

    test.describe('GET /api/health', () => {
        test('should return health status', async () => {
            const response = await apiHelper.get('/api/health');
            const body = await apiHelper.validateAndGetJson(response, 200);

            // Schema-aware assertions
            expect(body).toHaveProperty('status');
            expect(typeof body.status).toBe('string');
            expect(body.status).toBe('healthy');

            expect(body).toHaveProperty('message');
            expect(typeof body.message).toBe('string');
        });
    });

    test.describe('POST /api/checkout', () => {
        test('should process payment successfully with valid details', async () => {
            const payload = {
                cardNumber: '4242 4242 4242 4242',
                cvv: '123',
                expiry: '12/26',
                amount: 100
            };

            const response = await apiHelper.post('/api/checkout', payload);
            const body = await apiHelper.validateAndGetJson(response, 200);

            // Schema-aware assertions
            expect(body).toHaveProperty('status');
            expect(typeof body.status).toBe('string');
            expect(body.status).toBe('success');

            expect(body).toHaveProperty('message');
            expect(typeof body.message).toBe('string');
        });

        test('should return 400 for invalid payment details', async () => {
            const payload = {
                cardNumber: 'invalid',
                cvv: '12',
                expiry: '99/99',
                amount: -1
            };

            const response = await apiHelper.post('/api/checkout', payload);
            const body = await apiHelper.validateAndGetJson(response, 400);

            // Schema-aware assertions
            expect(body).toHaveProperty('error');
            expect(typeof body.error).toBe('string');
        });
    });

    test.describe('POST /api/validate-card', () => {
        test('should return valid true for a valid card number', async () => {
            const payload = { cardNumber: '4242424242424242' };

            const response = await apiHelper.post('/api/validate-card', payload);
            const body = await apiHelper.validateAndGetJson(response, 200);

            // Schema-aware assertions
            expect(body).toHaveProperty('valid');
            expect(typeof body.valid).toBe('boolean');
            expect(body.valid).toBe(true);

            expect(body).toHaveProperty('message');
            expect(typeof body.message).toBe('string');
        });

        test('should return valid false for an invalid card number', async () => {
            const payload = { cardNumber: '4242424242424241' }; // Fails Luhn

            const response = await apiHelper.post('/api/validate-card', payload);
            const body = await apiHelper.validateAndGetJson(response, 200);

            expect(body).toHaveProperty('valid');
            expect(typeof body.valid).toBe('boolean');
            expect(body.valid).toBe(false);
        });

        test('should return 400 for malformed card request', async () => {
            const payload = { invalidField: 'test' };

            const response = await apiHelper.post('/api/validate-card', payload);
            const body = await apiHelper.validateAndGetJson(response, 400);

            expect(body).toHaveProperty('error');
            expect(typeof body.error).toBe('string');
        });
    });

    test.describe('POST /api/validate-email', () => {
        test('should return valid true for a valid email', async () => {
            const payload = { email: 'test@example.com' };

            const response = await apiHelper.post('/api/validate-email', payload);
            const body = await apiHelper.validateAndGetJson(response, 200);

            // Schema-aware assertions
            expect(body).toHaveProperty('valid');
            expect(typeof body.valid).toBe('boolean');
            expect(body.valid).toBe(true);

            expect(body).toHaveProperty('message');
            expect(typeof body.message).toBe('string');
        });

        test('should return valid false for an invalid email format', async () => {
            const payload = { email: 'invalid-email' };

            const response = await apiHelper.post('/api/validate-email', payload);
            const body = await apiHelper.validateAndGetJson(response, 200);

            expect(body).toHaveProperty('valid');
            expect(typeof body.valid).toBe('boolean');
            expect(body.valid).toBe(false);
        });

        test('should return 500 when email contains "fail"', async () => {
            // Testing the 500 error case mentioned in swagger and GEMINI.md
            const payload = { email: 'fail@example.com' };

            const response = await apiHelper.post('/api/validate-email', payload);
            const body = await apiHelper.validateAndGetJson(response, 500);

            expect(body).toHaveProperty('error');
            expect(typeof body.error).toBe('string');
        });
    });
});
