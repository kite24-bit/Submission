# Project Context for Gemini CLI

Monorepo dengan 3 subfolder utama:

```
application_code/      ← source aplikasi (Go API + Next.js frontend)
playwright_template/   ← template Playwright asli (jangan dimodifikasi)
generated_test/        ← tempat test hasil generate ditulis
```

## Application URLs (saat CI jalan)

- Go API backend:   `http://localhost:8080`
- Next.js frontend: `http://localhost:3000`

## API Endpoints

| Method | Path                | Request Body                          | Success Response                         | Error |
|--------|---------------------|---------------------------------------|------------------------------------------|-------|
| GET    | /api/health         | —                                     | `{ status: "healthy", message: string }` | —     |
| POST   | /api/checkout       | `{ cardNumber, cvv, expiry, amount }` | `{ status: "success", message: string }` | 400   |
| POST   | /api/validate-card  | `{ cardNumber: string }`              | `{ valid: bool, message: string }`       | 400   |
| POST   | /api/validate-email | `{ email: string }`                   | `{ valid: bool, message: string }`       | 500   |

## Frontend Form Fields

Gunakan `[name="fieldName"]` — JANGAN CSS class selector.

| Field      | Selector              | Behavior                                                           |
|------------|-----------------------|--------------------------------------------------------------------|
| email      | `[name="email"]`      | Async validation blur → /api/validate-email (500 = soft fail)     |
| cardNumber | `[name="cardNumber"]` | Auto-format spasi. Luhn check blur → /api/validate-card           |
| expiry     | `[name="expiry"]`     | Auto-format MM/YY                                                  |
| cvv        | `[name="cvv"]`        | type="password"                                                    |
| amount     | `[name="amount"]`     | type="number"                                                      |
| submit     | `[type="submit"]`     | Disabled kalau cardValid === false                                 |

## Playwright Config (JANGAN MODIFIKASI playwright_template/)

- `api-tests` project → `baseURL = STAGING_API_URL` → pakai relative path `/api/health`
- `chromium` project  → `baseURL = STAGING_BASE_URL` → pakai `page.goto('/')`
- Import `ApiHelper` dari `../../utils/api-helper`
- Framework: `@playwright/test` ONLY

## Output Path untuk Generated Tests

- API tests → `generated_test/api/payment-api.spec.ts`
- E2E tests → `generated_test/web/checkout-e2e.spec.ts`

## Rules (wajib diikuti semua generated tests)

1. No `test.skip()` di mana pun
2. No `waitForTimeout()` lebih dari 3000ms — pakai `page.waitForResponse()` untuk async
3. Semua skenario fully implemented — tidak ada stub atau placeholder
4. Output ONLY valid TypeScript — tidak ada markdown fences di dalam file
5. Schema-aware assertions: cek nama field DAN tipe sesuai swagger definitions
