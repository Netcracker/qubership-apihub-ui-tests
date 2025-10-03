# Code Implementation Guidelines

This document provides a comprehensive guide to the coding standards and best practices used in this project.

**Quick Navigation**

- [Naming Conventions](#naming-conventions)
- [Code Organization](#code-organization)
- [Test Structure & Organization](#test-structure--organization)
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

## Code Organization

- **Import from project-specific paths:**
  - `@fixtures` for test fixtures
  - `@services` for utilities
  - `@shared` for base components
  - `@portal`/`@agent` for specific components
  - `@test-data` for constants
- **Implement base classes for common functionality**

## Test Structure & Organization

- **Use `test.describe()` for logical test grouping with descriptive names**
- **Follow test naming pattern:** `[TEST-ID] Action/Behavior being tested`
- **Structure tests using Given-When-Then or Arrange-Act-Assert patterns**
- **Implement `test.step()` for complex scenarios to improve readability**
- **Add tags (`@smoke`, `@flaky`, `@<feature-name>`) for test categorization**
- **Include ticket references:** `{ annotation: { type: 'Test Case', description: 'URL' } }`
- **Ensure test independence through proper isolation**
- **Group related scenarios within the same describe block**

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
import { GeneralSettingsTab } from './PackageSettingsPage/GeneralSettingsTab'
import { ApiSpecConfigTab } from './PackageSettingsPage/ApiSpecConfigTab'
import { VersionsTab } from './PackageSettingsPage/VersionsTab'
import { AccessControlTab } from './PackageSettingsPage/AccessControlTab'
import { AccessTokensTab } from './PackageSettingsPage/AccessTokensTab'

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
import { expect, expectFile } from '@services/expect-decorator'
import { OGR_PMGR_CREATE_EMPTY_N } from '@test-data/portal'
import { PortalPage } from '@portal/pages/PortalPage'

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
```

## Test Data Management

- Create typed interfaces for test data validation
- Use descriptive constant names (e.g., `CREATE_USER_ADMIN_ROLE`)
- Create entity files for reusable test objects
- Follow consistent naming patterns
- Separate test data from test logic
- Use the `test-data-manager` service for creating test data via API. This is not a single class, but a set of specialized classes like `ApihubTestDataManager`, `UsersTestDataManager`, etc., which are provided through fixtures.
- Strive for localized and optimized test data management. While some test data is currently stored separately from the tests, the goal is to create, manage, and clean up data at the most appropriate level (global, suite, or test-specific) to ensure test independence and performance.

### Test Data Types

Test data is categorized into two types based on reusability:

- **Reusable Test Data**: Constants with names ending in `_R` (e.g., `V_P_PKG_OVERVIEW_R`, `WSP_P_BASE_R`). These can be used across multiple tests without conflicts.
- **Non-reusable Test Data**: Constants with names ending in `_N` (e.g., `V_P_PKG_UAC_OWNER_EDIT_PKG_DEF_RELEASE_N`, `WSP_P_UAC_GENERAL_N`). These are intended for single-use scenarios and may cause conflicts if reused.

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

## Performance & Reliability

- Run tests in parallel by default
- Use auto-waiting instead of explicit waits
- Avoid `page.waitForTimeout()` except when absolutely necessary
- Implement API mocking with `page.route()` when appropriate
- Create efficient test data cleanup strategies

```typescript
// API mocking
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

## Project-Specific Patterns

- **Fixtures:** Use custom fixtures from `@fixtures`.
- **Decorators:** Implement decorators for enhanced assertions.
- **Consistency:** Follow the established project structure and patterns.
