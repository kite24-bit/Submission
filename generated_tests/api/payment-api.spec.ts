import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Payment API Tests', () => {
    let apiHelper: ApiHelper;

    test.beforeEach(async ({ request }) => {
        apiHelper = new ApiHelper(request);
    });

    /**
     * Scenario: Health Check
     * Validates that the API is up and running.
     */
    test('GET /api/health should return healthy status', async () => {
        const response = await apiHelper.get('/api/health');
        const body = await apiHelper.validateAndGetJson(response, 200);

        // Schema validation
        expect(body).toHaveProperty('status');
        expect(body).toHaveProperty('message');
        expect(typeof body.status).toBe('string');
        expect(typeof body.message).toBe('string');
        
        // Value validation
        expect(body.status).toBe('healthy');
    });

    /**
     * Scenario: Process payment checkout (Valid)
     * Validates that a payment can be processed with correct data.
     */
    test('POST /api/checkout should process payment successfully with valid data', async () => {
        const payload = {
            cardNumber: '4242 4242 4242 4242',
            cvv: '123',
            expiry: '12/26',
            amount: 50.0
        };

        const response = await apiHelper.post('/api/checkout', payload);
        const body = await apiHelper.validateAndGetJson(response, 200);

        // Schema validation
        expect(body).toHaveProperty('status');
        expect(body).toHaveProperty('message');
        expect(typeof body.status).toBe('string');
        expect(typeof body.message).toBe('string');
        
        // Value validation
        expect(body.status).toBe('success');
    });

    /**
     * Scenario: Process payment checkout (Invalid Schema - Bad Type)
     * Validates that the API returns 400 Bad Request when field types are incorrect.
     */
    test('POST /api/checkout should return 400 for invalid amount type', async () => {
        const payload = {
            cardNumber: '4242 4242 4242 4242',
            cvv: '123',
            expiry: '12/26',
            amount: 'invalid_amount' // Should be a number
        };

        const response = await apiHelper.post('/api/checkout', payload);
        const body = await apiHelper.validateAndGetJson(response, 400);

        // Schema validation for ErrorResponse
        expect(body).toHaveProperty('error');
        expect(typeof body.error).toBe('string');
    });

    /**
     * Scenario: Process payment checkout (Missing Required Field)
     * Validates that the API handles missing mandatory fields.
     */
    test('POST /api/checkout should return 400 when cardNumber is missing', async () => {
        const payload = {
            cvv: '123',
            expiry: '12/26',
            amount: 100.0
        };

        const response = await apiHelper.post('/api/checkout', payload);
        const body = await apiHelper.validateAndGetJson(response, 400);

        expect(body).toHaveProperty('error');
        expect(typeof body.error).toBe('string');
    });

    /**
     * Scenario: Validate Card Number (Valid)
     * Validates that a correct card number is accepted.
     */
    test('POST /api/validate-card should return valid true for correct Luhn number', async () => {
        const payload = {
            cardNumber: '4242424242424242'
        };

        const response = await apiHelper.post('/api/validate-card', payload);
        const body = await apiHelper.validateAndGetJson(response, 200);

        // Schema validation
        expect(body).toHaveProperty('valid');
        expect(body).toHaveProperty('message');
        expect(typeof body.valid).toBe('boolean');
        expect(typeof body.message).toBe('string');
        
        expect(body.valid).toBe(true);
    });

    /**
     * Scenario: Validate Card Number (Invalid Logic)
     * Validates that an incorrect card number returns valid: false.
     */
    test('POST /api/validate-card should return valid false for invalid Luhn number', async () => {
        const payload = {
            cardNumber: '1234567812345670'
        };

        const response = await apiHelper.post('/api/validate-card', payload);
        const body = await apiHelper.validateAndGetJson(response, 200);

        expect(body.valid).toBe(false);
    });

    /**
     * Scenario: Validate Email (Valid)
     */
    test('POST /api/validate-email should return valid true for standard email format', async () => {
        const payload = {
            email: 'test.user@example.com'
        };

        const response = await apiHelper.post('/api/validate-email', payload);
        const body = await apiHelper.validateAndGetJson(response, 200);

        // Schema validation
        expect(body).toHaveProperty('valid');
        expect(body).toHaveProperty('message');
        expect(typeof body.valid).toBe('boolean');
        expect(typeof body.message).toBe('string');
        
        expect(body.valid).toBe(true);
    });

    /**
     * Scenario: Validate Email (Invalid - Soft Fail)
     * According to project rules, invalid email validation results in a 500 error.
     */
    test('POST /api/validate-email should return 500 for malformed email string', async () => {
        const payload = {
            email: 'not-an-email'
        };

        const response = await apiHelper.post('/api/validate-email', payload);
        const body = await apiHelper.validateAndGetJson(response, 500);

        // Schema validation for ErrorResponse
        expect(body).toHaveProperty('error');
        expect(typeof body.error).toBe('string');
    });
});
