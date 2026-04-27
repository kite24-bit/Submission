import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

test.describe('Payment API', () => {
    let apiHelper: ApiHelper;

    test.beforeEach(async ({ request }) => {
        apiHelper = new ApiHelper(request);
    });

    test('GET /api/health - Health check', async () => {
        const response = await apiHelper.get('/api/health');
        const body = await apiHelper.validateAndGetJson(response, 200);

        // Schema validation: main.HealthResponse
        expect(typeof body.message).toBe('string');
        expect(typeof body.status).toBe('string');
    });

    test('POST /api/checkout - Process payment checkout', async () => {
        const payload = {
            amount: 50,
            cardNumber: '4242 4242 4242 4242',
            cvv: '123',
            expiry: '12/26'
        };

        const response = await apiHelper.post('/api/checkout', payload);
        const body = await apiHelper.validateAndGetJson(response, 200);

        // Schema validation: main.PaymentResponse
        expect(typeof body.message).toBe('string');
        expect(typeof body.status).toBe('string');
    });

    test('POST /api/checkout - Bad Request (invalid data)', async () => {
        const payload = {
            amount: "invalid_amount", // Should be a number
        };

        const response = await apiHelper.post('/api/checkout', payload);
        const body = await apiHelper.validateAndGetJson(response, 400);

        // Schema validation: main.ErrorResponse
        expect(typeof body.error).toBe('string');
    });

    test('POST /api/validate-card - Validate card number', async () => {
        const payload = {
            cardNumber: '4242424242424242'
        };

        const response = await apiHelper.post('/api/validate-card', payload);
        const body = await apiHelper.validateAndGetJson(response, 200);

        // Schema validation: main.CardResponse
        expect(typeof body.message).toBe('string');
        expect(typeof body.valid).toBe('boolean');
    });

    test('POST /api/validate-card - Bad Request', async () => {
        const payload = {}; // Missing cardNumber

        const response = await apiHelper.post('/api/validate-card', payload);
        const body = await apiHelper.validateAndGetJson(response, 400);

        // Schema validation: main.ErrorResponse
        expect(typeof body.error).toBe('string');
    });

    test('POST /api/validate-email - Validate email address', async () => {
        const payload = {
            email: 'user@example.com'
        };

        const response = await apiHelper.post('/api/validate-email', payload);
        const body = await apiHelper.validateAndGetJson(response, 200);

        // Schema validation: main.EmailResponse
        expect(typeof body.message).toBe('string');
        expect(typeof body.valid).toBe('boolean');
    });

    test('POST /api/validate-email - Internal Server Error (example)', async () => {
        // This test assumes an empty or invalid email might trigger an error response as per swagger
        const payload = {
            email: ''
        };

        const response = await apiHelper.post('/api/validate-email', payload);
        
        // Swagger says 500 for EmailResponse error case
        if (response.status() === 500) {
            const body = await response.json();
            // Schema validation: main.ErrorResponse
            expect(typeof body.error).toBe('string');
        } else {
            // If it returns 200 even for empty email
            const body = await response.json();
            expect(typeof body.message).toBe('string');
            expect(typeof body.valid).toBe('boolean');
        }
    });
});
