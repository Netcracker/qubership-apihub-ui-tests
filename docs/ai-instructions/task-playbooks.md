# Agent Task Playbooks

Pick exactly one playbook that best matches the incoming request. Use it together with `docs/ai-instructions/preflight-checklists.md` (for checklist wording) and the Instruction Access Protocol defined in `docs/ai-instructions/README.md`.

## Task Matrix

| Task type                 | Typical triggers                                               | Mandatory docs (in addition to global set)                                                                                     | Focus areas                                                                                  |
| ------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| **Test Implementation**   | Playwright specs, fixtures, hooks, assertions                  | `docs/ai-instructions/test-implementation-guide.md`, `docs/CODING_GUIDELINES.md` (§ _Test Structure_)                                | `test.step()` usage, tags/annotations, run spec `--headed --trace=on`                        |
| **POM**                   | Create/update page objects or shared components                | `docs/CODING_GUIDELINES.md` (§ _Page Object Model_, _Locator Strategy_), `docs/pom-in-practice.md` (matching component family) | Component taxonomy, constructor signatures, base component reuse                             |
| **Test Data Management**  | Introduce/adjust data used by tests, move data closer to specs | `docs/CODING_GUIDELINES.md` (§ _Test Data Management_), relevant `src/tests/**` folders, existing data helpers                 | Keep data near consumers, decide `_N` vs `_R`, use hooks for setup/cleanup                   |
| **Test Support Services** | Edits inside `src/services/**`, shared utilities used by tests | Service-specific docs/README (if any), existing service implementations, `docs/CODING_GUIDELINES.md` (§ Code Organization)     | Avoid duplication, follow established service APIs, document side effects                    |
| **Documentation**         | Updates to Markdown/MDX/ADR/README/etc.                        | Target docs, embedded code standards (`docs/CODING_GUIDELINES.md`), lint/format policies                                       | Keep docs synced with behavior, validate fenced code samples with linters, ensure LF endings |
| **Misc / Utility**        | Config tweaks, doc-only edits, small refactors                 | `.eslintrc.json`, impacted files/config docs                                                                                   | Scope clarity, avoid collateral changes                                                      |

## Playbook Details

### Test Implementation

- **PRE-FLIGHT:** read the functional spec/story plus `docs/ai-instructions/test-implementation-guide.md`. Confirm availability of referenced POM components and test data.
- **Implementation:** follow the guide’s phase breakdown, use `test.step()` for contextual grouping, add annotations/tags, and mock backend state when required.
- **Verification:** lint each touched spec and run the spec with `npx playwright test <spec> --headed --trace=on`. Capture artifacts if failures occur.

### POM

- **PRE-FLIGHT:** cite the exact sections you read in `docs/CODING_GUIDELINES.md` and `docs/pom-in-practice.md`. Identify which existing POM classes will change and confirm their APIs.
- **Implementation:** extend existing base components, keep naming consistent (`elementTypeDescription`), encapsulate locators, and document any temporary methods with `// TODO`.
- **Verification:** lint touched POM files; if APIs changed, mention downstream impacts/tests to update.

### Test Data Management

- **PRE-FLIGHT:** document the `_N` vs `_R` decision per entity, list the nearby tests that will use the data, and note any shared helpers you inspected.
- **Implementation:** place new data as close to the consuming spec as possible; only promote it upward when reuse is proven. Use Playwright hooks (`beforeEach`, `afterAll`, etc.) to create/clean data inline. Keep naming descriptive (`CREATE_USER_ADMIN_ROLE`), and update teardown flows if `_N` data is still required globally.
- **Verification:** lint updated data helpers or specs, explain how hooks manage lifecycle, and describe cleanup behavior in POST-FLIGHT.

### Test Support Services

- **PRE-FLIGHT:** review the relevant files under `src/services/**`, note existing patterns (naming, error handling), and confirm no overlapping utilities already exist.
- **Implementation:** keep APIs small and composable, reuse shared helpers, and document side effects or required environment variables directly in the service file.
- **Verification:** lint the touched service files in the same aggregate command, describe any required unit/E2E verification, and mention downstream consumers that were impacted or tested.

### Documentation

- **PRE-FLIGHT:** list every document/section/table you are about to change so nothing remains outdated.
- **Implementation:** update the content in small, focused chunks, and keep fenced TS/JS code in sync with project conventions. Run a quick lint (e.g., `npx eslint --stdin --ext .ts`) over snippets to catch syntax issues before publishing.
- **Verification:** format via `npx dprint fmt ...`, then run the aggregate `npx eslint --fix ...`. Manually try embedded commands/scripts when relevant and summarize the outcome in POST-FLIGHT.

### Misc / Utility

- **PRE-FLIGHT:** define the precise scope and cite every doc/config reviewed (e.g., ESLint rules, README sections, deployment notes).
- **Implementation:** keep the change minimal and isolated; document rationale for any behavioral adjustments.
- **Verification:** lint the modified files (even docs, when markdownlint/eslint applies). Tests are usually `n/a`—state why if so.

## Using the Playbooks

1. Determine the task type and announce it in PRE-FLIGHT with a link to the relevant section of this file.
2. Pick the matching guide from `docs/ai-instructions/*.guide.md` (if available) and cite it alongside the playbook.
3. Merge the global checklist with the playbook-specific bullets above.
4. When referencing another document (e.g., `docs/pom-in-practice.md §Buttons`), record that citation in the Instruction Access checklist.
5. Follow the implementation/verification bullets exactly; missing lint/test evidence is treated as non-compliance.
