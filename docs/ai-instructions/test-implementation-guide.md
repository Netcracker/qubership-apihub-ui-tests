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

### Using Generic Assertions Instead of Specific Messages

```typescript
// ❌ Incorrect: generic regex check
await expect(portalPage.snackbar).toContainText(/success/i)

// ✅ Correct: specific message with ruleset name
const RULESET_CREATED_SUCCESS_MSG = (rulesetName: string): string => `${rulesetName} ruleset has been created`
await expect(portalPage.snackbar).toContainText(RULESET_CREATED_SUCCESS_MSG(rulesetName))
```

**Prevention:** Always check the actual UI code or API hooks to find the exact success/error messages. Extract them as constants at the top of the file.

### Hardcoding Status Values Instead of Using Constants

```typescript
// ❌ Incorrect: hardcoded text
await expect(rulesetRow.statusCell).toHaveText('Active')

// ❌ Incorrect: defining local constants when they exist in project
const STATUS_ACTIVE = 'Active'
const STATUS_INACTIVE = 'Inactive'

// ✅ Correct: use destructuring for status constants
import { LintRulesetStatuses } from '@portal/entities'
const { ACTIVE: STATUS_ACTIVE, INACTIVE: STATUS_INACTIVE } = LintRulesetStatuses
await expect(rulesetRow.statusCell).toHaveText(STATUS_ACTIVE)
```

**Prevention:** All UI text values (statuses, error messages, tooltips) must be extracted as constants. Check the UI code to see how values are displayed (e.g., `capitalize(status)` means lowercase values become capitalized in UI). Always check if display constants already exist in `@portal/entities` before defining local ones.

### Wrapping Simple Actions in test.step()

```typescript
// ❌ Incorrect: wrapping action that duplicates step name
await test.step('Click Create button', async () => {
  await createRulesetDialog.createBtn.click()
})

// ✅ Correct: direct action call
await createRulesetDialog.createBtn.click()
```

**Prevention:** Only wrap actions/assertions in `test.step()` when the step provides additional context or groups related operations. Simple actions that duplicate the step name should be called directly.

### Not Extracting Repeated Steps into Helper Functions

```typescript
// ❌ Incorrect: repeated navigation code
await test.step('Navigate directly to Ruleset Management tab', async () => {
  await portalPage.goto(RULESET_MANAGEMENT_PATH)
})
// ... repeated 10+ times

// ✅ Correct: extract to helper function
async function navigateToRulesetManagement(portalPage: PortalPage): Promise<void> {
  await portalPage.goto(RULESET_MANAGEMENT_PATH)
}
// Use: await navigateToRulesetManagement(portalPage)
```

**Prevention:** If a step appears more than 2 times, extract it to a helper function. Common candidates: navigation, opening dialogs, common setup actions.

### Mixing Actions and Assertions in Same Step

```typescript
// ❌ Incorrect: mixing action and assertion
await test.step('Hover over the relevant inactive ruleset row', async () => {
  const rulesetRow = rulesetManagementTab.getRulesetRow(PREVIOUSLY_ACTIVE_RULESET_OAS30_N.name)
  await expect(rulesetRow.statusCell).toHaveText('Inactive')
  await rulesetRow.hover()
})

// ✅ Correct: separate action and assertion
const rulesetRow = rulesetManagementTab.getRulesetRow(PREVIOUSLY_ACTIVE_RULESET_OAS30_N.name)
await test.step('Verify ruleset is inactive', async () => {
  await expect(rulesetRow.statusCell).toHaveText(STATUS_INACTIVE)
})
await rulesetRow.hover()
```

**Prevention:** Always separate actions and assertions into different steps. Extract common variables (like `rulesetRow`) above the steps for reuse.

### Not Verifying File Content When Downloading

