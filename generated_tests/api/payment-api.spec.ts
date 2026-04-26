
import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

// Helper function to validate response schema
function validateSchema(data: any, schema: any) {
    for (const key in schema.properties) {
        if (schema.properties.hasOwnProperty(key)) {
            const expectedType = schema.properties[key].type;
            // Handle optional properties that might not be present
            if (data[key] === undefined && !schema.properties[key].required) {
                continue;
            }
            switch (expectedType) {
                case 'string':
                    expect(typeof data[key]).toBe('string');
                    break;
                case 'number':
                    expect(typeof data[key]).toBe('number');
                    break;
                case 'boolean':
                    expect(typeof data[key]).toBe('boolean');
                    break;
                case 'object':
                    expect(typeof data[key]).toBe('object');
                    // Recursively validate nested objects if schema is available
                    if (schema.properties[key]['$ref']) {
                        // This would require a more complex schema resolution logic
                        // For simplicity, we are only validating the top-level type here
                    }
                    break;
                default:
                    // Handle other types or log a warning for unhandled types
                    console.warn(`Unhandled schema type: ${expectedType} for key: ${key}`);
            }
        }
    }
}

const schemas = {
    'main.CardRequest': {
        type: 'object',
        properties: { cardNumber: { type: 'string', example: '4242424242424242' } },
    },
    'main.CardResponse': {
        type: 'object',
        properties: {
            message: { type: 'string', example: 'Card number is valid' },
            valid: { type: 'boolean', example: true },
        },
    },
    'main.EmailRequest': {
        type: 'object',
        properties: { email: { type: 'string', example: 'user@example.com' } },
    },
    'main.EmailResponse': {
        type: 'object',
        properties: {
            message: { type: 'string', example: 'Email is valid' },
            valid: { type: 'boolean', example: true },
        },
    },
    'main.ErrorResponse': {
        type: 'object',
        properties: { error: { type: 'string', example: 'Internal server error' } },
    },
    'main.HealthResponse': {
        type: 'object',
        properties: {
            message: { type: 'string', example: 'Server is running' },
            status: { type: 'string', example: 'healthy' },
        },
    },
    'main.PaymentRequest': {
        type: 'object',
        properties: {
            amount: { type: 'number', example: 50 },
            cardNumber: { type: 'string', example: '4242 4242 4242 4242' },
            cvv: { type: 'string', example: '123' },
            expiry: { type: 'string', example: '12/26' },
        },
    },
    'main.PaymentResponse': {
        type: 'object',
        properties: {
            message: { type: 'string', example: 'Payment processed successfully!' },
            status: { type: 'string', example: 'success' },
        },
    },
};

test.describe('Payment API Tests', () => {
    let apiHelper: ApiHelper;

    test.beforeEach(async ({ request }) => {
        apiHelper = new ApiHelper(request);
    });

    test('GET /api/health - should return health status', async () => {
        const response = await apiHelper.get('/api/health');
        const json = await apiHelper.validateAndGetJson(response, 200);
        validateSchema(json, schemas['main.HealthResponse']);
    });

    test('POST /api/checkout - should process a valid payment', async () => {
        const paymentRequest = {
            cardNumber: '4242424242424242',
            expiry: '12/26',
            cvv: '123',
            amount: 100,
        };
        const response = await apiHelper.post('/api/checkout', paymentRequest);
        const json = await apiHelper.validateAndGetJson(response, 200);
        validateSchema(json, schemas['main.PaymentResponse']);
    });

    test('POST /api/checkout - should return 400 for invalid payment', async () => {
        const invalidPaymentRequest = {
            cardNumber: '123',
            expiry: '12/26',
            cvv: '123',
            amount: 100,
        };
        const response = await apiHelper.post('/api/checkout', invalidPaymentRequest);
        const json = await apiHelper.validateAndGetJson(response, 400);
        validateSchema(json, schemas['main.ErrorResponse']);
    });

    test('POST /api/validate-card - should validate a valid card number', async () => {
        const cardRequest = { cardNumber: '4242424242424242' };
        const response = await apiHelper.post('/api/validate-card', cardRequest);
        const json = await apiHelper.validateAndGetJson(response, 200);
        validateSchema(json, schemas['main.CardResponse']);
    });

    test('POST /api/validate-card - should return 400 for an invalid card number', async () => {
        const invalidCardRequest = { cardNumber: '123' };
        const response = await apiHelper.post('/api/validate-card', invalidCardRequest);
        const json = await apiHelper.validateAndGetJson(response, 400);
        validateSchema(json, schemas['main.ErrorResponse']);
    });

    test('POST /api/validate-email - should validate a valid email address', async () => {
        const emailRequest = { email: 'test@example.com' };
        const response = await apiHelper.post('/api/validate-email', emailRequest);
        const json = await apiHelper.validateAndGetJson(response, 200);
        validateSchema(json, schemas['main.EmailResponse']);
    });

    test('POST /api/validate-email - should return 500 for an invalid email address', async () => {
        const invalidEmailRequest = { email: 'invalid-email' };
        const response = await apiHelper.post('/api/validate-email', invalidEmailRequest);
        const json = await apiHelper.validateAndGetJson(response, 500);
        validateSchema(json, schemas['main.ErrorResponse']);
    });
});
