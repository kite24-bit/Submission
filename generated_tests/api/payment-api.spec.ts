
import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

// Define interfaces based on swagger definitions
interface PaymentRequest {
    amount: number;
    cardNumber: string;
    cvv: string;
    expiry: string;
}

interface PaymentResponse {
    message: string;
    status: string;
}

interface CardRequest {
    cardNumber: string;
}

interface CardResponse {
    message: string;
    valid: boolean;
}

interface EmailRequest {
    email: string;
}

interface EmailResponse {
    message: string;
    valid: boolean;
}

interface ErrorResponse {
    error: string;
}

interface HealthResponse {
    message: string;
    status: string;
}

test.describe('Payment API', () => {
    let apiHelper: ApiHelper;

    test.beforeEach(async ({ request }) => {
        // Assuming the API base URL is set in playwright.config.ts for "api-tests"
        // If not, you might need to explicitly set it here or in ApiHelper constructor
        apiHelper = new ApiHelper(request);
    });

    test('GET /api/health - Should return API health status', async ({ request }) => {
        const healthResponse = await apiHelper.get('/api/health');
        const responseBody = await apiHelper.validateAndGetJson(healthResponse, 200) as HealthResponse;

        expect(responseBody.status).toBeDefined();
        expect(typeof responseBody.status).toBe('string');
        expect(responseBody.message).toBeDefined();
        expect(typeof responseBody.message).toBe('string');
    });

    test('POST /api/validate-card - Should validate a card number', async ({ request }) => {
        const cardRequest: CardRequest = {
            cardNumber: '4242424242424242',
        };
        const cardResponse = await apiHelper.post('/api/validate-card', cardRequest);
        const responseBody = await apiHelper.validateAndGetJson(cardResponse, 200) as CardResponse;

        expect(responseBody.valid).toBeDefined();
        expect(typeof responseBody.valid).toBe('boolean');
        expect(responseBody.message).toBeDefined();
        expect(typeof responseBody.message).toBe('string');
    });

    test('POST /api/validate-card - Should return error for invalid card number', async ({ request }) => {
        const cardRequest: CardRequest = {
            cardNumber: 'invalid-card-number',
        };
        const cardResponse = await apiHelper.post('/api/validate-card', cardRequest);
        const responseBody = await apiHelper.validateAndGetJson(cardResponse, 400) as ErrorResponse;

        expect(responseBody.error).toBeDefined();
        expect(typeof responseBody.error).toBe('string');
    });

    test('POST /api/validate-email - Should validate an email address', async ({ request }) => {
        const emailRequest: EmailRequest = {
            email: 'user@example.com',
        };
        const emailResponse = await apiHelper.post('/api/validate-email', emailRequest);
        const responseBody = await apiHelper.validateAndGetJson(emailResponse, 200) as EmailResponse;

        expect(responseBody.valid).toBeDefined();
        expect(typeof responseBody.valid).toBe('boolean');
        expect(responseBody.message).toBeDefined();
        expect(typeof responseBody.message).toBe('string');
    });

    test('POST /api/validate-email - Should return error for invalid email address', async ({ request }) => {
        const emailRequest: EmailRequest = {
            email: 'invalid-email',
        };
        const emailResponse = await apiHelper.post('/api/validate-email', emailRequest);
        const responseBody = await apiHelper.validateAndGetJson(emailResponse, 500) as ErrorResponse; // Assuming 500 for invalid format based on swagger

        expect(responseBody.error).toBeDefined();
        expect(typeof responseBody.error).toBe('string');
    });

    test('POST /api/checkout - Should process a payment successfully', async ({ request }) => {
        const paymentRequest: PaymentRequest = {
            amount: 50,
            cardNumber: '4242 4242 4242 4242', // Note: spaces might need to be removed or handled based on actual API expectations
            cvv: '123',
            expiry: '12/26',
        };
        const paymentResponse = await apiHelper.post('/api/checkout', paymentRequest);
        const responseBody = await apiHelper.validateAndGetJson(paymentResponse, 200) as PaymentResponse;

        expect(responseBody.status).toBeDefined();
        expect(typeof responseBody.status).toBe('string');
        expect(responseBody.message).toBeDefined();
        expect(typeof responseBody.message).toBe('string');
    });

    test('POST /api/checkout - Should return error for invalid payment details', async ({ request }) => {
        const paymentRequest: PaymentRequest = {
            amount: -50, // Invalid amount
            cardNumber: 'invalid-card',
            cvv: '123',
            expiry: '12/26',
        };
        const paymentResponse = await apiHelper.post('/api/checkout', paymentRequest);
        const responseBody = await apiHelper.validateAndGetJson(paymentResponse, 400) as ErrorResponse;

        expect(responseBody.error).toBeDefined();
        expect(typeof responseBody.error).toBe('string');
    });
});
