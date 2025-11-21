import { test } from '@fixtures'
import type { Page } from '@playwright/test'
import {
  LintRulesetApiTypes,
  LintRulesetLinters,
  LintRulesetStatuses,
  RULESET_API_TYPE_TITLE_MAP,
  SERVER_DEFAULT_RULESETS,
} from '@portal/entities'

const { ACTIVE: STATUS_ACTIVE, INACTIVE: STATUS_INACTIVE } = LintRulesetStatuses
import { PortalPage } from '@portal/pages'
import { expect, expectFile, expectText } from '@services/expect-decorator'
import { ROOT_RESOURCES, TestFile } from '@shared/entities'
import { ALIAS_PREFIX } from '@test-data/prefixes'

const DEFAULT_API_TYPE_LABEL = RULESET_API_TYPE_TITLE_MAP[LintRulesetApiTypes.OAS_3_0]
const RULESET_MANAGEMENT_PATH = '/portal/settings/rulesets'

// Test resource files
const SIMPLE_RULESET_FILE = new TestFile(`${ROOT_RESOURCES}/portal/api-quality/rulesets/simple-ruleset.yaml`, {
  yamlString: 'ruseverity: warn',
})
const INVALID_EXTENSION_FILE = new TestFile(`${ROOT_RESOURCES}/portal/api-quality/rulesets/invalid-extension.txt`)

// Notification messages
const RULESET_CREATED_SUCCESS_MSG = (rulesetName: string): string => `${rulesetName} ruleset has been created`
const RULESET_DELETED_SUCCESS_MSG = (rulesetName: string): string => `${rulesetName} ruleset has been deleted`
const PUBLIC_URL_COPIED_SUCCESS_MSG = 'Public URL copied'

// Error messages
const DUPLICATE_NAME_ERROR_MSG = (rulesetName: string, apiType: string): string =>
  `Ruleset name ${rulesetName} is not unique for API type ${apiType}`
const INVALID_FILE_FORMAT_ERROR_MSG = 'File format must be YAML'

// Tooltip messages
const CANNOT_DELETE_ACTIVE_TOOLTIP = 'Cannot delete active ruleset'
const CANNOT_DELETE_WITH_HISTORY_TOOLTIP =
  'The ruleset cannot be deleted due to existing versions that have been validated against this ruleset'

// Helper functions
async function mockSystemConfigurationToDisableLinter(page: Page): Promise<void> {
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
}

async function navigateToRulesetManagement(portalPage: PortalPage): Promise<void> {
  await portalPage.goto(RULESET_MANAGEMENT_PATH)
}

async function openCreateRulesetDialog(portalPage: PortalPage): Promise<void> {
  const { portalSettingsPage } = portalPage
  const { rulesetManagementTab } = portalSettingsPage
  await rulesetManagementTab.addRulesetBtn.click()
}

