# APIHUB UI auto-tests (Playwright)

Playwright-based test project for APIHUB UI:

- Portal UI E2E tests (`--project=Portal`)
- ADV smoke-style checks (`ADV-operations`, `ADV-comparisons`)
- Cleanup project (`--project=Cleanup`)

## Quick start

### Prerequisites

- Playwright system deps: see [Playwright system requirements](https://playwright.dev/docs/intro#system-requirements)
- Node.js + npm

### Install

```Shell
npm ci
```

```Shell
npx playwright install
```

### Configure environment

`.env` is supported (recommended for local runs).

Minimum required variables:

- `BASE_URL`
- `TEST_USER_PASSWORD`

### Run Portal E2E

```Shell
npx playwright test --project=Portal
```

## Documentation map (project-local)

### Core rules

- [AGENTS.md](AGENTS.md) — mandatory workflow for AI agents (IAP, PRE-FLIGHT/POST-FLIGHT, verification rules)
- [.eslintrc.json](.eslintrc.json) — lint rules (TypeScript + Playwright)

### Engineering guidelines

- [docs/CODING_GUIDELINES.md](docs/CODING_GUIDELINES.md) — canonical conventions (test structure, assertions, TDM, POM, locator strategy)
- [docs/pom-in-practice.md](docs/pom-in-practice.md) — real POM patterns + examples
- [docs/localhost-run.md](docs/localhost-run.md) — localhost/proxy specifics

### AI-specific instruction set

All playbooks and checklists live under:

- [docs/ai-instructions/](docs/ai-instructions/)
  - [task-playbooks.md](docs/ai-instructions/task-playbooks.md)
  - [preflight-checklists.md](docs/ai-instructions/preflight-checklists.md)
  - [test-implementation-guide.md](docs/ai-instructions/test-implementation-guide.md)
  - [technical-design-guide.md](docs/ai-instructions/technical-design-guide.md)
  - [test-strategy-guide.md](docs/ai-instructions/test-strategy-guide.md)
  - [feature-analysis-guide.md](docs/ai-instructions/feature-analysis-guide.md)

### Feature artifacts colocated with suites

Some suites keep their feature-overview / POM instructions / test-plan in an `artifacts/` subfolder next to the spec.

Example (API Quality):

- [src/tests/portal/00-serial/15-api-quality/artifacts/](src/tests/portal/00-serial/15-api-quality/artifacts/)

## Environment variables

### Required

| Variable           | Meaning                     |
| ------------------ | --------------------------- |
| BASE_URL           | Test environment base URL   |
| TEST_USER_PASSWORD | Password used by test users |

### Required only for localhost modes

| Variable                | Meaning                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| PLAYGROUND_BACKEND_HOST | Backend host used for localhost Playground tests (see [docs/localhost-run.md](docs/localhost-run.md))          |
| DEV_PROXY_MODE          | When `true`, skip tests that cannot run in dev proxy mode (see [docs/localhost-run.md](docs/localhost-run.md)) |

### Optional

| Variable          | Meaning                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| TICKET_SYSTEM_URL | Adds interactivity to links to test cases and issues                             |
| AUTH              | Auth management (`skip` to reuse stored auth state; otherwise auth is performed) |
| CREATE_TD         | Test data creation (`all`, `skip`, or default behavior)                          |
| CLEAR_TD          | Test data deletion (`all`, `skip`, or default behavior)                          |
| TEST_ID_R         | Reusable test data id (4 chars); auto-generated if unset                         |
| TEST_ID_N         | Non-reusable test data id (4 chars); auto-generated if unset                     |
| ADV_FILE          | Filename with URLs for `ADV-operations` and `ADV-comparisons` projects           |

## Running tests

### Common commands

```Shell
npx playwright test --project=Portal
```

```Shell
npx playwright test --project=Portal --last-failed
```

```Shell
npx playwright test --project=Portal --headed --trace=on
```

### HTML report

```Shell
npx playwright show-report reports/playwright
```

More options:

- [Playwright test CLI](https://playwright.dev/docs/test-cli)
- [Running and debugging tests](https://playwright.dev/docs/running-tests)

### Handy Playwright flags

- `--headed` — run headed browsers
- `--debug` — open Playwright Inspector
- `--workers <n>` — configure parallelism
- `--trace <mode>` — `on`, `off`, `on-first-retry`, `on-all-retries`, `retain-on-failure`
- `--grep <regex>` — run only matching tests (matches project + file + describe + test title + tags)
