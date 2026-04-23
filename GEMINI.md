# Payment API — Playwright Test Project

This repo contains the automated test suite for a payment checkout application.

## Application URLs (in CI)
- Frontend (Next.js): `http://localhost:3000`
- Backend (Go API):   `http://localhost:8080`

## API Endpoints

| Method | Path                  | Request Body                                      | Success Response                            | Error Response           |
|--------|-----------------------|---------------------------------------------------|---------------------------------------------|--------------------------|
| GET    | /api/health           | —                                                 | `{ status: "healthy", message: string }`    | —                        |
| POST   | /api/checkout         | `{ cardNumber, cvv, expiry, amount }`             | `{ status: "success", message: string }`    | 400 `{ error: string }`  |
| POST   | /api/validate-card    | `{ cardNumber: string }`                          | `{ valid: bool, message: string }`          | 400 `{ error: string }`  |
| POST   | /api/validate-email   | `{ email: string }`                               | `{ valid: bool, message: string }`          | 500 `{ error: string }`  |

## Frontend Form Fields

Use `[name="fieldName"]` selectors — NEVER CSS class selectors (.btn, .text-green, etc.)

| Field      | Selector             | Behavior                                                                 |
|------------|----------------------|--------------------------------------------------------------------------|
| email      | `[name="email"]`     | Async validation on blur → POST /api/validate-email (500 = soft fail)   |
| cardNumber | `[name="cardNumber"]`| Auto-formats with spaces. Async Luhn check on blur → POST /api/validate-card |
| expiry     | `[name="expiry"]`    | Auto-formats as MM/YY                                                    |
| cvv        | `[name="cvv"]`       | type="password", 3-4 digits                                              |
| amount     | `[name="amount"]`    | type="number", min 0.01                                                  |
| submit     | `[type="submit"]`    | Submits → POST /api/checkout. Disabled when cardValid === false         |

## Playwright Project Config (DO NOT MODIFY playwright.config.ts)

- `api-tests` project: `baseURL = STAGING_API_URL` → use relative paths like `/api/health`
- `chromium` project:  `baseURL = STAGING_BASE_URL` → use `page.goto('/')`
- Import `ApiHelper` from `../../utils/api-helper`
- Framework: `@playwright/test` ONLY — never Jest, Mocha, Vitest

## Generated Test File Paths

- API tests → `generated_test/tests/api/payment-api.spec.ts`
- E2E tests → `generated_test/tests/web/checkout-e2e.spec.ts`

## Non-negotiable Test Rules

1. No `test.skip()` anywhere
2. No hardcoded `waitForTimeout` over 3000ms
3. Use `page.waitForResponse('**/api/validate-*')` for async blur validations
4. All scenarios must be fully implemented — no stubs or placeholders
5. Output ONLY valid TypeScript — no markdown fences in generated files
6. Schema-aware assertions: check both field name AND type per swagger definitions