test.describe('API Quality Validation', () => {
  const testIdN = process.env.TEST_ID_N!

  test.describe('Ruleset Management', () => {
    // Suite-level reusable data (_N rulesets)
    let INACTIVE_RULESET_OAS30_N: { id: string; name: string }
    let PREVIOUSLY_ACTIVE_RULESET_OAS30_N: { id: string; name: string }
    let INACTIVE_RULESET_OAS31_N: { id: string; name: string }
    let GENERAL_RULESET_OAS30_N: { id: string; name: string }

    test.beforeAll(async ({ lintRulesetTdm }) => {
      const rulesetNamePrefix = `${ALIAS_PREFIX}-`

      // Create INACTIVE_RULESET_OAS30_N, INACTIVE_RULESET_OAS31_N, and GENERAL_RULESET_OAS30_N
      const inactiveOas30 = await lintRulesetTdm.createRuleset({
        rulesetName: `${rulesetNamePrefix}Inactive-OAS30-${testIdN}`,
        apiType: LintRulesetApiTypes.OAS_3_0,
        linter: LintRulesetLinters.SPECTRAL,
        rulesetFile: SIMPLE_RULESET_FILE,
      })
      INACTIVE_RULESET_OAS30_N = { id: inactiveOas30.id, name: inactiveOas30.name }

      const inactiveOas31 = await lintRulesetTdm.createRuleset({
        rulesetName: `${rulesetNamePrefix}Inactive-OAS31-${testIdN}`,
        apiType: LintRulesetApiTypes.OAS_3_1,
        linter: LintRulesetLinters.SPECTRAL,
        rulesetFile: SIMPLE_RULESET_FILE,
      })
      INACTIVE_RULESET_OAS31_N = { id: inactiveOas31.id, name: inactiveOas31.name }

      const generalOas30 = await lintRulesetTdm.createRuleset({
        rulesetName: `${rulesetNamePrefix}General-OAS30-${testIdN}`,
        apiType: LintRulesetApiTypes.OAS_3_0,
        linter: LintRulesetLinters.SPECTRAL,
        rulesetFile: SIMPLE_RULESET_FILE,
      })
      GENERAL_RULESET_OAS30_N = { id: generalOas30.id, name: generalOas30.name }

      // Create PREVIOUSLY_ACTIVE_RULESET_OAS30_N
      const previouslyActive = await lintRulesetTdm.createRuleset({
        rulesetName: `${rulesetNamePrefix}PreviouslyActive-OAS30-${testIdN}`,
        apiType: LintRulesetApiTypes.OAS_3_0,
        linter: LintRulesetLinters.SPECTRAL,
        rulesetFile: SIMPLE_RULESET_FILE,
      })
      PREVIOUSLY_ACTIVE_RULESET_OAS30_N = { id: previouslyActive.id, name: previouslyActive.name }

      // Establish activation history: activate PREVIOUSLY_ACTIVE_RULESET_OAS30_N three times
      // (last activation is shown in table, previous ones in tooltip)
      for (let i = 0; i < 3; i++) {
        await lintRulesetTdm.activateRuleset(PREVIOUSLY_ACTIVE_RULESET_OAS30_N)
        await lintRulesetTdm.activateRuleset(GENERAL_RULESET_OAS30_N)
      }
    })

    test.afterAll(async ({ lintRulesetTdm }) => {
      // Activate the default server ruleset (necessary because an active ruleset cannot be deleted)
      const defaultRuleset = await lintRulesetTdm.getRulesetByName({
        rulesetName: SERVER_DEFAULT_RULESETS[LintRulesetApiTypes.OAS_3_0],
        apiType: LintRulesetApiTypes.OAS_3_0,
      })
      if (defaultRuleset) {
        await lintRulesetTdm.activateRuleset({
          id: defaultRuleset.id,
          name: defaultRuleset.name,
        })
      }

      // Cleanup all test rulesets
      await lintRulesetTdm.deleteTestRulesets(testIdN)
    })

    test.describe('Initial State and Core UI', () => {
      test('P-AQ-RM-UI-1 Verify Ruleset Management tab is hidden when linter is disabled', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { portalSettingsPage } = portalPage

        await test.step('Mock system configuration API to disable linter', async () => {
          await mockSystemConfigurationToDisableLinter(page)
        })

        await test.step('Navigate to Portal Settings', async () => {
          await portalPage.goto()
          await portalPage.header.portalSettingsBtn.click()
        })

        await test.step('Verify another tab is visible to confirm page loaded correctly', async () => {
          await expect(portalSettingsPage.userRolesTabBtn).toBeVisible()
        })

        await test.step('Verify Ruleset Management tab is not visible', async () => {
          await expect(portalSettingsPage.rulesetManagementTab).toBeHidden()
        })
      })

      test('P-AQ-RM-UI-2 Verify initial state for admin', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { portalSettingsPage } = portalPage
        const { rulesetManagementTab } = portalSettingsPage

        await test.step('Navigate to Ruleset Management tab', async () => {
          await portalPage.goto()
          await portalPage.header.portalSettingsBtn.click()
          await rulesetManagementTab.click()
        })

        await test.step('Verify main header is visible', async () => {
          await expect(rulesetManagementTab.title).toBeVisible()
        })

        await test.step('Verify API type selector is visible with default value', async () => {
          await expect(rulesetManagementTab.rulesetTypeSlt).toBeVisible()
          await expect(rulesetManagementTab.rulesetTypeSlt).toHaveText(DEFAULT_API_TYPE_LABEL)
        })

        await test.step('Verify Add Ruleset button is visible and enabled', async () => {
          await expect(rulesetManagementTab.addRulesetBtn).toBeVisible()
          await expect(rulesetManagementTab.addRulesetBtn).toBeEnabled()
        })

        await test.step('Verify ruleset table with correct columns is visible', async () => {
          const firstRulesetRow = rulesetManagementTab.getRulesetRow(1)

          await expect(firstRulesetRow.nameCell).toBeVisible()
          await expect(firstRulesetRow.activationHistoryCell).toBeVisible()
          await expect(firstRulesetRow.statusCell).toBeVisible()
          await expect(firstRulesetRow.createdAtCell).toBeVisible()
        })
      })
    })

    test.describe('Ruleset Creation', () => {
      test('P-AQ-RM-CREATE-1 Open, verify title, and close the Create Ruleset dialog', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { portalSettingsPage } = portalPage
        const { rulesetManagementTab } = portalSettingsPage
        const { createRulesetDialog } = rulesetManagementTab

        await navigateToRulesetManagement(portalPage)

        await test.step('Open Create Ruleset dialog', async () => {
          await openCreateRulesetDialog(portalPage)
        })

        await test.step('Verify dialog title matches expected format', async () => {
          await expect(createRulesetDialog.title).toHaveText(`Create Ruleset for ${DEFAULT_API_TYPE_LABEL}`)
        })

        await test.step('Close dialog without creating ruleset', async () => {
          await createRulesetDialog.cancelBtn.click()
        })

        await test.step('Verify dialog is closed and we remain on Ruleset Management tab', async () => {
          await expect(createRulesetDialog.title).toBeHidden()
          await expect(rulesetManagementTab.title).toBeVisible()
          await expect(rulesetManagementTab.addRulesetBtn).toBeVisible()
        })
      })

      test('P-AQ-RM-CREATE-2 Create a new inactive ruleset', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { portalSettingsPage } = portalPage
        const { rulesetManagementTab } = portalSettingsPage
        const { createRulesetDialog } = rulesetManagementTab

        const retryIndex = test.info().retry + 1
        const rulesetName = `${ALIAS_PREFIX}-Create-New-${retryIndex}-${testIdN}`

        await navigateToRulesetManagement(portalPage)

        await test.step('Open Create Ruleset dialog', async () => {
          await openCreateRulesetDialog(portalPage)
        })

        await test.step('Fill in unique name and upload file', async () => {
          const file = { path: SIMPLE_RULESET_FILE.path, name: SIMPLE_RULESET_FILE.name }
          await createRulesetDialog.fillForm({
            rulesetName,
            file,
          })
        })

        await createRulesetDialog.createBtn.click()

        await test.step('Verify success notification appears', async () => {
          await expect(portalPage.snackbar).toContainText(RULESET_CREATED_SUCCESS_MSG(rulesetName))
        })

        await test.step('Verify new Inactive ruleset is in the table', async () => {
          const rulesetRow = rulesetManagementTab.getRulesetRow(rulesetName)
          await expect(rulesetRow.nameCell).toHaveText(rulesetName)
          await expect(rulesetRow.statusCell).toHaveText(STATUS_INACTIVE)
        })
      })

      test('P-AQ-RM-CREATE-3 Attempt to create a ruleset with a duplicate name', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { portalSettingsPage } = portalPage
        const { rulesetManagementTab } = portalSettingsPage
        const { createRulesetDialog } = rulesetManagementTab

        await navigateToRulesetManagement(portalPage)

        await test.step('Open Create Ruleset dialog', async () => {
          await openCreateRulesetDialog(portalPage)
        })

        await test.step('Fill in duplicate name and upload file', async () => {
          const file = { path: SIMPLE_RULESET_FILE.path, name: SIMPLE_RULESET_FILE.name }
          const rulesetName = GENERAL_RULESET_OAS30_N.name
          await createRulesetDialog.fillForm({
            rulesetName,
            file,
          })
        })

        await createRulesetDialog.createBtn.click()

        await test.step('Verify error message appears in the dialog', async () => {
          await expect(createRulesetDialog.nameTxtFld.errorMsg).toBeVisible()
          await expect(createRulesetDialog.nameTxtFld.errorMsg).toContainText(
            DUPLICATE_NAME_ERROR_MSG(GENERAL_RULESET_OAS30_N.name, LintRulesetApiTypes.OAS_3_0),
          )
        })
      })

      test('P-AQ-RM-CREATE-4 Attempt to create a ruleset without a name', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { portalSettingsPage } = portalPage
        const { rulesetManagementTab } = portalSettingsPage
        const { createRulesetDialog } = rulesetManagementTab

        await navigateToRulesetManagement(portalPage)

        await test.step('Open Create Ruleset dialog', async () => {
          await openCreateRulesetDialog(portalPage)
        })

        await test.step('Upload a file but leave name field blank', async () => {
          const file = { path: SIMPLE_RULESET_FILE.path, name: SIMPLE_RULESET_FILE.name }
          await createRulesetDialog.fillForm({
            file,
          })
        })

        await test.step('Verify Create button remains disabled', async () => {
          await expect(createRulesetDialog.createBtn).toBeDisabled()
        })
      })

      test('P-AQ-RM-CREATE-5 Attempt to create a ruleset without a file', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { portalSettingsPage } = portalPage
        const { rulesetManagementTab } = portalSettingsPage
        const { createRulesetDialog } = rulesetManagementTab

        await navigateToRulesetManagement(portalPage)

        await test.step('Open Create Ruleset dialog', async () => {
          await openCreateRulesetDialog(portalPage)
        })

        await test.step('Fill in a name but do not upload a file', async () => {
          const rulesetName = `${ALIAS_PREFIX}-Test-Name-${testIdN}`
          await createRulesetDialog.fillForm({
            rulesetName,
          })
        })

        await test.step('Verify Create button remains disabled', async () => {
          await expect(createRulesetDialog.createBtn).toBeDisabled()
        })
      })

      test('P-AQ-RM-CREATE-6 Attempt to create a ruleset with an invalid file extension', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { portalSettingsPage } = portalPage
        const { rulesetManagementTab } = portalSettingsPage
        const { createRulesetDialog } = rulesetManagementTab

        const retryIndex = test.info().retry + 1
        const rulesetName = `${ALIAS_PREFIX}-Invalid-File-${retryIndex}-${testIdN}`

        await navigateToRulesetManagement(portalPage)

        await test.step('Open Create Ruleset dialog', async () => {
          await openCreateRulesetDialog(portalPage)
        })

        await test.step('Fill in a unique name', async () => {
          await createRulesetDialog.fillForm({
            rulesetName,
          })
        })

        await test.step('Attempt to upload the invalid extension file', async () => {
          const file = { path: INVALID_EXTENSION_FILE.path, name: INVALID_EXTENSION_FILE.name }
          await createRulesetDialog.fillForm({
            rulesetName,
            file,
          })
        })

        await createRulesetDialog.createBtn.click()

        await test.step('Verify error message is displayed within the dialog', async () => {
          await expect(createRulesetDialog.fileUploadAlert).toBeVisible()
          await expect(createRulesetDialog.fileUploadAlert).toContainText(INVALID_FILE_FORMAT_ERROR_MSG)
        })

        await test.step('Verify dialog remains open', async () => {
          await expect(createRulesetDialog.title).toBeVisible()
        })
      })
    })

    test.describe('Ruleset Activation', () => {
      test('P-AQ-RM-ACTIVATE-1 Activate a new ruleset and verify deactivation of previous active', {
        tag: '@smoke',
      }, async ({ sysadminPage: page, lintRulesetTdm }) => {
        const portalPage = new PortalPage(page)
        const { portalSettingsPage } = portalPage
        const { rulesetManagementTab } = portalSettingsPage
        const { activateRulesetDialog } = rulesetManagementTab

        const retryIndex = test.info().retry + 1
        const rulesetName = `${ALIAS_PREFIX}-Activate-New-${retryIndex}-${testIdN}`

        // Create a new ruleset for activation
        const apiType = LintRulesetApiTypes.OAS_3_0
        const linter = LintRulesetLinters.SPECTRAL
        const rulesetFile = SIMPLE_RULESET_FILE
        await lintRulesetTdm.createRuleset({
          rulesetName,
          apiType,
          linter,
          rulesetFile,
        })

        // Activate GENERAL_RULESET_OAS30_N to ensure it's active before test
        await lintRulesetTdm.activateRuleset(GENERAL_RULESET_OAS30_N)

        await navigateToRulesetManagement(portalPage)

        const previouslyActiveRow = rulesetManagementTab.getRulesetRow(GENERAL_RULESET_OAS30_N.name)
        await test.step('Verify previously active ruleset is active', async () => {
          await expect(previouslyActiveRow.statusCell).toHaveText(STATUS_ACTIVE)
        })

        await test.step('Click the Activate button for the inactive ruleset', async () => {
          const rulesetRow = rulesetManagementTab.getRulesetRow(rulesetName)
          await rulesetRow.openActivateRulesetDialog()
        })

        await test.step('Confirm the action in the dialog', async () => {
          await activateRulesetDialog.proceedBtn.click()
        })

        await test.step('Verify the status of the target ruleset changes to Active', async () => {
          const rulesetRow = rulesetManagementTab.getRulesetRow(rulesetName)
          await expect(rulesetRow.statusCell).toHaveText(STATUS_ACTIVE)
        })

        await test.step('Verify its activation history is updated', async () => {
          const rulesetRow = rulesetManagementTab.getRulesetRow(rulesetName)
          await expect(rulesetRow.activationHistoryCell).toBeVisible()
        })

        await test.step('Verify the status of the previously active ruleset changes to Inactive', async () => {
          const previouslyActiveRow = rulesetManagementTab.getRulesetRow(GENERAL_RULESET_OAS30_N.name)
          await expect(previouslyActiveRow.statusCell).toHaveText(STATUS_INACTIVE)
        })
      })

      test('P-AQ-RM-ACTIVATE-2 Verify Activate button is disabled for an already active ruleset', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { portalSettingsPage } = portalPage
        const { rulesetManagementTab } = portalSettingsPage

        await navigateToRulesetManagement(portalPage)

        const firstRulesetRow = rulesetManagementTab.getRulesetRow(1)

        await test.step('Verify first ruleset row is active', async () => {
          await expect(firstRulesetRow.statusCell).toHaveText(STATUS_ACTIVE)
        })

        await firstRulesetRow.hover()

        await test.step('Verify Activate button is disabled', async () => {
          await expect(firstRulesetRow.activateBtn).toBeDisabled()
        })
      })

      test('P-AQ-RM-ACTIVATE-3 Verify activation history tooltip for a ruleset with multiple activations', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { portalSettingsPage } = portalPage
        const { rulesetManagementTab } = portalSettingsPage

        await navigateToRulesetManagement(portalPage)

        await test.step('Hover over the info icon in the Activation History column', async () => {
          const rulesetRow = rulesetManagementTab.getRulesetRow(PREVIOUSLY_ACTIVE_RULESET_OAS30_N.name)
          await rulesetRow.infoIcon.hover()
        })

        await test.step('Verify tooltip appears with at least two activation records', async () => {
          const rulesetRow = rulesetManagementTab.getRulesetRow(PREVIOUSLY_ACTIVE_RULESET_OAS30_N.name)
          const tooltip = rulesetRow.activationHistoryTooltip
          await expect(tooltip.title).toBeVisible()

          // Wait for tooltip to fully load and verify at least two activation records exist
          const firstRecord = tooltip.getActivationRecord(1)
          await expect(firstRecord).toBeVisible()

          const secondRecord = tooltip.getActivationRecord(2)
          await expect(secondRecord).toBeVisible()
        })
      })
    })

    test.describe('Ruleset Deletion', () => {
      test('P-AQ-RM-DEL-1 Verify deletion is disabled for an active ruleset', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { portalSettingsPage } = portalPage
        const { rulesetManagementTab } = portalSettingsPage

        await navigateToRulesetManagement(portalPage)

        const firstRulesetRow = rulesetManagementTab.getRulesetRow(1)

        await test.step('Verify first ruleset row is active', async () => {
          await expect(firstRulesetRow.statusCell).toHaveText(STATUS_ACTIVE)
        })

        await firstRulesetRow.hover()

        await firstRulesetRow.deleteBtn.hover({ force: true })

        await test.step('Verify tooltip reads Cannot delete active ruleset', async () => {
          await expect(portalPage.tooltip).toHaveText(CANNOT_DELETE_ACTIVE_TOOLTIP)
        })
      })

      test('P-AQ-RM-DEL-2 Verify deletion is disabled for a previously activated ruleset', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { portalSettingsPage } = portalPage
        const { rulesetManagementTab } = portalSettingsPage

        await navigateToRulesetManagement(portalPage)

        const rulesetRow = rulesetManagementTab.getRulesetRow(PREVIOUSLY_ACTIVE_RULESET_OAS30_N.name)

        await test.step('Verify ruleset is inactive', async () => {
          await expect(rulesetRow.statusCell).toHaveText(STATUS_INACTIVE)
        })

        await rulesetRow.hover()

        await rulesetRow.deleteBtn.hover({ force: true })

        await test.step('Verify tooltip reads The ruleset cannot be deleted due to existing versions', async () => {
          await expect(portalPage.tooltip).toHaveText(CANNOT_DELETE_WITH_HISTORY_TOOLTIP)
        })
      })

      test('P-AQ-RM-DEL-3 Delete a never-activated inactive ruleset', async ({ sysadminPage: page, lintRulesetTdm }) => {
        const portalPage = new PortalPage(page)
        const { portalSettingsPage } = portalPage
        const { rulesetManagementTab } = portalSettingsPage
        const { deleteRulesetDialog } = rulesetManagementTab

        const retryIndex = test.info().retry + 1
        const rulesetName = `${ALIAS_PREFIX}-Delete-NeverActivated-${retryIndex}-${testIdN}`

        // Create a never-activated inactive ruleset
        const apiType = LintRulesetApiTypes.OAS_3_0
        const linter = LintRulesetLinters.SPECTRAL
        const rulesetFile = SIMPLE_RULESET_FILE
        await lintRulesetTdm.createRuleset({
          rulesetName,
          apiType,
          linter,
          rulesetFile,
        })

        await navigateToRulesetManagement(portalPage)

        const rulesetRow = rulesetManagementTab.getRulesetRow(rulesetName)
        await rulesetRow.openDeleteRulesetDialog()

        await test.step('Confirm deletion', async () => {
          await deleteRulesetDialog.deleteBtn.click()
        })

        await test.step('Verify success notification appears', async () => {
          await expect(portalPage.snackbar).toContainText(RULESET_DELETED_SUCCESS_MSG(rulesetName))
        })

        await test.step('Verify the ruleset is removed from the table', async () => {
          await expect(rulesetRow.nameCell).toBeHidden()
        })
      })
    })

    test.describe('Ruleset Export and Sharing', () => {
      test('P-AQ-RM-SHARE-1 Download a ruleset file', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { portalSettingsPage } = portalPage
        const { rulesetManagementTab } = portalSettingsPage

        await navigateToRulesetManagement(portalPage)

        await test.step('Click the Download action for a ruleset', async () => {
          const rulesetRow = rulesetManagementTab.getRulesetRow(GENERAL_RULESET_OAS30_N.name)
          const downloadedFile = await rulesetRow.downloadRuleset()

          await test.step('Verify the browser initiates a download of the correct ruleset file', async () => {
            await expectFile(downloadedFile).toHaveName(SIMPLE_RULESET_FILE.name)
            await expectFile(downloadedFile).toContainText(SIMPLE_RULESET_FILE.testMeta!.yamlString!)
          })
        })
      })

      test('P-AQ-RM-SHARE-2 Copy a ruleset link and verify URL format', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { portalSettingsPage } = portalPage
        const { rulesetManagementTab } = portalSettingsPage

        await navigateToRulesetManagement(portalPage)

        await test.step('Click the Copy Link action', async () => {
          const rulesetRow = rulesetManagementTab.getRulesetRow(GENERAL_RULESET_OAS30_N.name)
          const copiedUrl = await rulesetRow.copyPublicUrl()

          await test.step('Verify success notification appears', async () => {
            await expect(portalPage.snackbar).toContainText(PUBLIC_URL_COPIED_SUCCESS_MSG)
          })

          await test.step('Verify clipboard contains a valid, direct URL', async () => {
            await expectText(copiedUrl).toContain(`/api-linter/api/v1/rulesets/${GENERAL_RULESET_OAS30_N.id}/data`)
          })
        })
      })
    })

    test.describe('Filtering and Data Display', () => {
      test('P-AQ-RM-FILTER-1 Filter rulesets by API type', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { portalSettingsPage } = portalPage
        const { rulesetManagementTab } = portalSettingsPage

        await navigateToRulesetManagement(portalPage)

        await test.step('Verify OAS 3.0 rulesets are visible', async () => {
          const rulesetRow = rulesetManagementTab.getRulesetRow(INACTIVE_RULESET_OAS30_N.name)
          await expect(rulesetRow.nameCell).toBeVisible()
        })

        await test.step('Switch the API type selector from OAS 3.0 to OAS 3.1', async () => {
          await rulesetManagementTab.rulesetTypeSlt.click()
          const oas31Option = rulesetManagementTab.rulesetTypeSlt.getListItem(
            RULESET_API_TYPE_TITLE_MAP[LintRulesetApiTypes.OAS_3_1],
          )
          await oas31Option.click()
        })

        await test.step('Verify the table updates to show only the rulesets for OAS 3.1', async () => {
          const rulesetRow = rulesetManagementTab.getRulesetRow(INACTIVE_RULESET_OAS31_N.name)
          await expect(rulesetRow.nameCell).toBeVisible()

          // Verify OAS 3.0 ruleset is not visible
          const oas30RulesetRow = rulesetManagementTab.getRulesetRow(INACTIVE_RULESET_OAS30_N.name)
          await expect(oas30RulesetRow.nameCell).toBeHidden()
        })
      })
    })
  })
})