```typescript
// ❌ Incorrect: only checking file name
await expectFile(downloadedFile).toHaveName('simple-ruleset.yaml')

// ❌ Incorrect: hardcoding content strings instead of using testMeta
await expectFile(downloadedFile).toHaveName(SIMPLE_RULESET_FILE.name)
await expectFile(downloadedFile).toContainText('rules:')
await expectFile(downloadedFile).toContainText('info-contact:')

// ✅ Correct: verify both name and content using testMeta
const SIMPLE_RULESET_FILE = new TestFile('path/to/file.yaml', {
  yamlString: 'rules:',
})
await expectFile(downloadedFile).toHaveName(SIMPLE_RULESET_FILE.name)
await expectFile(downloadedFile).toContainText(SIMPLE_RULESET_FILE.testMeta!.yamlString!)
```

**Prevention:** When testing file downloads, always verify both the file name (using the original TestFile object) and key content. Store expected content strings in `testMeta` when creating the TestFile object, then reference them in assertions instead of hardcoding strings.

### Using Generic URL Checks Instead of Specific Format

```typescript
// ❌ Incorrect: generic checks
await expectText(copiedUrl).toMatch(/^https?:\/\//)
await expectText(copiedUrl).toContain('rulesets')

// ❌ Incorrect: multiple separate checks instead of one complete check
await expectText(copiedUrl).toContain('/api-linter/api/v1/rulesets/')
await expectText(copiedUrl).toContain('/data')
await expectText(copiedUrl).toContain(ruleset.id)

// ✅ Correct: verify complete URL format in a single assertion
await expectText(copiedUrl).toContain(`/api-linter/api/v1/rulesets/${ruleset.id}/data`)
```

**Prevention:** Check the actual URL format in the UI code (e.g., `getPublicLink` function). Verify the complete URL path in a single assertion that includes all required parts (path segments and dynamic values like IDs) rather than splitting into multiple checks.

### Not Activating Test Data Before Asserting State

```typescript
// ❌ Incorrect: assuming state without setup
await test.step('Verify the status of the previously active ruleset changes to Inactive', async () => {
  const previouslyActiveRow = rulesetManagementTab.getRulesetRow(GENERAL_RULESET_OAS30_N.name)
  await expect(previouslyActiveRow.statusCell).toHaveText('Inactive')
})

// ✅ Correct: activate ruleset first, then verify
await lintRulesetTdm.activateRuleset(GENERAL_RULESET_OAS30_N)
await navigateToRulesetManagement(portalPage)
await test.step('Verify ruleset is active', async () => {
  const rulesetRow = rulesetManagementTab.getRulesetRow(GENERAL_RULESET_OAS30_N.name)
  await expect(rulesetRow.statusCell).toHaveText(STATUS_ACTIVE)
})
```

**Prevention:** Never assume the state of test data. Always set up the required state via API before testing UI behavior. Use constants from entities (e.g., `LintRulesetStatuses`) instead of hardcoded strings.

### Not Using Test ID Pattern for All Ruleset Names

```typescript
// ❌ Incorrect: missing test ID in negative test
const rulesetName = 'Test-Ruleset-Name'

// ✅ Correct: always use prefix and test ID
const rulesetName = `${ALIAS_PREFIX}-Test-Name-${testIdN}`
```

**Prevention:** All ruleset names (even for negative tests) must follow the pattern `${ALIAS_PREFIX}-<Name>-${testIdN}` to ensure proper cleanup in case of bugs.

### Not Moving Cleanup to Correct Location

```typescript
// ❌ Incorrect: cleanup in nested describe
test.describe('Ruleset Management', () => {
  test.afterAll(async ({ lintRulesetTdm }) => {
    // cleanup
  })
})

// ✅ Correct: cleanup at suite level
test.describe('API Quality Validation', () => {
  const testIdN = process.env.TEST_ID_N!
  test.describe('Ruleset Management', () => {
    test.afterAll(async ({ lintRulesetTdm }) => {
      // cleanup using testIdN from parent scope
    })
  })
})
```

**Prevention:** Move `testIdN` and cleanup (`afterAll`) to the outermost `test.describe` level where they can be shared across all nested suites.

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
