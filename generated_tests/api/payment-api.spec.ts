import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper'; // Assuming ApiHelper is in the correct path

// Define the base URL for the API tests from the Playwright config
const baseURL = 'http://localhost:8080'; // This should ideally be dynamically read from playwright.config.ts

// Define interfaces based on the swagger definition
interface PaymentRequest {
    cardNumber: string;
    cvv: string;
    expiry: string;
    amount: number;
}

interface PaymentResponse {
    status: string;
    message: string;
}

interface ErrorResponse {
    error: string;
}

interface CardRequest {
    cardNumber: string;
}

interface CardResponse {
    valid: boolean;
    message: string;
}

interface EmailRequest {
    email: string;
}

interface EmailResponse {
    valid: boolean;
    message: string;
}

interface HealthResponse {
    status: string;
    message: string;
}

test.describe('Payment API Tests', () => {
    let apiHelper: ApiHelper;

    test.beforeAll(async ({}) => {
        // It's better to read baseURL from environment if possible.
        // For now, hardcoding it based on project context.
        apiHelper = new ApiHelper(baseURL);
    });

    test.afterEach(async ({}) => {
        // No specific cleanup needed after each test for this API
    });

    // --- Health Check ---
    test('should return healthy status', async () => {
        const response = await apiHelper.get('/api/health');
        expect(response.status()).toBe(200);
        const responseBody = await response.json() as HealthResponse;
        expect(responseBody.status).toBe('healthy');
        expect(responseBody.message).toBe('Server is running');
    });

    // --- Card Validation ---
    test('should validate a valid card number', async () => {
        const cardRequest: CardRequest = { cardNumber: '4242424242424242' };
        const response = await apiHelper.post('/api/validate-card', cardRequest);
        expect(response.status()).toBe(200);
        const responseBody = await response.json() as CardResponse;
        expect(responseBody.valid).toBe(true);
        expect(responseBody.message).toBe('Card number is valid');
    });

    test('should invalidate an invalid card number', async () => {
        const cardRequest: CardRequest = { cardNumber: '123456789012345' }; // Too short for Luhn
        const response = await apiHelper.post('/api/validate-card', cardRequest);
        expect(response.status()).toBe(200);
        const responseBody = await response.json() as CardResponse;
        expect(responseBody.valid).toBe(false);
        expect(responseBody.message).toBe('Card number is invalid'); // Assuming this is the invalid message
    });

    test('should return bad request for missing card number', async () => {
        // Sending an empty object to simulate a missing cardNumber field
        const response = await apiHelper.post('/api/validate-card', {});
        expect(response.status()).toBe(400);
        const responseBody = await response.json() as ErrorResponse;
        expect(responseBody.error).toBe('Bad Request: Missing required field: cardNumber'); // Assuming error message format
    });

    // --- Email Validation ---
    test('should validate a valid email address', async () => {
        const emailRequest: EmailRequest = { email: 'user@example.com' };
        const response = await apiHelper.post('/api/validate-email', emailRequest);
        expect(response.status()).toBe(200);
        const responseBody = await response.json() as EmailResponse;
        expect(responseBody.valid).toBe(true);
        expect(responseBody.message).toBe('Email is valid');
    });

    test('should invalidate an invalid email address', async () => {
        const emailRequest: EmailRequest = { email: 'invalid-email' };
        const response = await apiHelper.post('/api/validate-email', emailRequest);
        expect(response.status()).toBe(200);
        const responseBody = await response.json() as EmailResponse;
        expect(responseBody.valid).toBe(false);
        expect(responseBody.message).toBe('Email is invalid'); // Assuming this is the invalid message
    });

    test('should return internal server error for invalid email format (or specific error)', async () => {
        // The swagger definition mentions 500 for /api/validate-email.
        // We will test for a scenario that might trigger this, or a schema violation.
        // For now, let's assume a malformed request body might lead to 500 or 400.
        // If the API strictly enforces schema and returns 400 for bad format, this test should be adjusted.
        // For now, let's test a malformed JSON body.
        const malformedRequest = '{ "email": "test@example.com", '; // Malformed JSON
        const response = await apiHelper.post('/api/validate-email', malformedRequest);
        // Expecting a 500 based on swagger, but 400 is also possible for bad request.
        // We will assert for 500, but acknowledge it might be 400.
        expect(response.status()).toBe(500);
        // If it returns 400, the error message below would be relevant:
        // expect(response.status()).toBe(400);
        // const responseBody = await response.json() as ErrorResponse;
        // expect(responseBody.error).toBe('Bad Request: Invalid JSON body');
    });


    // --- Checkout Scenarios ---
    test('should process a valid payment checkout', async () => {
        const paymentRequest: PaymentRequest = {
            cardNumber: '4242424242424242', // Valid card number
            cvv: '123',
            expiry: '12/26',
            amount: 50,
        };
        const response = await apiHelper.post('/api/checkout', paymentRequest);
        expect(response.status()).toBe(200);
        const responseBody = await response.json() as PaymentResponse;
        expect(responseBody.status).toBe('success');
        expect(responseBody.message).toBe('Payment processed successfully!');
    });

    test('should return bad request for checkout with invalid card number', async () => {
        const paymentRequest: PaymentRequest = {
            cardNumber: '123456789012345', // Invalid card number (Luhn check fail)
            cvv: '123',
            expiry: '12/26',
            amount: 50,
        };
        const response = await apiHelper.post('/api/checkout', paymentRequest);
        expect(response.status()).toBe(400);
        const responseBody = await response.json() as ErrorResponse;
        // Expecting an error related to card validation
        expect(responseBody.error).toContain('Card number is invalid');
    });

    test('should return bad request for checkout with missing required fields', async () => {
        // Missing amount, expiry, cvv, cardNumber
        const paymentRequest = {};
        const response = await apiHelper.post('/api/checkout', paymentRequest);
        expect(response.status()).toBe(400);
        const responseBody = await response.json() as ErrorResponse;
        // The exact error message might vary, but it should indicate missing fields.
        expect(responseBody.error).toContain('Bad Request: Missing required fields');
    });

    test('should return bad request for checkout with invalid amount (e.g., negative)', async () => {
        const paymentRequest: PaymentRequest = {
            cardNumber: '4242424242424242',
            cvv: '123',
            expiry: '12/26',
            amount: -50, // Invalid amount
        };
        const response = await apiHelper.post('/api/checkout', paymentRequest);
        expect(response.status()).toBe(400);
        const responseBody = await response.json() as ErrorResponse;
        expect(responseBody.error).toContain('Amount must be positive'); // Assuming error message format
    });

    test('should return bad request for checkout with invalid expiry date format', async () => {
        const paymentRequest: PaymentRequest = {
            cardNumber: '4242424242424242',
            cvv: '123',
            expiry: '26/12', // Invalid format
            amount: 50,
        };
        const response = await apiHelper.post('/api/checkout', paymentRequest);
        expect(response.status()).toBe(400);
        const responseBody = await response.json() as ErrorResponse;
        expect(responseBody.error).toContain('Invalid expiry date format'); // Assuming error message format
    });
});
