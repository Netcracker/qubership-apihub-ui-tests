# Code Implementation Guidelines

This document provides a comprehensive guide to the coding standards and best practices used in this project.

**Quick Navigation**

- [Naming Conventions](#naming-conventions)
- [Code Organization](#code-organization)
- [Test Structure & Organization](#test-structure--organization)
- [Using `test.step()`](#using-teststep)
- [Page Object Model (POM)](#page-object-model-pom-implementation)
- [Locator Strategy](#locator-strategy)
- [Assertions & Expectations](#assertions--expectations)
- [Test Data Management](#test-data-management)
- [Error Handling & Debugging](#error-handling--debugging)
- [Performance & Reliability](#performance--reliability)
- [Documentation & Maintainability](#documentation--maintainability)
- [Project-Specific Patterns](#project-specific-patterns)

## Naming Conventions

- **Test files:** `[feature-number].[feature-name].spec.ts`
- **Page objects:** `[PageName].ts` (PascalCase)
- **Components:** `[ComponentName].ts` (PascalCase)
- **Test data files:** `[data-type].ts` (kebab-case)
- **Constants:** `UPPER_SNAKE_CASE`
- **Variables/methods:** `camelCase`
- **Classes:** `PascalCase`
- **Test IDs:** `P-FEATURE-1` format (note: when adding new tests, always ensure the test ID is unique)

### Test Entity Constant Naming Pattern

Constants for test entities must start with a **prefix indicating the entity type**, followed by descriptive parts. This ensures consistent naming and easy identification:

| Entity Type        | Prefix  | Example                                             |
| ------------------ | ------- | --------------------------------------------------- |
| File               | `FILE_` | `FILE_SIMPLE_RULESET`, `FILE_OAS30_SPEC`            |
| Message (any text) | `MSG_`  | `MSG_RULESET_CREATED_SUCCESS`, `MSG_INVALID_FORMAT` |
| Tooltip            | `TIP_`  | `TIP_CANNOT_DELETE_ACTIVE`                          |
| Ruleset            | `RUL_`  | `RUL_INACTIVE_OAS30_N`, `RUL_SUMMARY_OAS31_N`       |
| Group              | `G_`    | `G_AQ`, `G_PUBLISH_VAR`                             |
| Package            | `PKG_`  | `PKG_AQ_SUMMARY_N`, `PKG_MAIN_R`                    |
| Version            | `V_`    | `V_OAS30_N`, `V_MULTI_SPEC_N`                       |
| Workspace          | `WSP_`  | `WSP_MAIN_R`, `WSP_CREATE_N`                        |
| Dashboard          | `DSH_`  | `DSH_OVERVIEW_R`, `DSH_CRUD_N`                      |

```typescript
// ❌ Incorrect: suffix-based naming
const SIMPLE_RULESET_FILE = new TestFile(...)
const PUBLIC_URL_COPIED_SUCCESS_MSG = 'Public URL copied'
const INACTIVE_RULESET_OAS30_N = { id: '...', name: '...' }

// ✅ Correct: prefix-based naming
const FILE_SIMPLE_RULESET = new TestFile(...)
const MSG_PUBLIC_URL_COPIED_SUCCESS = 'Public URL copied'
const RUL_INACTIVE_OAS30_N = { id: '...', name: '...' }
```

## Code Organization

- **Import from project-specific paths:**
  - `@fixtures` for test fixtures
  - `@services` for utilities
  - `@shared` for base components
  - `@portal`/`@agent` for specific components
  - `@test-data` for constants
- **Implement base classes for common functionality**
- **Import Optimization:** Always review and optimize imports after implementing any code. Remove unused imports to keep code clean and avoid linting warnings.

## Test Structure & Organization

- **Use `test.describe()` for logical test grouping with descriptive names**
- **Follow test naming pattern:** `TEST-ID Action/Behavior being tested`
- **Structure tests using Given-When-Then or Arrange-Act-Assert patterns**
- **Add tags (`@smoke`, `@flaky`, `@<feature-name>`) for test categorization**
- **Include ticket references:** `{ annotation: { type: 'Test Case', description: 'URL' } }`
- **Ensure test independence through proper isolation**
- **Group related scenarios within the same describe block**

### Constants Placement

**All constants must be defined inside their corresponding `test.describe()` blocks**, not at the file level. This keeps the code organized and avoids a "messy" file header with unrelated constants mixed together.

```typescript
// ❌ Incorrect: constants at file level become messy
const FILE_SIMPLE_RULESET = new TestFile(...)
const MSG_SUCCESS = '...'
const RUL_INACTIVE_OAS30_N = { ... }

test.describe('Feature A', () => { ... })
test.describe('Feature B', () => { ... })

// ✅ Correct: constants inside their corresponding describes
test.describe('Feature A', () => {
  const FILE_SIMPLE_RULESET = new TestFile(...)
  const MSG_SUCCESS = '...'
  
  test('Test 1', async () => { ... })
})

test.describe('Feature B', () => {
  const RUL_INACTIVE_OAS30_N = { ... }
  
  test('Test 2', async () => { ... })
})
```

### Minimal Destructuring

Use **direct property chaining** instead of creating intermediate variables through destructuring. Only destructure when you need the final component that will be used in the test.

```typescript
// ❌ Incorrect: excessive intermediate destructuring
const portalPage = new PortalPage(page)
const { portalSettingsPage } = portalPage
const { rulesetManagementTab } = portalSettingsPage

const { versionPackagePage } = portalPage
const { overviewTab } = versionPackagePage
const { summaryTab } = overviewTab
const { restApi } = summaryTab.body
const { qualityValidation } = restApi

// ✅ Correct: minimal destructuring with direct chaining
const portalPage = new PortalPage(page)
const { rulesetManagementTab } = portalPage.portalSettingsPage

const { restApi } = portalPage.versionPackagePage.overviewTab.summaryTab.body
const { qualityValidation } = restApi
```

### Using `test.step()`

Use `test.step()` to group related actions or assertions separately, and to provide context and meaning beyond what the code itself expresses.
The same principles apply to both actions and assertions: do **not** wrap them if `test.step()` would just duplicate the action/assertion name, but it is **preferred** to wrap them when the step provides additional context, explains the purpose, or groups related operations together.

**Key principles:**

- **Separate grouping:** Group actions separately from assertions. Do **not** mix actions and assertions in the same `test.step()` unless it's a high-level grouping in a large test that already has separate groupings at lower levels.
- **Grouping actions:** Use `test.step()` to group multiple related actions that form a logical unit (e.g., navigation steps, form filling).
- **Grouping assertions:** Use `test.step()` to group multiple related assertions that verify a logical unit (e.g., verification groups, state checks).
- **Context over duplication:** Do **not** wrap actions/assertions if `test.step()` would just duplicate the action name (e.g., "Click Add Ruleset button" for `addRulesetBtn.click()`). Do wrap them if `test.step()` describes the **purpose**, **context**, or **reason** (e.g., "Open dialog to verify its title" or "Verify dialog is closed to ensure we remain on correct page").
- **Preference for context:** While simple actions/assertions can be written without `test.step()`, it is **preferred** to wrap them when doing so adds meaningful context or improves test readability.
- **Step name guidelines:** Avoid hardcoding specific expected values in step names. Step names should describe **what** is being verified, not **what value** is expected. Use variables for expected values in assertions, not in step names. Only include specific values in step names when they are variables (e.g., `Verify ${rulesetName} is displayed`), not hardcoded strings (e.g., `Verify API Type chip shows OAS 3.0`).

```typescript
// ✅ Correct: test.step() for grouping multiple related actions
await test.step('Navigate to Ruleset Management tab', async () => {
  await portalPage.goto()
  await portalPage.header.portalSettingsBtn.click()
  await rulesetManagementTab.click()
})

// ✅ Correct: grouping multiple related assertions with context
await test.step('Verify dialog is closed and we remain on Ruleset Management tab', async () => {
  await expect(createRulesetDialog.title).toBeHidden()
  await expect(rulesetManagementTab.title).toBeVisible()
  await expect(rulesetManagementTab.addRulesetBtn).toBeVisible()
})

// ✅ Correct: action wrapped in test.step() when step describes purpose/context
await test.step('Open dialog to verify its title', async () => {
  await rulesetManagementTab.addRulesetBtn.click()
})

// ✅ Correct: assertion wrapped in test.step() providing context
await test.step('Verify dialog title matches expected format', async () => {
  await expect(createRulesetDialog.title).toHaveText('Create Ruleset for OAS 3.0')
})

// ✅ Acceptable: simple action without test.step() if it's obvious from context
await createRulesetDialog.cancelBtn.click()

// ✅ Acceptable: simple assertion without test.step() if it's obvious from context
await expect(rulesetManagementTab.title).toBeVisible()

// ❌ Incorrect: mixing actions and assertions in the same step (unless high-level grouping)
await test.step('Open dialog and verify its title', async () => {
  await rulesetManagementTab.addRulesetBtn.click()
  await expect(createRulesetDialog.title).toHaveText('Create Ruleset for OAS 3.0')
})

// ❌ Incorrect: wrapping action when step just duplicates action name
await test.step('Click Add Ruleset button', async () => {
  await rulesetManagementTab.addRulesetBtn.click()
})

// ❌ Incorrect: wrapping assertion when step just duplicates assertion
await test.step('Expect dialog title to have text', async () => {
  await expect(createRulesetDialog.title).toHaveText('Create Ruleset for OAS 3.0')
})
```

```typescript
test.describe('Feature: Version Management', () => {
  test('[P-VER-1] Creating a new version with valid data', {
    tag: '@smoke',
    annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-123` },
  }, async ({ adminPage: page }) => {
    // Test implementation
  })
})
```

## Page Object Model (POM) Implementation

- Extend base components for maximum reusability
- Use descriptive element names, such as `elementTypeDescription` (e.g., `addVersionBtn`)
- Implement constructor patterns that accept the `Page` or `Locator` parameter
- Store Page Object Models in the `src/packages` folder, organized by application area
- Group related elements logically within classes
- Prefer composition over inheritance for complex structures
- Create component classes for reusable UI elements
- Implement proper encapsulation - expose only necessary methods

```typescript
import type { Page } from '@playwright/test'
import { Breadcrumbs, Button, Placeholder, Title } from '@shared/components/base'
import { AccessControlTab } from './PackageSettingsPage/AccessControlTab'
import { AccessTokensTab } from './PackageSettingsPage/AccessTokensTab'
import { ApiSpecConfigTab } from './PackageSettingsPage/ApiSpecConfigTab'
import { GeneralSettingsTab } from './PackageSettingsPage/GeneralSettingsTab'
import { VersionsTab } from './PackageSettingsPage/VersionsTab'

export class PackageSettingsPage {
  readonly breadcrumbs = new Breadcrumbs(this.page.getByTestId('PackageBreadcrumbs'), 'Package settings')
  readonly title = new Title(this.page.getByTestId('ToolbarTitleTypography'), 'Package settings')
  readonly exitBtn = new Button(this.page.getByTestId('ExitButton'), 'Exit')
  readonly generalTab = new GeneralSettingsTab(this.page)
  readonly apiSpecConfigTab = new ApiSpecConfigTab(this.page)
  readonly versionsTab = new VersionsTab(this.page)
  readonly accessTokensTab = new AccessTokensTab(this.page)
  readonly accessControlTab = new AccessControlTab(this.page)
  readonly noPermissionPlaceholder = new Placeholder(this.page.getByTestId('NoPermissionPlaceholder'), 'No permission')

  constructor(private readonly page: Page) {}
}
```

### Using POM in Tests

The following example demonstrates how to use the created page objects and components within a test.

**Example: `12.1.1-pkg-man-grouping-crud.spec.ts`**

```typescript
import { test } from '@fixtures'
import { PortalPage } from '@portal/pages/PortalPage'
import { expect, expectFile } from '@services/expect-decorator'
import { OGR_PMGR_CREATE_EMPTY_N } from '@test-data/portal'

test('[P-MGOP-1.1] Create an empty group - REST API', async ({ sysadminPage: page }) => {
  // 1. Instantiate the main page object
  const portalPage = new PortalPage(page)
  const { versionPackagePage: versionPage } = portalPage
  const { overviewTab } = versionPage
  const { groupsTab } = overviewTab
  const { createUpdateOperationGroupDialog: createDialog } = groupsTab
  const { groupName } = OGR_PMGR_CREATE_EMPTY_N

  // 2. Navigate to the page
  await portalPage.gotoPackage(testPackage)
  await overviewTab.groupsTab.click()

  // 3. Interact with components
  await groupsTab.createGroupBtn.click()
  await createDialog.fillForm(OGR_PMGR_CREATE_EMPTY_N)
  await createDialog.createBtn.click()

  // 4. Make assertions
  await expect(createDialog.createBtn).toBeHidden()
  await expect.soft(groupsTab.getGroupRow(groupName).apiTypeCell).toHaveText(
    API_TITLES_MAP[OGR_PMGR_CREATE_EMPTY_N.apiType!],
  )
})
```

For practical examples of how to implement the Page Object Model, please refer to the [Page Object Model (POM) in Practice](pom-in-practice.md) document.

## Locator Strategy

- **Primary:** `getByTestId()`
- **Semantic:** `getByRole()`, `getByLabel()`, `getByText()`
- **Complex:** `.and()`, `.or()`, `.filter()`
- **Last Resort:** `page.locator()` with CSS selectors.

```typescript
// Preferred approach
const submitButton = page.getByTestId('SubmitButton')

// Alternative semantic approaches
const submitButton = page.getByRole('button', { name: 'Submit' })
const nameInput = page.getByLabel('Full Name')
const welcomeMessage = page.getByText('Welcome to the dashboard')

// Complex scenarios
const activeUserRow = page.getByRole('row').filter({ hasText: 'Active' })
const requiredField = page.getByRole('textbox').and(page.getByTestId('Required'))
```

## Assertions & Expectations

- Use `expect.soft()` for non-blocking assertions that do not stop test execution on failure. This is useful for checking multiple UI elements at once
- Use auto-waiting assertions like `toBeVisible()`, `toHaveText()`, and `toBeEnabled()`
- Choose specific assertion methods over generic ones
- Group related assertions within test steps
- Implement custom assertions for domain-specific validations
- Use the `expectFile` helper for file-based assertions. It requires a `DownloadedTestFile` object returned from a download action
- Use `toHaveCount()` to verify the number of elements
- **Robust Assertions:** When asserting that an element is **hidden**, always add a complementary assertion to verify that the page or component has loaded correctly.
  This prevents false positives where the entire page fails to load. Check for a stable, always-present element, like a page title or another tab.
  When verifying that a dialog is closed, also verify that you remain on the correct page with the expected content visible.
- **Minimal Assertions:** Avoid redundant assertions. Assert on the **most specific element** that proves the expected state. Do not add extra assertions that duplicate information already verified by a parent element's visibility.
  ```typescript
  // ❌ Incorrect: redundant assertions
  await expect(restApi.operations).toBeVisible() // unnecessary if restApi is checked
  await expect(qualityValidation.title).toHaveText('Quality Validation') // title text is static, visibility is enough

  // ✅ Correct: minimal, sufficient assertions
  await expect(restApi).toBeVisible()
  await expect(qualityValidation.title).toBeVisible()
  ```
- **Tooltips:** Surface every tooltip through the shared `portalPage.tooltip` (or the equivalent page-level component). Hover the interactive element to trigger the tooltip, then assert the text via `portalPage.tooltip` instead of introducing ad-hoc tooltip locators.
- **Date Formatting & Validation:**
  - Use `formatDateToUI()` from `@services/utils` to format dates in the UI format (`DD MMM, YYYY`)
  - Always use `dayjs` library (same as UI project) for date formatting, not native Date API

```typescript
// Non-blocking assertions
await expect.soft(versionPage.toolbar.breadcrumbs).toBeVisible()
await expect.soft(versionPage.toolbar.versionSlt).toBeVisible()
await expect.soft(versionPage.toolbar.status).toHaveText(V_P_PKG_OVERVIEW_R.status)

// Specific assertions
await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(2)
await expect.soft(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()

// File assertion
const file = await exportDialog.performExport()
await expectFile(file).toHaveName('exported-file.yaml')

// Date formatting and validation
test.describe('Feature Suite', () => {
  const currentFormattedDate = formatDateToUI(new Date())

  test('Verify date display', async ({ page }) => {
    await expect(dateCell).toHaveText(currentFormattedDate)
    await expect(historyCell).toHaveText(`${currentFormattedDate} - ${currentFormattedDate}`)
  })
})
```

## Test Data Management

- Create typed interfaces for test data validation
- Use descriptive constant names (e.g., `CREATE_USER_ADMIN_ROLE`)
- Keep data as close to the consuming spec as possible; create shared entity files only when multiple suites rely on the same structure
- Follow consistent naming patterns
- Separate test data from test logic
- Use the `test-data-manager` service for creating test data via API. This is not a single class, but a set of specialized classes like `ApihubTestDataManager`, `UsersTestDataManager`, etc., which are provided through fixtures.
- Strive for localized and optimized test data management. Treat colocated file-level data as the default, promote it to higher levels only after confirming reuse, and always pair it with Playwright hooks (`beforeAll`, `beforeEach`, `afterEach`, `afterAll`) for creation/cleanup.

### Test Data Types

Test data is categorized into two types based on reusability and lifecycle:

- **Non-Reusable Test Data (`_N`)**: Constants with names ending in `_N` (e.g., `V_P_PKG_UAC_OWNER_EDIT_PKG_DEF_RELEASE_N`, `WSP_P_UAC_GENERAL_N`).
  This data is created at the start of a test suite run (e.g., in `globalSetup` or `test.beforeAll`). It can be reused across multiple tests within the _same run_ to improve performance.
  However, it is considered transient and is **always deleted** at the end of the run in `apihub-teardown.ts` (unless `CLEAR_TD === 'skip'`). Use this type for test-specific data that should not persist between test runs.

- **Reusable Test Data (`_R`)**: Constants with names ending in `_R` (e.g., `V_P_PKG_OVERVIEW_R`, `WSP_P_BASE_R`).
  This data is persistent across multiple, independent test suite runs. It is created once (often manually or via a separate setup script) and is only deleted if `CLEAR_TD === 'all'` is explicitly set.
  These can be used across multiple tests without conflicts. Use this type for shared test data that can be reused across different test runs.

**Cleanup and Management:**

- Non-reusable data (`_N`) is automatically cleaned up after each test run via `apihub-teardown.ts`
- Reusable data (`_R`) persists unless explicitly cleared with `CLEAR_TD === 'all'`
- Ensure all non-reusable test data includes `process.env.TEST_ID_N!` in its name/identifier for proper cleanup identification

### Placement & Hooks

- Start by defining data inside the spec (or its `tests/<feature>` folder). Only extract it to `src/test-data/**` when multiple suites genuinely need it.
- Use Playwright lifecycle hooks to control data scope:
  - `beforeEach`/`afterEach` → per-test setup/cleanup
  - `beforeAll`/`afterAll` → suite-level fixtures
- When using API-based managers, wrap the calls in these hooks so that failures are easier to trace and cleanup always runs, even if the test fails early.

### Hook Timeouts

For hooks that perform long-running operations (e.g., version publishing), **always set an extended timeout** using `test.setTimeout()` at the beginning of the hook. Use the `HOOK_PUBLISH_TIMEOUT` constant from `@test-setup` (3 minutes / 180,000 ms).

```typescript
import { HOOK_PUBLISH_TIMEOUT } from '@test-setup'

test.beforeAll(async ({ apihubTDM }) => {
  // Extended timeout for version publishing operations
  test.setTimeout(HOOK_PUBLISH_TIMEOUT)

  await apihubTDM.createPackage([...])
  await apihubTDM.publishVersion(V_OAS30_N)
})
```

### Version Entities

**Versions must always be defined as `Version` objects**, not as plain strings. This ensures consistency with other test data entities and enables proper usage with TDM methods and navigation.

```typescript
import type { Version } from '@test-data/props'

// ❌ Incorrect: version as a plain string
const V_OAS30_N = 'v1-oas30'
await apihubTDM.publishVersion({
  pkg: PKG_AQ_SUMMARY_N,
  version: V_OAS30_N,
  status: 'release',
  files: [{ file: FILE_SUMMARY_OAS30 }],
})
await portalPage.gotoVersion({ pkg: PKG_AQ_SUMMARY_N, version: V_OAS30_N })

// ✅ Correct: version as a Version object
const V_OAS30_N: Version = {
  pkg: PKG_AQ_SUMMARY_N,
  version: 'v1-oas30',
  status: 'release',
  files: [{ file: FILE_SUMMARY_OAS30 }],
}
await apihubTDM.publishVersion(V_OAS30_N)
await portalPage.gotoVersion(V_OAS30_N)
```

```typescript
// Test data interface
interface UserData {
  username: string
  email: string
  role: UserRole
}

// Test data constants
export const ADMIN_USER: UserData = {
  username: 'admin_user',
  email: 'admin@example.com',
  role: UserRole.ADMIN,
}

// Example of test data manager usage from a test fixture
import { test } from '@fixtures'
import { MY_WORKSPACE } from '@test-data/workspaces'

// The 'apihubTDM' fixture provides an instance of ApihubTestDataManager
test('Create a new workspace', async ({ apihubTDM }) => {
  await apihubTDM.createWorkspace(MY_WORKSPACE)
  // ... rest of the test
})
```

## Error Handling & Debugging

- **Interactive Debugging:** Use the `--debug` flag.
- **Flakiness:** Implement retry logic for unstable operations.
- **Root Cause Analysis Over Assumptions:** If a test fails, **do not** make assumptions about the cause (e.g., "the content is not loading").
  Instead, you **must** use available debugging tools to investigate the precise state of the application at the point of failure.
  Masking failures with workarounds like arbitrary timeouts is strictly forbidden. The primary goal is to identify and fix the root cause.
- **Mandatory Use of Debugging Tools (MCP):** To comply with the root cause analysis principle, you **must** utilize the powerful debugging tools at your disposal, particularly the Playwright MCP tools.
  When a test fails because an element is not found or visible, use tools like `browser_snapshot` to capture the accessibility tree or `take_screenshot` to visually inspect the UI.
  Interacting with the live browser session via MCP tools is the required method for diagnosing UI-related test failures, not guessing or assuming.

## Performance & Reliability

- Run tests in parallel by default
- Use auto-waiting instead of explicit waits
- Avoid `page.waitForTimeout()` except when absolutely necessary
- Implement API mocking with `page.route()` when appropriate
- Create efficient test data cleanup strategies
- **API Mocking for Specific States:** If a test case requires a specific backend state that is not the default (e.g., a feature being disabled), use `page.route()` to mock the relevant API response.
  Do not skip the test or work around the state. For example, to test UI when the linter is disabled, intercept `**/api/v2/system/configuration` and provide a response where the `api-linter` is removed from the `extensions` array.

```typescript
// API mocking for specific states
await page.route('**/api/v2/system/configuration', async (route) => {
  const response = await route.fetch()
  const json = await response.json()
  const filteredExtensions = json.extensions.filter(
    (ext: { name: string }) => ext.name !== 'api-linter',
  )
  await route.fulfill({
    status: response.status(),
    headers: response.headers(),
    body: JSON.stringify({
      ...json,
      extensions: filteredExtensions,
    }),
  })
})

// General API mocking
await page.route('**/api/users', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify([MOCK_USER_1, MOCK_USER_2]),
  })
})

// Proper waiting
await expect(page.getByTestId('loading')).toBeHidden()
```

## Documentation & Maintainability

- Add JSDoc comments for complex components
- Use descriptive variable names
- Keep tests focused on single responsibility
- Reference tickets for known issues
- **Code Comments for Temporary Additions:** If you need to add a temporary element or method to a Page Object Model to support a specific test, clearly mark it with a `// TODO:` comment explaining why it's temporary and when it should be removed.
- **Documentation freshness:** whenever behavior, workflows, or tooling expectations change, update the relevant docs (`README`, guides, onboarding notes) in the same change set. Never leave the knowledge base outdated.

## Project-Specific Patterns

- **Fixtures:** Use custom fixtures from `@fixtures`.
- **Decorators:** Implement decorators for enhanced assertions.
- **Consistency:** Follow the established project structure and patterns.

## Common Test Scenarios

### Document Icon Verification

When verifying document lists (e.g., in the sidebar or tables), always check for the correct file type icon using the `toHaveIcon` assertion and standard icon constants from `@shared/entities`.

```typescript
import { GRAPHQL_ICON, OPENAPI_ICON, SWAGGER_ICON } from '@shared/entities'

// Verify icons in the sidebar
await expect.soft(documentsTab.sidebar.getFileButton('petstore-2.0')).toHaveIcon(SWAGGER_ICON)
await expect.soft(documentsTab.sidebar.getFileButton('petstore-3.0')).toHaveIcon(OPENAPI_ICON)
await expect.soft(documentsTab.sidebar.getFileButton('graphql-schema')).toHaveIcon(GRAPHQL_ICON)
```

### Standard Search Algorithm

When testing search functionality (e.g., in Document details or lists), follow this standard algorithm to ensure comprehensive coverage:

1. **Part of a word**: Search for a substring (e.g., "f"). Verify results count.
2. **Adding part of a word**: Append to the query (e.g., "inds"). Verify results refine.
3. **Clearing a search query**: Clear the input. Verify all results return.
4. **Two words**: Search for a phrase (e.g., "find pet"). Verify exact match.
5. **Upper case**: Search with different casing (e.g., "Finds"). Verify case-insensitivity.
6. **Invalid search query**: Search for non-existent text. Verify 0 results.

```typescript
await test.step('Part of a word', async () => {
  await searchbar.fill('f')
  await expect(table.getRow()).toHaveCount(8)
})

await test.step('Adding part of a word', async () => {
  await searchbar.type('inds')
  await expect(table.getRow()).toHaveCount(2)
})

await test.step('Clearing a search query', async () => {
  await searchbar.clear()
  await expect(table.getRow()).toHaveCount(20)
})
// ... continue with other steps
```
