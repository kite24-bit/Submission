import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../playwright_template/utils/api-helper';

test.describe('Payment API Tests', () => {
    let apiHelper: ApiHelper;

    test.beforeEach(async ({ request }) => {
        apiHelper = new ApiHelper(request);
    });

    test('GET /api/health should return a healthy status', async () => {
        const response = await apiHelper.get('/api/health');
        const jsonResponse = await apiHelper.validateAndGetJson(response, 200);

        // Schema-aware assertions for HealthResponse
        expect(jsonResponse).toHaveProperty('status');
        expect(typeof jsonResponse.status).toBe('string');
        expect(jsonResponse.status).toBe('healthy');

        expect(jsonResponse).toHaveProperty('message');
        expect(typeof jsonResponse.message).toBe('string');
        expect(jsonResponse.message).toContain('Server is running');
    });

    test('POST /api/validate-card should successfully validate a valid card number', async () => {
        const validCardNumber = { cardNumber: '4242424242424242' };
        const response = await apiHelper.post('/api/validate-card', validCardNumber);
        const jsonResponse = await apiHelper.validateAndGetJson(response, 200);

        // Schema-aware assertions for CardResponse
        expect(jsonResponse).toHaveProperty('valid');
        expect(typeof jsonResponse.valid).toBe('boolean');
        expect(jsonResponse.valid).toBe(true);

        expect(jsonResponse).toHaveProperty('message');
        expect(typeof jsonResponse.message).toBe('string');
        expect(jsonResponse.message).toContain('Card number is valid');
    });

    test('POST /api/validate-card should return 400 for an invalid card number', async () => {
        const invalidCardNumber = { cardNumber: '1234567890123456' }; // Invalid Luhn
        const response = await apiHelper.post('/api/validate-card', invalidCardNumber);
        const jsonResponse = await apiHelper.validateAndGetJson(response, 400);

        // Schema-aware assertions for ErrorResponse
        expect(jsonResponse).toHaveProperty('error');
        expect(typeof jsonResponse.error).toBe('string');
        expect(jsonResponse.error).toContain('Invalid card number');
    });

    test('POST /api/validate-card should return 400 for a missing card number', async () => {
        const missingCardNumber = {}; // Missing cardNumber
        const response = await apiHelper.post('/api/validate-card', missingCardNumber);
        const jsonResponse = await apiHelper.validateAndGetJson(response, 400);

        // Schema-aware assertions for ErrorResponse
        expect(jsonResponse).toHaveProperty('error');
        expect(typeof jsonResponse.error).toBe('string');
        expect(jsonResponse.error).toContain('Card number is required');
    });

    test('POST /api/validate-email should successfully validate a valid email address', async () => {
        const validEmail = { email: 'test@example.com' };
        const response = await apiHelper.post('/api/validate-email', validEmail);
        const jsonResponse = await apiHelper.validateAndGetJson(response, 200);

        // Schema-aware assertions for EmailResponse
        expect(jsonResponse).toHaveProperty('valid');
        expect(typeof jsonResponse.valid).toBe('boolean');
        expect(jsonResponse.valid).toBe(true);

        expect(jsonResponse).toHaveProperty('message');
        expect(typeof jsonResponse.message).toBe('string');
        expect(jsonResponse.message).toContain('Email is valid');
    });

    test('POST /api/validate-email should return 500 for an invalid email address (soft fail)', async () => {
        const invalidEmail = { email: 'invalid-email' };
        const response = await apiHelper.post('/api/validate-email', invalidEmail);
        const jsonResponse = await apiHelper.validateAndGetJson(response, 500);

        // Schema-aware assertions for ErrorResponse
        expect(jsonResponse).toHaveProperty('error');
        expect(typeof jsonResponse.error).toBe('string');
        expect(jsonResponse.error).toContain('Internal server error'); // As per GEMINI.md, 500 is a soft fail.
    });

    test('POST /api/checkout should successfully process a payment with valid details', async () => {
        const validPayment = {
            cardNumber: '4242424242424242',
            cvv: '123',
            expiry: '12/26',
            amount: 100,
        };
        const response = await apiHelper.post('/api/checkout', validPayment);
        const jsonResponse = await apiHelper.validateAndGetJson(response, 200);

        // Schema-aware assertions for PaymentResponse
        expect(jsonResponse).toHaveProperty('status');
        expect(typeof jsonResponse.status).toBe('string');
        expect(jsonResponse.status).toBe('success');

        expect(jsonResponse).toHaveProperty('message');
        expect(typeof jsonResponse.message).toBe('string');
        expect(jsonResponse.message).toContain('Payment processed successfully!');
    });

    test('POST /api/checkout should return 400 for invalid payment details (e.g., invalid card number)', async () => {
        const invalidPayment = {
            cardNumber: '1111111111111111', // Invalid card
            cvv: '123',
            expiry: '12/26',
            amount: 100,
        };
        const response = await apiHelper.post('/api/checkout', invalidPayment);
        const jsonResponse = await apiHelper.validateAndGetJson(response, 400);

        // Schema-aware assertions for ErrorResponse
        expect(jsonResponse).toHaveProperty('error');
        expect(typeof jsonResponse.error).toBe('string');
        expect(jsonResponse.error).toContain('Invalid card number');
    });

    test('POST /api/checkout should return 400 for missing payment details', async () => {
        const missingDetails = {
            cardNumber: '4242424242424242',
            // cvv: '123', // Missing cvv
            expiry: '12/26',
            amount: 100,
        };
        const response = await apiHelper.post('/api/checkout', missingDetails);
        const jsonResponse = await apiHelper.validateAndGetJson(response, 400);

        // Schema-aware assertions for ErrorResponse
        expect(jsonResponse).toHaveProperty('error');
        expect(typeof jsonResponse.error).toBe('string');
        expect(jsonResponse.error).toContain('CVV is required');
    });
});
