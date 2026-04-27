# AI-Powered Test Generation with Gemini + Playwright

This project uses **Google Gemini** (via Gemini CLI Workflows) to automatically generate and run **Playwright** tests — both API and E2E — as part of a CI/CD pipeline enforced on the `main` branch.

---

## Table of Contents

1. [LLM Prompt Design](#1-llm-prompt-design)
2. [How Swagger is Translated into Playwright Tests](#2-how-swagger-is-translated-into-playwright-tests)
3. [How the Generation Process Works](#3-how-the-generation-process-works)
4. [How CI Gates Production](#4-how-ci-gates-production)
5. [How This Approach Scales to Many Endpoints](#5-how-this-approach-scales-to-many-endpoints)
6. [Preventing & Detecting Hallucinated AI-Generated Tests](#6-preventing--detecting-hallucinated-ai-generated-tests)
7. [Handling Flaky or Unstable Tests](#7-handling-flaky-or-unstable-tests)
8. [How LLM Generates E2E Selectors & Ensures Stability](#8-how-llm-generates-e2e-selectors--ensures-stability)
9. [How Flaky Frontend Tests Are Prevented](#9-how-flaky-frontend-tests-are-prevented)
10. [Secret & Environment Variable Injection](#10-secret--environment-variable-injection)

---

## 1. LLM Prompt Design

Gemini CLI workflows are used to drive test generation. There are two separate prompt commands, each with a specific role:

### API Test Prompt
📄 [`generate-api-tests.toml`](https://github.com/kite24-bit/Submission/blob/main/.gemini/commands/generate-api-tests.toml)

Instructs Gemini to act as a senior Playwright automation tester. It reads `swagger.json` and `api-helper.ts` in a single command, then generates a complete TypeScript API test file covering all endpoints and schema definitions. Every field in the response schema is asserted by type, and the output is saved directly to `generated_tests/api/payment-api.spec.ts`.

### E2E Test Prompt
📄 [`generate-e2e-tests.toml`](https://github.com/kite24-bit/Submission/blob/main/.gemini/commands/generate-e2e-tests.toml)

Instructs Gemini to act as a senior Playwright automation tester. It reads `page.tsx`, `main.go`, and `test-utils.ts` together before writing any test code. Gemini derives all behavior — input formatting, API responses, submission conditions — directly from source files. The output is exactly 3 tests (1 happy path + 2 negative cases) saved to `generated_tests/web/checkout-e2e.spec.ts`.

---

## 2. How Swagger is Translated into Playwright Tests

The API test prompt instructs Gemini to read `swagger.json` directly and build tests based on the actual specification — no assumptions, no guesswork.

From the Swagger file, Gemini extracts:

- **All available endpoints** — every path and HTTP method defined in the spec
- **Input parameters** — request body schemas, query params, and path variables
- **Response schemas** — the expected structure and field types for each response

Gemini then generates schema-aware assertions using `typeof` checks on every field in the response definition. This means if the Swagger says a field is a `string`, the test will assert `typeof field === 'string'` — not just that it exists.

The `ApiHelper` utility from `api-helper.ts` is used as the base helper for all HTTP calls, ensuring consistent request setup across tests.

---

## 3. How the Generation Process Works

Test generation is triggered automatically by the CI workflow under the following conditions:

| Trigger | Description |
|---|---|
| **Source file hash change** | Any change to app files (frontend or API code) causes a new generation run |
| **Prompt file change** | Any change to `.gemini/commands/*.toml` triggers regeneration |
| **No generated tests found** | If `generated_tests/` is empty, generation runs automatically |
| **Manual force via PR title** | Adding `/regenerate-tests` to a Pull Request title forces a full regeneration |

If **none** of these conditions are met, the workflow skips generation and uses the existing files in `generated_tests/` to run tests directly. This avoids unnecessary Gemini calls on every run and keeps CI fast.

---

## 4. How CI Gates Production

The `main` branch is protected with **required status checks** enforced through branch protection rules:

- Every change to `main` must go through a **Pull Request** — direct pushes are blocked
- The PR can only be merged if all **status checks pass**
- If any check fails, the merge is **blocked** — even manual merges are prevented by GitHub's branch rules

This means broken tests don't just flag a warning — they physically prevent bad code from reaching production.

---

## 5. How This Approach Scales to Many Endpoints

Because the API test generation is driven entirely by `swagger.json`, the number of endpoints is not a limiting factor. Gemini reads the entire file and generates tests for every path defined in it — whether there are 5 endpoints or 50.

The quality and correctness of generated tests are directly tied to the quality of the Swagger file itself. A well-structured, accurate Swagger spec results in well-structured, accurate tests. This makes keeping the Swagger file up-to-date a first-class concern for the team.

---

## 6. Preventing & Detecting Hallucinated AI-Generated Tests

The prompts are designed to push Gemini toward objective, source-grounded reasoning rather than assumption-based generation. Key strategies used:

**Source-first instruction** — Both prompts explicitly tell Gemini to read all relevant files before writing a single line of test code. No test value, message, or behavior may be assumed.

**Strict derivation rule** — The E2E prompt includes the explicit constraint: `Never assume — derive everything directly from source files`. This is applied to selectors, input values, and assertions alike.

**Real app assertions only** — Tests assert against actual strings rendered in the DOM (derived from `main.go`) and actual API responses. There are no assertions against values that Gemini guessed or invented.

**No mocking allowed** — The E2E prompt explicitly forbids `page.route()` for mocking, forcing tests to run against real app behavior and catch real failures.

**Role constraints** — Additional role constraints are layered into the prompts to keep Gemini's output consistent and within expected patterns.

---

## 7. Handling Flaky or Unstable Tests

Flakiness in async-heavy test environments typically comes from tests that don't wait correctly for state to settle. This project addresses it the same way mature automation frameworks do — using proper async waiting instead of fixed timeouts.

In frameworks like Flutter Gherkin, flaky tests often occur when screens continuously refresh state (e.g. via BLoC). Certain driver functions that bypass UI stability checks must be avoided in favor of ones that wait properly. Playwright has equivalent mechanisms, and the tests in this project are generated to use Playwright's built-in async wait patterns — `waitFor`, response awaiting via `TestUtils`, and action-triggered network waits — rather than hardcoded `sleep` or `timeout` calls.

---

## 8. How LLM Generates E2E Selectors & Ensures Stability

Selectors in generated E2E tests are derived directly from source code, not guessed.

**Source-derived selectors** — The prompt instructs Gemini to read `page.tsx` and select elements based on attributes that actually exist in the HTML output. The rule `Never assume — derive everything directly from source files` applies to selector choice as much as it applies to values and assertions.

**Constrained selector syntax** — The prompt enforces specific selector patterns. For example, text assertions must use `getByText()` with a unique substring, and `div:has-text()` is explicitly forbidden. This prevents the use of fragile or over-broad selectors.

**Role constraints** — Additional output constraints are layered in to keep selector strategy consistent across generated tests and reduce the chance of Gemini reverting to fragile patterns.

---

## 9. How Flaky Frontend Tests Are Prevented

Several prompt rules work together to produce stable, race-condition-resistant frontend tests:

**Network-aware waiting via `TestUtils`** — The rule `Use TestUtils from test-utils.ts` ensures Gemini generates tests using the shared helper for all network calls. There are no fixed timeouts — tests wait until the actual network response arrives before asserting.

**Input values matched to formatted state** — The rule `Input values must match what the input actually contains after onChange formatting` prevents mismatches between what is typed and what the input actually holds after formatting transforms are applied.

**Assertions grounded in real API responses** — Combining `Never assume — derive everything from source` with reading `main.go` gives Gemini knowledge of the exact strings rendered in the DOM. Assertions are never made against strings that don't exist in the UI.

**Final state assertions only** — The rule `Assert only what is explicitly rendered in the DOM` prevents Gemini from asserting on transient states like loading spinners or intermediate processing messages — the most common source of timing-related flakiness.

---

## 10. Secret & Environment Variable Injection

All sensitive credentials are stored as **GitHub Actions repository secrets** and injected at runtime — nothing is hardcoded in the codebase.

### GitHub Repository Secrets

The following secrets are configured under **Settings → Secrets and variables → Actions**:

| Secret Name | Purpose |
|---|---|
| `PERSONAL_GEMINI_TOKEN` | Authenticates the Gemini CLI workflow (used for `gemini_api_key`) |
| `API_SECRET_KEY` | Secret key for authenticating against the application API |
| `STAGING_API_URL` | Base URL of the staging API used during test runs |
| `STAGING_BASE_URL` | Base URL of the staging frontend used for E2E tests |
| `TEST_USERNAME` | Test account username for E2E login scenarios |
| `TEST_PASSWORD` | Test account password for E2E login scenarios |
| `CHECKOUT_TOKEN` | Token used for checkout-related API interactions |

### How Secrets Are Injected in CI

**Gemini CLI authentication** is injected directly in the workflow step using the `with` block:

```yaml
with:
  gemini_api_key: ${{ secrets.PERSONAL_GEMINI_TOKEN }}
```

**The `.env` file** for Playwright is generated dynamically during the CI run. The workflow copies `.env.example` as a base and overwrites it with values pulled from GitHub Secrets:

```yaml
- name: Generate .env
  working-directory: playwright_template
  run: |
    cp .env.example .env
    cat <<EOF > .env

    TEST_ENV=staging

    API_SECRET_KEY=${{ secrets.API_SECRET_KEY }}
    STAGING_API_URL=${{ secrets.STAGING_API_URL }}

    STAGING_BASE_URL=${{ secrets.STAGING_BASE_URL }}

    TEST_USERNAME=${{ secrets.TEST_USERNAME }}
    TEST_PASSWORD=${{ secrets.TEST_PASSWORD }}

    HEADLESS=true
    TIMEOUT=30000

    GENERATE_REPORT=true
    TAKE_SCREENSHOTS=true
    RECORD_VIDEOS=false
    ENABLE_TRACING=false
    EOF
```

This means the `.env` file is **never committed to the repository**. It is created fresh on every CI run using values that only GitHub Actions can access at runtime.

### Running Locally

To run tests locally, create a `.env` file manually inside the `playwright_template/` directory based on `.env.example`, then fill in the values yourself:

```bash
cp playwright_template/.env.example playwright_template/.env
# Then edit .env and fill in your local values
```

> ⚠️ Never commit your local `.env` file. It is listed in `.gitignore`.
