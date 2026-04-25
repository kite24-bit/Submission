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


## Playwright Config (JANGAN MODIFIKASI playwright_template/)

- `api-tests` project → `baseURL = STAGING_API_URL` → pakai relative path `/api/health`
- `chromium` project  → `baseURL = STAGING_BASE_URL` → pakai `page.goto('/')`
- Import `ApiHelper` dari `../../utils/api-helper`
- Framework: `@playwright/test` ONLY

