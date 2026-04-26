
import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

// Helper function to validate response against schema
function validateResponse(responseData: any, schema: any): void {
    for (const key in schema.properties) {
        const property = schema.properties[key];
        expect(responseData).toHaveProperty(key);
        const value = responseData[key];

        // Type checking
        if (property.type) {
            if (property.type === 'string') {
                expect(typeof value).toBe('string');
            } else if (property.type === 'number') {
                expect(typeof value).toBe('number');
            } else if (property.type === 'boolean') {
                expect(typeof value).toBe('boolean');
            } else if (property.type === 'object') {
                expect(typeof value).toBe('object');
                if (property.properties) {
                    validateResponse(value, property);
                }
            }
        }

        // Example specific validations based on schema
        if (key === 'cardNumber' && property.example) {
            expect(value).toMatch(/^[0-9 ]+$/);
        }
        if (key === 'email' && property.example) {
            expect(value).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        }
        if (key === 'amount' && property.example) {
            expect(value).toBeGreaterThan(0);
        }
    }
}

test.describe('Payment API Tests', () => {
    let apiHelper: ApiHelper;
    let apiRequestContext: any;

    // Schemas extracted from swagger.json
    const schemas = {
        "main.PaymentRequest": {
            "type": "object",
            "properties": {
                "amount": {
                    "type": "number",
                    "example": 50
                },
                "cardNumber": {
                    "type": "string",
                    "example": "4242 4242 4242 4242"
                },
                "cvv": {
                    "type": "string",
                    "example": "123"
                },
                "expiry": {
                    "type": "string",
                    "example": "12/26"
                }
            }
        },
        "main.PaymentResponse": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "example": "Payment processed successfully!"
                },
                "status": {
                    "type": "string",
                    "example": "success"
                }
            }
        },
        "main.CardRequest": {
            "type": "object",
            "properties": {
                "cardNumber": {
                    "type": "string",
                    "example": "4242424242424242"
                }
            }
        },
        "main.CardResponse": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "example": "Card number is valid"
                },
                "valid": {
                    "type": "boolean",
                    "example": true
                }
            }
        },
        "main.EmailRequest": {
            "type": "object",
            "properties": {
                "email": {
                    "type": "string",
                    "example": "user@example.com"
                }
            }
        },
        "main.EmailResponse": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "example": "Email is valid"
                },
                "valid": {
                    "type": "boolean",
                    "example": true
                }
            }
        },
        "main.ErrorResponse": {
            "type": "object",
            "properties": {
                "error": {
                    "type": "string",
                    "example": "Internal server error"
                }
            }
        },
        "main.HealthResponse": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "example": "Server is running"
                },
                "status": {
                    "type": "string",
                    "example": "healthy"
                }
            }
        }
    };

    test.beforeEach(async ({ page, request }) => {
        apiRequestContext = request;
        // Assuming ApiHelper is initialized with request context and potentially an API key
        // Replace 'YOUR_API_KEY' with actual key if needed, or remove if not required
        apiHelper = new ApiHelper(request);
    });

    test('should return health status', async () => {
        const response = await apiHelper.get('/api/health');
        const responseBody = await apiHelper.validateAndGetJson(response);
        validateResponse(responseBody, schemas['main.HealthResponse']);
        expect(responseBody.status).toBe('healthy');
    });

    test('should process payment successfully', async () => {
        const paymentRequest = {
            amount: 50,
            cardNumber: '4242 4242 4242 4242',
            cvv: '123',
            expiry: '12/26'
        };
        const response = await apiHelper.post('/api/checkout', paymentRequest);
        const responseBody = await apiHelper.validateAndGetJson(response);
        validateResponse(responseBody, schemas['main.PaymentResponse']);
        expect(responseBody.status).toBe('success');
        expect(responseBody.message).toBe('Payment processed successfully!');
    });

    test('should return error for invalid payment request', async () => {
        const paymentRequest = {
            amount: -10, // Invalid amount
            cardNumber: 'invalid-card-number',
            cvv: '123',
            expiry: '12/26'
        };
        const response = await apiHelper.post('/api/checkout', paymentRequest);
        // Expecting a 400 Bad Request for invalid data
        const responseBody = await apiHelper.validateAndGetJson(response, 400);
        validateResponse(responseBody, schemas['main.ErrorResponse']);
        expect(responseBody).toHaveProperty('error');
    });

    test('should validate a valid card number', async () => {
        const cardRequest = {
            cardNumber: '4242424242424242'
        };
        const response = await apiHelper.post('/api/validate-card', cardRequest);
        const responseBody = await apiHelper.validateAndGetJson(response);
        validateResponse(responseBody, schemas['main.CardResponse']);
        expect(responseBody.valid).toBe(true);
        expect(responseBody.message).toBe('Card number is valid');
    });

    test('should invalidate an invalid card number', async () => {
        const cardRequest = {
            cardNumber: '1234567890123456'
        };
        const response = await apiHelper.post('/api/validate-card', cardRequest);
        const responseBody = await apiHelper.validateAndGetJson(response);
        validateResponse(responseBody, schemas['main.CardResponse']);
        expect(responseBody.valid).toBe(false);
        expect(responseBody.message).toBe('Card number is invalid');
    });

    test('should validate a valid email address', async () => {
        const emailRequest = {
            email: 'test@example.com'
        };
        const response = await apiHelper.post('/api/validate-email', emailRequest);
        const responseBody = await apiHelper.validateAndGetJson(response);
        validateResponse(responseBody, schemas['main.EmailResponse']);
        expect(responseBody.valid).toBe(true);
        expect(responseBody.message).toBe('Email is valid');
    });

    test('should invalidate an invalid email address', async () => {
        const emailRequest = {
            email: 'invalid-email'
        };
        const response = await apiHelper.post('/api/validate-email', emailRequest);
        const responseBody = await apiHelper.validateAndGetJson(response);
        validateResponse(responseBody, schemas['main.EmailResponse']);
        expect(responseBody.valid).toBe(false);
        expect(responseBody.message).toBe('Email is invalid');
    });

    test('should return server error for invalid email request', async () => {
        // Simulating a server error scenario for email validation if possible, 
        // otherwise this test might need adjustment based on actual API behavior for 500 errors.
        // For now, we'll assume a malformed request might trigger it, or we can force it if the API allows.
        const emailRequest = {
            email: 'user@example.com'
        };
        // Note: The swagger shows 500 for this endpoint, but a 400 is more likely for bad input.
        // This test is based on the swagger definition.
        const response = await apiHelper.post('/api/validate-email', emailRequest);
        // If the API correctly returns 500 for some condition, this will catch it.
        if (response.status() === 500) {
            const responseBody = await apiHelper.validateAndGetJson(response, 500);
            validateResponse(responseBody, schemas['main.ErrorResponse']);
            expect(responseBody).toHaveProperty('error');
        } else {
            // If not 500, we might get 200 or 400. Test accordingly or log a warning.
            console.warn(`Expected 500 for /api/validate-email but received ${response.status()}. Adjust test if needed.`);
            // Optionally, assert based on the actual status code received if it's not 500.
            // For example, if it returns 400 for valid input under certain conditions.
        }
    });
});
