import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../playwright_template/utils/api-helper';

test.describe('Payment API Tests', () => {
    let apiHelper: ApiHelper;

    test.beforeEach(async ({ request }) => {
        apiHelper = new ApiHelper(request);
    });

    test('GET /api/health - should return a healthy status', async () => {
        const response = await apiHelper.get('/api/health');
        expect(response.status()).toBe(200);
        const json = await response.json();
        expect(json).toEqual(expect.objectContaining({
            status: 'healthy',
            message: expect.any(String),
        }));
    });

    test.describe('POST /api/checkout', () => {
        const validPaymentRequest = {
            cardNumber: '4242424242424242',
            cvv: '123',
            expiry: '12/26',
            amount: 50
        };

        test('should process a valid payment', async () => {
            const response = await apiHelper.post('/api/checkout', validPaymentRequest);
            expect(response.status()).toBe(200);
            const json = await response.json();
            expect(json).toEqual(expect.objectContaining({
                status: 'success',
                message: expect.any(String),
            }));
        });

        test('should return 400 for missing cardNumber', async () => {
            const invalidRequest = { ...validPaymentRequest, cardNumber: undefined };
            const response = await apiHelper.post('/api/checkout', invalidRequest);
            expect(response.status()).toBe(400);
            const json = await response.json();
            expect(json).toEqual(expect.objectContaining({
                error: expect.any(String),
            }));
        });

        test('should return 400 for missing cvv', async () => {
            const invalidRequest = { ...validPaymentRequest, cvv: undefined };
            const response = await apiHelper.post('/api/checkout', invalidRequest);
            expect(response.status()).toBe(400);
            const json = await response.json();
            expect(json).toEqual(expect.objectContaining({
                error: expect.any(String),
            }));
        });

        test('should return 400 for missing expiry', async () => {
            const invalidRequest = { ...validPaymentRequest, expiry: undefined };
            const response = await apiHelper.post('/api/checkout', invalidRequest);
            expect(response.status()).toBe(400);
            const json = await response.json();
            expect(json).toEqual(expect.objectContaining({
                error: expect.any(String),
            }));
        });

        test('should return 400 for missing amount', async () => {
            const invalidRequest = { ...validPaymentRequest, amount: undefined };
            const response = await apiHelper.post('/api/checkout', invalidRequest);
            expect(response.status()).toBe(400);
            const json = await response.json();
            expect(json).toEqual(expect.objectContaining({
                error: expect.any(String),
            }));
        });

        test('should return 400 for invalid amount type', async () => {
            const invalidRequest = { ...validPaymentRequest, amount: 'fifty' }; // Should be number
            const response = await apiHelper.post('/api/checkout', invalidRequest);
            expect(response.status()).toBe(400);
            const json = await response.json();
            expect(json).toEqual(expect.objectContaining({
                error: expect.any(String),
            }));
        });
    });

    test.describe('POST /api/validate-card', () => {
        test('should validate a correct card number', async () => {
            const response = await apiHelper.post('/api/validate-card', { cardNumber: '4242424242424242' });
            expect(response.status()).toBe(200);
            const json = await response.json();
            expect(json).toEqual(expect.objectContaining({
                valid: true,
                message: expect.any(String),
            }));
        });

        test('should invalidate an incorrect card number (Luhn check fail)', async () => {
            const response = await apiHelper.post('/api/validate-card', { cardNumber: '4242424242424241' }); // Invalid Luhn
            expect(response.status()).toBe(200); // API returns 200 with valid: false for Luhn check failure
            const json = await response.json();
            expect(json).toEqual(expect.objectContaining({
                valid: false,
                message: expect.any(String),
            }));
        });

        test('should return 400 for missing cardNumber', async () => {
            const response = await apiHelper.post('/api/validate-card', { cardNumber: undefined });
            expect(response.status()).toBe(400);
            const json = await response.json();
            expect(json).toEqual(expect.objectContaining({
                error: expect.any(String),
            }));
        });

        test('should return 400 for invalid cardNumber format (e.g., non-string)', async () => {
            const response = await apiHelper.post('/api/validate-card', { cardNumber: 1234567890123456 });
            expect(response.status()).toBe(400);
            const json = await response.json();
            expect(json).toEqual(expect.objectContaining({
                error: expect.any(String),
            }));
        });
    });

    test.describe('POST /api/validate-email', () => {
        test('should validate a correct email address', async () => {
            const response = await apiHelper.post('/api/validate-email', { email: 'test@example.com' });
            expect(response.status()).toBe(200);
            const json = await response.json();
            expect(json).toEqual(expect.objectContaining({
                valid: true,
                message: expect.any(String),
            }));
        });

        test('should invalidate an incorrect email address format', async () => {
            const response = await apiHelper.post('/api/validate-email', { email: 'invalid-email' });
            expect(response.status()).toBe(200); // API returns 200 with valid: false for format validation
            const json = await response.json();
            expect(json).toEqual(expect.objectContaining({
                valid: false,
                message: expect.any(String),
            }));
        });

        test('should return 400 for missing email', async () => {
            const response = await apiHelper.post('/api/validate-email', { email: undefined });
            expect(response.status()).toBe(400);
            const json = await response.json();
            expect(json).toEqual(expect.objectContaining({
                error: expect.any(String),
            }));
        });

        test('should handle server error (500) gracefully for /api/validate-email', async () => {
            // As per GEMINI.md, 500 for validate-email is a "soft fail".
            // To simulate a 500, we'll send an empty email, which should trigger an internal error.
            // The actual behavior might depend on the server implementation for this specific invalid input.
            // The expectation here is that the test will not fail due to a 500 response, but rather correctly
            // assert on the 500 status and the expected error response schema.
            const response = await apiHelper.post('/api/validate-email', { email: '' });
            expect(response.status()).toBe(500);
            const json = await response.json();
            expect(json).toEqual(expect.objectContaining({
                error: expect.any(String),
            }));
        });
    });
});
