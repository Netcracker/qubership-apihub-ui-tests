# AI Agent Implementation Guide: Playwright Tests

This guide supplements the global instructions for tasks classified as **Test Implementation**. Use it alongside:

- `.eslintrc.json`
- `docs/CODING_GUIDELINES.md` (especially _Test Structure_, _Assertions_, _Test Data Management_)
- `docs/pom-in-practice.md` (to verify component APIs)
- `docs/ai-instructions/preflight-checklists.md` (for PRE/POST requirements)

## Quick Start Checklist

Before writing code:

1. Read `.eslintrc.json` end-to-end.
2. Load the functional specification/story for the scenario and cite it in PRE-FLIGHT.
3. Search `docs/pom-in-practice.md` **before** the codebase for reusable components; then inspect existing specs for usage examples.
4. Verify that required resources exist (POM classes, test data constants, files).
5. Mirror these items in the PRE-FLIGHT checklist (see `docs/ai-instructions/preflight-checklists.md`).

## Implementation Phases

### Phase 1 — Preparation

- Understand prerequisites, inputs, and expected outputs from the spec.
- Confirm ESLint rules and formatting expectations (single quotes, trailing commas, `no semi`, explicit return types).
- Audit test data availability; decide `_N` vs `_R` lifecycle if new entities are needed.

### Phase 2 — Planning

- List all imports (fixtures, POMs, test data) and ensure they exist.
- Map Given/When/Then steps to `test.step()` groups; only wrap actions/assertions when the step adds context.
- Determine whether API mocking (`page.route`) is needed to force specific backend states.

### Phase 3 — Implementation

- Follow Coding Guidelines for structure, naming, and `test.describe` conventions (`[TEST-ID] Description`, tags, annotations).
- Keep actions and assertions separated; prefer `expect.soft` for grouped verifications.
- Add robust visibility checks (e.g., when asserting something is hidden, also assert that the surrounding page/tab is visible to avoid false positives).
- Create resources (test data constants, helper files) _before_ importing them.

### Phase 4 — Verification

- Run `npx eslint <spec-path>` immediately after edits; fix all errors.
- Execute the spec with `npx playwright test <spec-path> --headed --trace=on`. Capture artifacts for failures.
- Verify imports are used and paths are correct; remove dead code.
- Update documentation (this guide, playbooks, etc.) if new lessons were learned.

## Common Errors & Preventive Actions

### Mixing Object Shorthand Styles

```typescript
// ❌ Incorrect
await createRulesetDialog.fillForm({
  rulesetName,
  file: FILE_P_SIMPLE_RULESET,
})

// ✅ Correct
const file = FILE_P_SIMPLE_RULESET
await createRulesetDialog.fillForm({
  rulesetName,
  file,
})
```

**Prevention:** remember `object-shorthand: consistent` (see `.eslintrc.json`); assign props to local variables when mixing shorthand and explicit keys.

### Using Non-Existent POM APIs

```typescript
// ❌ Method does not exist
await expect(portalPage.snackbar.getSnackbar('success')).toContainText('...')

// ✅ Valid usage
await expect(portalPage.snackbar).toContainText('...')
```

**Prevention:** consult `docs/pom-in-practice.md` _and_ the actual class before using a method. If an API is missing, add it to the POM with proper encapsulation instead of hacking around it.

### Referencing Files Before They Exist

Always create test data/resources before importing them. If a file is missing, stop and add it first—imports should never reference future work.

### Incorrect Paths

```typescript
// ❌
path.join(ROOT_PORTAL, 'api-quality/rulesets')

// ✅
path.join(ROOT_PORTAL, 'api-quality', 'rulesets')
```

**Prevention:** pass each path segment separately to `path.join`.

### Forgetting Mandatory Test Execution

Skipping `--headed --trace=on` runs violates the playbook. Execute the spec you touched and note the command/result in POST-FLIGHT; attach failure evidence if needed.

## Compliance Workflow

Follow the evidence workflow defined in `docs/ai-instructions/README.md`, with these test-specific notes:

1. Snapshot this guide’s checklist in your todo list (`Checklist ➜ loaded from test-implementation-guide`).
2. When errors occur, document them in the “Common Errors” section above (edit this file) before closing the task.
3. Append compliance evidence to `ai-agent-local/ai-compliance-log.md` after lint/tests pass.

## File Structure Reference

- Tests: `src/tests/portal/<feature>/<feature>.spec.ts`
- Test data: `src/test-data/portal/<category>.ts`
- Resources (files, fixtures): `resources/portal/<category>/<sub>/<file>`
- POM files: `src/packages/portal/pages/<Page>/<Component>/<Component>.ts`

## Golden Rules

1. Read ESLint config **first**.
2. Verify component APIs **before** using them.
3. Create resources before referencing them.
4. Run lint immediately; keep output clean.
5. Run the touched spec `--headed --trace=on`.
6. Update this guide whenever new pitfalls surface.
7. Double-check everything: imports, tags, annotations, assertions, and test data lifecycles.
