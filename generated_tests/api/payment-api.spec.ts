import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

const schemas = {
    'main.CardRequest': {
        type: 'object',
        properties: {
            cardNumber: { type: 'string', example: '4242424242424242' },
        },
        required: ['cardNumber'],
    },
    'main.CardResponse': {
        type: 'object',
        properties: {
            message: { type: 'string', example: 'Card number is valid' },
            valid: { type: 'boolean', example: true },
        },
        required: ['message', 'valid'],
    },
    'main.EmailRequest': {
        type: 'object',
        properties: {
            email: { type: 'string', example: 'user@example.com' },
        },
        required: ['email'],
    },
    'main.EmailResponse': {
        type: 'object',
        properties: {
            message: { type: 'string', example: 'Email is valid' },
            valid: { type: 'boolean', example: true },
        },
        required: ['message', 'valid'],
    },
    'main.ErrorResponse': {
        type: 'object',
        properties: {
            error: { type: 'string', example: 'Internal server error' },
        },
        required: ['error'],
    },
    'main.HealthResponse': {
        type: 'object',
        properties: {
            message: { type: 'string', example: 'Server is running' },
            status: { type: 'string', example: 'healthy' },
        },
        required: ['message', 'status'],
    },
    'main.PaymentRequest': {
        type: 'object',
        properties: {
            amount: { type: 'number', example: 50 },
            cardNumber: { type: 'string', example: '4242 4242 4242 4242' },
            cvv: { type: 'string', example: '123' },
            expiry: { type: 'string', example: '12/26' },
        },
        required: ['amount', 'cardNumber', 'cvv', 'expiry'],
    },
    'main.PaymentResponse': {
        type: 'object',
        properties: {
            message: { type: 'string', example: 'Payment processed successfully!' },
            status: { type: 'string', example: 'success' },
        },
        required: ['message', 'status'],
    },
};

function assertSchema(data: any, schema: any, definitions: any) {
    if (schema.$ref) {
        const refName = schema.$ref.replace('#/definitions/', '');
        schema = definitions[refName];
    }

    expect(typeof data).toBe('object');
    expect(data).toBeDefined();

    for (const key in schema.properties) {
        const propertySchema = schema.properties[key];
        const value = data[key];

        if (schema.required && schema.required.includes(key)) {
            expect(value).toBeDefined();
        }

        if (propertySchema.$ref) {
            const refName = propertySchema.$ref.replace('#/definitions/', '');
            assertSchema(value, definitions[refName], definitions);
        } else if (propertySchema.type) {
            switch (propertySchema.type) {
                case 'string':
                    expect(typeof value).toBe('string');
                    break;
                case 'number':
                    expect(typeof value).toBe('number');
                    break;
                case 'boolean':
                    expect(typeof value).toBe('boolean');
                    break;
                case 'object':
                    expect(typeof value).toBe('object');
                    break;
                // Add more types as needed
                default:
                    console.warn(`Unknown schema type: ${propertySchema.type}`);
            }
        }
    }
}

test.describe('Payment API E2E Tests', () => {
    let apiHelper: ApiHelper;

    test.beforeEach(async ({ request }) => {
        apiHelper = new ApiHelper(request);
    });

    test('should return health status', async () => {
        const response = await apiHelper.get('/api/health');
        const json = await apiHelper.validateAndGetJson(response, 200);

        assertSchema(json, schemas['main.HealthResponse'], schemas);
    });

    test('should process payment checkout successfully', async () => {
        const paymentRequest = {
            amount: 100,
            cardNumber: '4242424242424242',
            cvv: '123',
            expiry: '12/26',
        };
        const response = await apiHelper.post('/api/checkout', paymentRequest);
        const json = await apiHelper.validateAndGetJson(response, 200);

        assertSchema(json, schemas['main.PaymentResponse'], schemas);
    });

    test('should return 400 for invalid payment checkout', async () => {
        const invalidPaymentRequest = {
            amount: -100, // Invalid amount
            cardNumber: 'invalid',
            cvv: '123',
            expiry: '12/26',
        };
        const response = await apiHelper.post('/api/checkout', invalidPaymentRequest);
        const json = await apiHelper.validateAndGetJson(response, 400);

        assertSchema(json, schemas['main.ErrorResponse'], schemas);
    });

    test('should validate card number successfully', async () => {
        const cardRequest = {
            cardNumber: '4242424242424242',
        };
        const response = await apiHelper.post('/api/validate-card', cardRequest);
        const json = await apiHelper.validateAndGetJson(response, 200);

        assertSchema(json, schemas['main.CardResponse'], schemas);
        expect(json.valid).toBe(true);
    });

    test('should return 400 for invalid card number', async () => {
        const invalidCardRequest = {
            cardNumber: '123', // Invalid card number
        };
        const response = await apiHelper.post('/api/validate-card', invalidCardRequest);
        const json = await apiHelper.validateAndGetJson(response, 400);

        assertSchema(json, schemas['main.ErrorResponse'], schemas);
    });

    test('should validate email successfully', async () => {
        const emailRequest = {
            email: 'test@example.com',
        };
        const response = await apiHelper.post('/api/validate-email', emailRequest);
        const json = await apiHelper.validateAndGetJson(response, 200);

        assertSchema(json, schemas['main.EmailResponse'], schemas);
        expect(json.valid).toBe(true);
    });

    test('should return 500 for invalid email (mocked 500)', async () => {
        // Assuming an invalid email format could trigger a 500 or 400 depending on backend validation
        // Based on swagger, 500 is possible. Let's send a malformed email to trigger it, if possible.
        const invalidEmailRequest = {
            email: 'invalid-email',
        };
        const response = await apiHelper.post('/api/validate-email', invalidEmailRequest);
        const json = await apiHelper.validateAndGetJson(response, 500); // Expecting 500 based on swagger

        assertSchema(json, schemas['main.ErrorResponse'], schemas);
    });
});
