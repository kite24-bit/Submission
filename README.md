# AI Quality Gate — Gemini CLI + Playwright

Pipeline CI/CD yang menggunakan **`google-github-actions/run-gemini-cli`** dengan
pattern **`.gemini/commands/*.toml`** untuk generate Playwright tests secara otomatis,
kemudian menjalankannya sebagai quality gate di setiap PR.

---

## Cara Kerja

```
PR dibuka
    │
    ▼
Job 1: generate (ubuntu-latest)
    ├─ checkout test-repo  +  checkout application_code/
    │
    ├─ google-github-actions/run-gemini-cli
    │   prompt: '/generate-api-tests'
    │   └─ Gemini baca: GEMINI.md (auto)
    │                   .gemini/commands/generate-api-tests.toml
    │                   application_code/docs/swagger.yaml (via shell tool)
    │      → tulis: generated_test/tests/api/payment-api.spec.ts
    │
    ├─ google-github-actions/run-gemini-cli
    │   prompt: '/generate-e2e-tests'
    │   └─ Gemini baca: GEMINI.md (auto)
    │                   .gemini/commands/generate-e2e-tests.toml
    │                   application_code/app/page.tsx (via shell tool)
    │      → tulis: generated_test/tests/web/checkout-e2e.spec.ts
    │
    ├─ Validation guard (bash): cek file exist + valid TypeScript + min 20 lines
    └─ Upload artifact: generated_test/tests/
         │
         ▼
Job 2: run-tests (ubuntu-latest)
    ├─ Download artifact
    ├─ go build → ./api-server & (port 8080) + health check polling
    ├─ npm run build → npm run start & (port 3000) + health check polling
    ├─ npx playwright test --project=api-tests
    ├─ npx playwright test --project=chromium
    ├─ Upload HTML report + JUnit XML + screenshots (on failure)
    └─ Post PR comment
         │
         ▼
    PR ✅ pass atau ❌ blocked
```

---

## Struktur File

```
.
├── GEMINI.md                               ← Context project (dibaca otomatis Gemini CLI)
├── README.md
├── .env.example
├── .gitignore
│
├── .gemini/
│   └── commands/
│       ├── generate-api-tests.toml         ← Command: /generate-api-tests
│       └── generate-e2e-tests.toml         ← Command: /generate-e2e-tests
│
├── .github/
│   └── workflows/
│       └── quality-gate.yaml               ← CI pipeline
│
└── generated_test/                         ← Playwright project (template, UNMODIFIED)
    ├── playwright.config.ts
    ├── package.json
    ├── config/environment.ts
    ├── utils/api-helper.ts
    ├── page-objects/base-page.ts
    └── tests/
        ├── api/
        │   └── payment-api.spec.ts         ← Digenerate oleh /generate-api-tests
        └── web/
            └── checkout-e2e.spec.ts        ← Digenerate oleh /generate-e2e-tests
```

---

## Setup

### 1. GitHub Secrets
```
Repo → Settings → Secrets and variables → Actions → New repository secret

GEMINI_API_KEY   = <API key dari https://aistudio.google.com/apikey>
APP_REPO_TOKEN   = <GitHub PAT dengan repo:read scope, jika app repo private>
```

### 2. GitHub Variables
```
Repo → Settings → Secrets and variables → Actions → Variables tab

APP_REPO = owner/nama-repo-aplikasi
```

### 3. Buat PR → CI otomatis jalan

---

## Jalankan Lokal

```bash
# 1. Install Gemini CLI
npm install -g @google/gemini-cli

# 2. Set API key
export GEMINI_API_KEY=your-key-here

# 3. Start aplikasi (di terminal lain)
cd ../application_code
go run main.go &       # port 8080
npm run dev &          # port 3000

# 4. Generate tests via Gemini CLI commands
gemini '/generate-api-tests'
gemini '/generate-e2e-tests'

# 5. Run tests
cd generated_test
npm install
npx playwright install chromium --with-deps
npm test
```

---

## Kenapa Pakai .toml Commands?

Pattern `.gemini/commands/*.toml` adalah cara resmi Gemini CLI untuk mendefinisikan
custom commands yang bisa dipanggil dengan `/nama-command`.

Keuntungannya dibanding prompt inline di YAML:
- **Maintainable** — prompt ada di file tersendiri, YAML tetap bersih
- **Versioned** — perubahan prompt ter-track di git history
- **Reusable** — command yang sama bisa dipanggil lokal maupun di CI
- **Readable** — format TOML lebih mudah dibaca dan diedit

---

## Secret Handling

| Variable | Tipe | Cara inject |
|---|---|---|
| `GEMINI_API_KEY` | Secret | `gemini_api_key: ${{ secrets.GEMINI_API_KEY }}` di action |
| `APP_REPO_TOKEN` | Secret | `token:` di `actions/checkout` |
| `APP_REPO` | Variable (non-secret) | `${{ vars.APP_REPO }}` |

- `.env` ada di `.gitignore` — tidak pernah dicommit
- Tidak ada secret yang hardcode di source code maupun YAML
- `.gemini/` ada di `.gitignore` — credential file tidak dicommit

---

## LLM Prompt Design

### GEMINI.md — Project Context
Dibaca otomatis Gemini CLI di setiap run. Berisi:
- Tabel endpoint API dengan request/response schema
- Tabel form fields dengan selector yang benar
- Rules yang non-negotiable (no test.skip, no CSS selector, dll)

Dengan GEMINI.md, setiap `.toml` command tidak perlu mengulang konteks dasar —
cukup fokus ke instruksi spesifik untuk command tersebut.

### generate-api-tests.toml
- Instruksikan Gemini untuk `cat application_code/docs/swagger.yaml` sendiri
- Minta coverage semua 4 endpoint: happy path + negative case
- Schema-aware assertions dari swagger definitions

### generate-e2e-tests.toml
- Instruksikan Gemini untuk `cat application_code/app/page.tsx` sendiri
- 3 skenario spesifik: happy path, invalid card, email soft-fail
- Explicit behavior notes (soft-fail logic, disabled button condition)

---

## Mencegah Hallucination

1. **Validation guard** di CI: cek file exist, ada Playwright import, ada `test()`, min 20 lines
2. **GEMINI.md rules** yang eksplisit: no markdown fences, no test.skip, output path yang spesifik
3. **`.toml` context** minta Gemini `cat` file langsung — baca source of truth, bukan asumsi
4. **Generated files di-print** ke CI log — reviewer bisa inspect output Gemini
