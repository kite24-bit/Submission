import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';

const swaggerSpec = {
    "swagger": "2.0",
    "info": {
        "description": "A simple payment processing API with validation endpoints",
        "title": "Payment API",
        "contact": {},
        "version": "1.0"
    },
    "host": "localhost:8080",
    "basePath": "/",
    "paths": {
        "/api/checkout": {
            "post": {
                "description": "Process a payment with card details (mock implementation)",
                "consumes": [
                    "application/json"
                ],
                "produces": [
                    "application/json"
                ],
                "tags": [
                    "payment"
                ],
                "summary": "Process payment checkout",
                "parameters": [
                    {
                        "description": "Payment details",
                        "name": "payment",
                        "in": "body",
                        "required": true,
                        "schema": {
                            "$ref": "#/definitions/main.PaymentRequest"
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "description": "OK",
                        "schema": {
                            "$ref": "#/definitions/main.PaymentResponse"
                        }
                    },
                    "400": {
                        "description": "Bad Request",
                        "schema": {
                            "$ref": "#/definitions/main.ErrorResponse"
                        }
                    }
                }
            }
        },
        "/api/health": {
            "get": {
                "description": "Returns the health status of the API",
                "produces": [
                    "application/json"
                ],
                "tags": [
                    "health"
                ],
                "summary": "Health check",
                "responses": {
                    "200": {
                        "description": "OK",
                        "schema": {
                            "$ref": "#/definitions/main.HealthResponse"
                        }
                    }
                }
            }
        },
        "/api/validate-card": {
            "post": {
                "description": "Validates credit card number using Luhn algorithm",
                "consumes": [
                    "application/json"
                ],
                "produces": [
                    "application/json"
                ],
                "tags": [
                    "validation"
                ],
                "summary": "Validate card number",
                "parameters": [
                    {
                        "description": "Card number to validate",
                        "name": "card",
                        "in": "body",
                        "required": true,
                        "schema": {
                            "$ref": "#/definitions/main.CardRequest"
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "description": "OK",
                        "schema": {
                            "$ref": "#/definitions/main.CardResponse"
                        }
                    },
                    "400": {
                        "description": "Bad Request",
                        "schema": {
                            "$ref": "#/definitions/main.ErrorResponse"
                        }
                    }
                }
            }
        },
        "/api/validate-email": {
            "post": {
                "description": "Validates email address format",
                "consumes": [
                    "application/json"
                ],
                "produces": [
                    "application/json"
                ],
                "tags": [
                    "validation"
                ],
                "summary": "Validate email address",
                "parameters": [
                    {
                        "description": "Email to validate",
                        "name": "email",
                        "in": "body",
                        "required": true,
                        "schema": {
                            "$ref": "#/definitions/main.EmailRequest"
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "description": "OK",
                        "schema": {
                            "$ref": "#/definitions/main.EmailResponse"
                        }
                    },
                    "500": {
                        "description": "Internal Server Error",
                        "schema": {
                            "$ref": "#/definitions/main.ErrorResponse"
                        }
                    }
                }
            }
        }
    },
    "definitions": {
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
        },
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
        }
    }
};

function validateSchema(data: any, schema: any, definitions: any) {
    if (schema.type === "object") {
        expect(typeof data).toBe("object");
        if (schema.properties) {
            for (const key in schema.properties) {
                const propertySchema = schema.properties[key];
                if (propertySchema.$ref) {
                    const refPath = propertySchema.$ref.replace("#/definitions/", "");
                    validateSchema(data[key], definitions[refPath], definitions);
                } else {
                    expect(typeof data[key]).toBe(propertySchema.type);
                }
            }
        }
    } else if (schema.type === "array") {
        expect(Array.isArray(data)).toBe(true);
        if (schema.items && data.length > 0) {
            const itemSchema = schema.items;
            if (itemSchema.$ref) {
                const refPath = itemSchema.$ref.replace("#/definitions/", "");
                data.forEach((item: any) => validateSchema(item, definitions[refPath], definitions));
            } else {
                data.forEach((item: any) => expect(typeof item).toBe(itemSchema.type));
            }
        }
    } else {
        expect(typeof data).toBe(schema.type);
    }
}

test.describe('Payment API Endpoints', () => {
    let apiHelper: ApiHelper;

    test.beforeEach(async ({ request }) => {
        apiHelper = new ApiHelper(request);
    });

    // /api/checkout POST
    test('should process a payment with valid card details', async () => {
        const requestBody = {
            amount: 100,
            cardNumber: "4242424242424242",
            cvv: "123",
            expiry: "12/26"
        };
        const response = await apiHelper.post('/api/checkout', requestBody);
        const jsonResponse = await apiHelper.validateAndGetJson(response, 200);

        const schema = swaggerSpec.definitions["main.PaymentResponse"];
        validateSchema(jsonResponse, schema, swaggerSpec.definitions);
    });

    test('should return 400 for invalid payment details', async () => {
        const requestBody = {
            amount: -100, // Invalid amount
            cardNumber: "123", // Invalid card number
            cvv: "12",   // Invalid CVV
            expiry: "12/20" // Expired card
        };
        const response = await apiHelper.post('/api/checkout', requestBody);
        const jsonResponse = await apiHelper.validateAndGetJson(response, 400);

        const schema = swaggerSpec.definitions["main.ErrorResponse"];
        validateSchema(jsonResponse, schema, swaggerSpec.definitions);
    });

    // /api/health GET
    test('should return health status', async () => {
        const response = await apiHelper.get('/api/health');
        const jsonResponse = await apiHelper.validateAndGetJson(response, 200);

        const schema = swaggerSpec.definitions["main.HealthResponse"];
        validateSchema(jsonResponse, schema, swaggerSpec.definitions);
    });

    // /api/validate-card POST
    test('should validate a card number', async () => {
        const requestBody = {
            cardNumber: "4242424242424242"
        };
        const response = await apiHelper.post('/api/validate-card', requestBody);
        const jsonResponse = await apiHelper.validateAndGetJson(response, 200);

        const schema = swaggerSpec.definitions["main.CardResponse"];
        validateSchema(jsonResponse, schema, swaggerSpec.definitions);
    });

    test('should return 400 for an invalid card number', async () => {
        const requestBody = {
            cardNumber: "123" // Invalid card number
        };
        const response = await apiHelper.post('/api/validate-card', requestBody);
        const jsonResponse = await apiHelper.validateAndGetJson(response, 400);

        const schema = swaggerSpec.definitions["main.ErrorResponse"];
        validateSchema(jsonResponse, schema, swaggerSpec.definitions);
    });

    // /api/validate-email POST
    test('should validate an email address', async () => {
        const requestBody = {
            email: "test@example.com"
        };
        const response = await apiHelper.post('/api/validate-email', requestBody);
        const jsonResponse = await apiHelper.validateAndGetJson(response, 200);

        const schema = swaggerSpec.definitions["main.EmailResponse"];
        validateSchema(jsonResponse, schema, swaggerSpec.definitions);
    });

    test('should return 500 for an invalid email address format', async () => {
        const requestBody = {
            email: "invalid-email" // Invalid email format
        };
        const response = await apiHelper.post('/api/validate-email', requestBody);
        const jsonResponse = await apiHelper.validateAndGetJson(response, 500);

        const schema = swaggerSpec.definitions["main.ErrorResponse"];
        validateSchema(jsonResponse, schema, swaggerSpec.definitions);
    });
});
