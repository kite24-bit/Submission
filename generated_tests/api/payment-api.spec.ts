import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Payment API Tests', () => {
    let api: ApiHelper;

    test.beforeEach(async ({ request }) => {
        api = new ApiHelper(request);
    });

    // GET /api/health
    test('should return healthy status for /api/health (happy path)', async () => {
        const response = await api.get('/api/health');
        const json = await api.validateAndGetJson(response, 200);
        expect(json.status).toBe('healthy');
        expect(json.message).toBe('Server is running');
    });

    // POST /api/checkout
    test('should process payment successfully for /api/checkout (happy path)', async () => {
        const paymentDetails = {
            amount: 100,
            cardNumber: '4242 4242 4242 4242',
            cvv: '123',
            expiry: '12/26',
        };
        const response = await api.post('/api/checkout', paymentDetails);
        const json = await api.validateAndGetJson(response, 200);
        expect(json.status).toBe('success');
        expect(json.message).toBe('Payment processed successfully!');
    });

    test('should return 400 for invalid payment details on /api/checkout (negative test)', async () => {
        const invalidPaymentDetails = {
            amount: 100,
            cardNumber: 'invalid-card',
            cvv: '123',
            expiry: '12/26',
        };
        const response = await api.post('/api/checkout', invalidPaymentDetails);
        const json = await api.validateAndGetJson(response, 400);
        expect(json.error).toBeDefined();
        expect(json.error).toContain('Invalid card number'); // Assuming a specific error message
    });

    // POST /api/validate-card
    test('should validate a valid card number for /api/validate-card (happy path)', async () => {
        const cardRequest = { cardNumber: '4242424242424242' };
        const response = await api.post('/api/validate-card', cardRequest);
        const json = await api.validateAndGetJson(response, 200);
        expect(json.valid).toBe(true);
        expect(json.message).toBe('Card number is valid');
    });

    test('should return 400 for an invalid card number on /api/validate-card (negative test)', async () => {
        const invalidCardRequest = { cardNumber: '12345' };
        const response = await api.post('/api/validate-card', invalidCardRequest);
        const json = await api.validateAndGetJson(response, 400);
        expect(json.valid).toBe(false);
        expect(json.message).toBe('Invalid card number');
    });

    // POST /api/validate-email
    test('should validate a valid email address for /api/validate-email (happy path)', async () => {
        const emailRequest = { email: 'test@example.com' };
        const response = await api.post('/api/validate-email', emailRequest);
        const json = await api.validateAndGetJson(response, 200);
        expect(json.valid).toBe(true);
        expect(json.message).toBe('Email is valid');
    });

    test('should return 500 for an invalid email address on /api/validate-email (negative test)', async () => {
        const invalidEmailRequest = { email: 'invalid-email' };
        const response = await api.post('/api/validate-email', invalidEmailRequest);
        const json = await api.validateAndGetJson(response, 500); // As per swagger, 500 for invalid format
        expect(json.error).toBeDefined();
        expect(json.error).toContain('Invalid email format'); // Assuming a specific error message
    });
});
