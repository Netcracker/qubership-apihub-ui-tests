import { test } from '@fixtures'
import type { Page } from '@playwright/test'
import {
  LintRulesetApiTypes,
  LintRulesetLinters,
  LintRulesetStatuses,
  RULESET_API_TYPE_TITLE_MAP,
  SERVER_DEFAULT_RULESETS,
} from '@portal/entities'
import { PortalPage } from '@portal/pages'
import { expect, expectFile, expectText } from '@services/expect-decorator'
import type { LintRulesetsTestDataManager } from '@services/test-data-manager'
import { formatDateToUI } from '@services/utils'
import { ROOT_RESOURCES, TestFile } from '@shared/entities'
import { VAR_GR } from '@test-data/portal/groups'
import { ALIAS_PREFIX } from '@test-data/prefixes'
import type { Version } from '@test-data/props'
import { Group, Package } from '@test-data/props'
import { HOOK_PUBLISH_TIMEOUT } from '@test-setup'
import path from 'node:path'

// Global helper functions
const activateDefaultRulesetsAndCleanup = async (
  lintRulesetTdm: LintRulesetsTestDataManager,
  testIdN: string,
): Promise<void> => {
  // Activate default rulesets for all API types used in tests
  const apiTypes = [LintRulesetApiTypes.OAS_3_0, LintRulesetApiTypes.OAS_3_1]
  for (const apiType of apiTypes) {
    const defaultRuleset = await lintRulesetTdm.getRulesetByName({
      rulesetName: SERVER_DEFAULT_RULESETS[apiType],
      apiType: apiType,
    })
    if (defaultRuleset) {
      await lintRulesetTdm.activateRuleset({
        id: defaultRuleset.id,
        name: defaultRuleset.name,
      })
    }
  }
  await lintRulesetTdm.deleteTestRulesets(testIdN)
}

test.describe('API Quality Validation', () => {
  const testIdN = process.env.TEST_ID_N!

  // Shared constants
  const { ACTIVE: STATUS_ACTIVE, INACTIVE: STATUS_INACTIVE } = LintRulesetStatuses
  const currentFormattedDate = formatDateToUI(new Date())

  // Shared helper functions
  const mockSystemConfigurationToDisableLinter = async (page: Page): Promise<void> => {
    await test.step('Mock system configuration API to disable linter', async () => {
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
    })
  }

  test.afterAll(async ({ lintRulesetTdm }) => {
    await activateDefaultRulesetsAndCleanup(lintRulesetTdm, testIdN)
  })

  test.describe('Ruleset Management', () => {
    // Constants
    const DEFAULT_API_TYPE_LABEL = RULESET_API_TYPE_TITLE_MAP[LintRulesetApiTypes.OAS_3_0]

    // Test resource files
    const FILE_SIMPLE_RULESET = new TestFile(`${ROOT_RESOURCES}/portal/api-quality/rulesets/simple-ruleset.yaml`, {
      yamlString: 'rules:',
    })
    const FILE_INVALID_EXTENSION = new TestFile(`${ROOT_RESOURCES}/portal/api-quality/rulesets/invalid-extension.txt`)

    // Messages
    const MSG_RULESET_CREATED_SUCCESS = (rulesetName: string): string => `${rulesetName} ruleset has been created`
    const MSG_RULESET_DELETED_SUCCESS = (rulesetName: string): string => `${rulesetName} ruleset has been deleted`
    const MSG_PUBLIC_URL_COPIED_SUCCESS = 'Public URL copied'
    const MSG_DUPLICATE_NAME = (rulesetName: string, apiType: string): string =>
      `Ruleset name ${rulesetName} is not unique for API type ${apiType}`
    const MSG_INVALID_FILE_FORMAT = 'File format must be YAML'

    // Tooltip messages
    const TIP_CANNOT_DELETE_ACTIVE = 'Cannot delete active ruleset'
    const TIP_CANNOT_DELETE_WITH_HISTORY =
      'The ruleset cannot be deleted due to existing versions that have been validated against this ruleset'

    // Ruleset data
    let RUL_INACTIVE_OAS30_N: { id: string; name: string }
    let RUL_PREVIOUSLY_ACTIVE_OAS30_N: { id: string; name: string }
    let RUL_INACTIVE_OAS31_N: { id: string; name: string }
    let RUL_GENERAL_OAS30_N: { id: string; name: string }

    // Helper functions
    const navigateToRulesetManagement = async (portalPage: PortalPage): Promise<void> => {
      await test.step('Navigate to Ruleset Management tab', async () => {
        await portalPage.goto('/portal/settings/rulesets')
      })
    }

    test.beforeAll(async ({ lintRulesetTdm }) => {
      const rulesetNamePrefix = `${ALIAS_PREFIX}-`

      const inactiveOas30 = await lintRulesetTdm.createRuleset({
        rulesetName: `${rulesetNamePrefix}Inactive-OAS30-${testIdN}`,
        apiType: LintRulesetApiTypes.OAS_3_0,
        linter: LintRulesetLinters.SPECTRAL,
        rulesetFile: FILE_SIMPLE_RULESET,
      })
      RUL_INACTIVE_OAS30_N = { id: inactiveOas30.id, name: inactiveOas30.name }

      const inactiveOas31 = await lintRulesetTdm.createRuleset({
        rulesetName: `${rulesetNamePrefix}Inactive-OAS31-${testIdN}`,
        apiType: LintRulesetApiTypes.OAS_3_1,
        linter: LintRulesetLinters.SPECTRAL,
        rulesetFile: FILE_SIMPLE_RULESET,
      })
      RUL_INACTIVE_OAS31_N = { id: inactiveOas31.id, name: inactiveOas31.name }

      const generalOas30 = await lintRulesetTdm.createRuleset({
        rulesetName: `${rulesetNamePrefix}General-OAS30-${testIdN}`,
        apiType: LintRulesetApiTypes.OAS_3_0,
        linter: LintRulesetLinters.SPECTRAL,
        rulesetFile: FILE_SIMPLE_RULESET,
      })
      RUL_GENERAL_OAS30_N = { id: generalOas30.id, name: generalOas30.name }

      const previouslyActive = await lintRulesetTdm.createRuleset({
        rulesetName: `${rulesetNamePrefix}PreviouslyActive-OAS30-${testIdN}`,
        apiType: LintRulesetApiTypes.OAS_3_0,
        linter: LintRulesetLinters.SPECTRAL,
        rulesetFile: FILE_SIMPLE_RULESET,
      })
      RUL_PREVIOUSLY_ACTIVE_OAS30_N = { id: previouslyActive.id, name: previouslyActive.name }

      // Establish activation history: activate PREVIOUSLY_ACTIVE_RULESET_OAS30_N three times
      // (last activation is shown in table, previous ones in tooltip)
      for (let i = 0; i < 3; i++) {
        await lintRulesetTdm.activateRuleset(RUL_PREVIOUSLY_ACTIVE_OAS30_N)
        await lintRulesetTdm.activateRuleset(RUL_GENERAL_OAS30_N)
      }
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
        const { rulesetManagementTab } = portalPage.portalSettingsPage

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
        const { rulesetManagementTab } = portalPage.portalSettingsPage
        const { createRulesetDialog } = rulesetManagementTab

        await navigateToRulesetManagement(portalPage)

        await rulesetManagementTab.openCreateRulesetDialog()

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
        const { rulesetManagementTab } = portalPage.portalSettingsPage
        const { createRulesetDialog } = rulesetManagementTab

        const retryIndex = test.info().retry + 1
        const rulesetName = `${ALIAS_PREFIX}-Create-New-${retryIndex}-${testIdN}`

        await navigateToRulesetManagement(portalPage)

        await rulesetManagementTab.openCreateRulesetDialog()

        await test.step('Fill in unique name and upload file', async () => {
          const file = { path: FILE_SIMPLE_RULESET.path, name: FILE_SIMPLE_RULESET.name }
          await createRulesetDialog.fillForm({
            rulesetName,
            file,
          })
        })

        await createRulesetDialog.createBtn.click()

        const rulesetRow = rulesetManagementTab.getRulesetRow(rulesetName)

        await test.step('Verify success notification appears', async () => {
          await expect(portalPage.snackbar).toContainText(MSG_RULESET_CREATED_SUCCESS(rulesetName))
        })

        await test.step('Verify new Inactive ruleset is in the table', async () => {
          await expect(rulesetRow.nameCell).toHaveText(rulesetName)
          await expect(rulesetRow.statusCell).toHaveText(STATUS_INACTIVE)
          await expect(rulesetRow.activationHistoryCell).toBeEmpty()
        })

        await test.step('Verify created date format', async () => {
          await expect(rulesetRow.createdAtCell).toHaveText(currentFormattedDate)
        })
      })

      test('P-AQ-RM-CREATE-3 Attempt to create a ruleset with a duplicate name', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage
        const { createRulesetDialog } = rulesetManagementTab

        await navigateToRulesetManagement(portalPage)

        await rulesetManagementTab.openCreateRulesetDialog()

        await test.step('Fill in duplicate name and upload file', async () => {
          const file = { path: FILE_SIMPLE_RULESET.path, name: FILE_SIMPLE_RULESET.name }
          const rulesetName = RUL_GENERAL_OAS30_N.name
          await createRulesetDialog.fillForm({
            rulesetName,
            file,
          })
        })

        await createRulesetDialog.createBtn.click()

        await test.step('Verify error message appears in the dialog', async () => {
          await expect(createRulesetDialog.nameTxtFld.errorMsg).toBeVisible()
          await expect(createRulesetDialog.nameTxtFld.errorMsg).toContainText(
            MSG_DUPLICATE_NAME(RUL_GENERAL_OAS30_N.name, LintRulesetApiTypes.OAS_3_0),
          )
        })
      })

      test('P-AQ-RM-CREATE-4 Attempt to create a ruleset without a name', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage
        const { createRulesetDialog } = rulesetManagementTab

        await navigateToRulesetManagement(portalPage)

        await rulesetManagementTab.openCreateRulesetDialog()

        await test.step('Upload a file but leave name field blank', async () => {
          const file = { path: FILE_SIMPLE_RULESET.path, name: FILE_SIMPLE_RULESET.name }
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
        const { rulesetManagementTab } = portalPage.portalSettingsPage
        const { createRulesetDialog } = rulesetManagementTab

        await navigateToRulesetManagement(portalPage)

        await rulesetManagementTab.openCreateRulesetDialog()

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
        const { rulesetManagementTab } = portalPage.portalSettingsPage
        const { createRulesetDialog } = rulesetManagementTab

        const retryIndex = test.info().retry + 1
        const rulesetName = `${ALIAS_PREFIX}-Invalid-File-${retryIndex}-${testIdN}`

        await navigateToRulesetManagement(portalPage)

        await rulesetManagementTab.openCreateRulesetDialog()

        await test.step('Fill in a unique name', async () => {
          await createRulesetDialog.fillForm({
            rulesetName,
          })
        })

        await test.step('Attempt to upload the invalid extension file', async () => {
          const file = { path: FILE_INVALID_EXTENSION.path, name: FILE_INVALID_EXTENSION.name }
          await createRulesetDialog.fillForm({
            rulesetName,
            file,
          })
        })

        await createRulesetDialog.createBtn.click()

        await test.step('Verify error message is displayed within the dialog', async () => {
          await expect(createRulesetDialog.fileUploadAlert).toBeVisible()
          await expect(createRulesetDialog.fileUploadAlert).toContainText(MSG_INVALID_FILE_FORMAT)
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
        const { rulesetManagementTab } = portalPage.portalSettingsPage
        const { activateRulesetDialog } = rulesetManagementTab

        const retryIndex = test.info().retry + 1
        const rulesetName = `${ALIAS_PREFIX}-Activate-New-${retryIndex}-${testIdN}`

        // Create a new ruleset for activation
        await lintRulesetTdm.createRuleset({
          rulesetName: rulesetName,
          apiType: LintRulesetApiTypes.OAS_3_0,
          linter: LintRulesetLinters.SPECTRAL,
          rulesetFile: FILE_SIMPLE_RULESET,
        })

        await lintRulesetTdm.activateRuleset(RUL_GENERAL_OAS30_N)

        await navigateToRulesetManagement(portalPage)

        const rulesetRow = rulesetManagementTab.getRulesetRow(rulesetName)
        const previouslyActiveRow = rulesetManagementTab.getRulesetRow(RUL_GENERAL_OAS30_N.name)

        await test.step('Verify previously active ruleset is active', async () => {
          await expect(previouslyActiveRow.statusCell).toHaveText(STATUS_ACTIVE)
        })

        await test.step('Click the Activate button for the inactive ruleset', async () => {
          await rulesetRow.openActivateRulesetDialog()
        })

        await test.step('Confirm the action in the dialog', async () => {
          await activateRulesetDialog.proceedBtn.click()
        })

        await test.step('Verify the status of the target ruleset changes to Active', async () => {
          await expect(rulesetRow.statusCell).toHaveText(STATUS_ACTIVE)
        })

        await test.step('Verify its activation history is updated', async () => {
          await expect(rulesetRow.activationHistoryCell).toHaveText(`${currentFormattedDate} - ...`)
          await expect(rulesetRow.infoIcon).toBeHidden()
        })

        await test.step('Verify the status of the previously active ruleset changes to Inactive', async () => {
          await expect(previouslyActiveRow.statusCell).toHaveText(STATUS_INACTIVE)
        })
      })

      test('P-AQ-RM-ACTIVATE-2 Verify Activate button is disabled for an already active ruleset', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage

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
        const { rulesetManagementTab } = portalPage.portalSettingsPage

        await navigateToRulesetManagement(portalPage)

        const rulesetRow = rulesetManagementTab.getRulesetRow(RUL_PREVIOUSLY_ACTIVE_OAS30_N.name)
        const tooltip = rulesetRow.activationHistoryTooltip
        const firstRecord = tooltip.getActivationRecord(1)
        const secondRecord = tooltip.getActivationRecord(2)

        await test.step('Hover over the info icon in the Activation History column', async () => {
          await rulesetRow.infoIcon.hover()
        })

        await test.step('Verify tooltip appears with at least two activation records', async () => {
          await expect(tooltip.title).toBeVisible()
          await expect(firstRecord).toBeVisible()
          await expect(secondRecord).toBeVisible()
        })

        await test.step('Verify activation history dates format', async () => {
          await expect(firstRecord).toHaveText(`${currentFormattedDate} - ${currentFormattedDate}`)
          await expect(secondRecord).toHaveText(`${currentFormattedDate} - ${currentFormattedDate}`)
        })
      })
    })

    test.describe('Ruleset Deletion', () => {
      test('P-AQ-RM-DEL-1 Verify deletion is disabled for an active ruleset', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage

        await navigateToRulesetManagement(portalPage)

        const firstRulesetRow = rulesetManagementTab.getRulesetRow(1)

        await test.step('Verify first ruleset row is active', async () => {
          await expect(firstRulesetRow.statusCell).toHaveText(STATUS_ACTIVE)
        })

        await firstRulesetRow.hover()

        await firstRulesetRow.deleteBtn.hover({ force: true })

        await test.step('Verify tooltip reads Cannot delete active ruleset', async () => {
          await expect(portalPage.tooltip).toHaveText(TIP_CANNOT_DELETE_ACTIVE)
        })
      })

      test('P-AQ-RM-DEL-2 Verify deletion is disabled for a previously activated ruleset', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage

        await navigateToRulesetManagement(portalPage)

        const rulesetRow = rulesetManagementTab.getRulesetRow(RUL_PREVIOUSLY_ACTIVE_OAS30_N.name)

        await test.step('Verify ruleset is inactive', async () => {
          await expect(rulesetRow.statusCell).toHaveText(STATUS_INACTIVE)
        })

        await rulesetRow.hover()

        await rulesetRow.deleteBtn.hover({ force: true })

        await test.step('Verify tooltip reads The ruleset cannot be deleted due to existing versions', async () => {
          await expect(portalPage.tooltip).toHaveText(TIP_CANNOT_DELETE_WITH_HISTORY)
        })

        await test.step('Verify activation history date format for inactive ruleset with history', async () => {
          await expect(rulesetRow.activationHistoryCell).toHaveText(`${currentFormattedDate} - ${currentFormattedDate}`)
        })
      })

      test('P-AQ-RM-DEL-3 Delete a never-activated inactive ruleset', async ({ sysadminPage: page, lintRulesetTdm }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage
        const { deleteRulesetDialog } = rulesetManagementTab

        const retryIndex = test.info().retry + 1
        const rulesetName = `${ALIAS_PREFIX}-Delete-NeverActivated-${retryIndex}-${testIdN}`

        await lintRulesetTdm.createRuleset({
          rulesetName: rulesetName,
          apiType: LintRulesetApiTypes.OAS_3_0,
          linter: LintRulesetLinters.SPECTRAL,
          rulesetFile: FILE_SIMPLE_RULESET,
        })

        await navigateToRulesetManagement(portalPage)

        const rulesetRow = rulesetManagementTab.getRulesetRow(rulesetName)
        await rulesetRow.openDeleteRulesetDialog()

        await test.step('Confirm deletion', async () => {
          await deleteRulesetDialog.deleteBtn.click()
        })

        await test.step('Verify success notification appears', async () => {
          await expect(portalPage.snackbar).toContainText(MSG_RULESET_DELETED_SUCCESS(rulesetName))
        })

        await test.step('Verify the ruleset is removed from the table', async () => {
          await expect(rulesetRow).toBeHidden()
        })
      })
    })

    test.describe('Ruleset Export and Sharing', () => {
      test('P-AQ-RM-SHARE-1 Download a ruleset file', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage

        await navigateToRulesetManagement(portalPage)

        const rulesetRow = rulesetManagementTab.getRulesetRow(RUL_GENERAL_OAS30_N.name)
        const downloadedFile = await rulesetRow.downloadRuleset()

        await test.step('Verify the browser initiates a download of the correct ruleset file', async () => {
          await expectFile(downloadedFile).toHaveName(FILE_SIMPLE_RULESET.name)
          await expectFile(downloadedFile).toContainText(FILE_SIMPLE_RULESET.testMeta!.yamlString!)
        })
      })

      test('P-AQ-RM-SHARE-2 Copy a ruleset link and verify URL format', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage

        await navigateToRulesetManagement(portalPage)

        const rulesetRow = rulesetManagementTab.getRulesetRow(RUL_GENERAL_OAS30_N.name)
        const copiedUrl = await rulesetRow.copyPublicUrl()

        await test.step('Verify success notification appears', async () => {
          await expect(portalPage.snackbar).toContainText(MSG_PUBLIC_URL_COPIED_SUCCESS)
        })

        await test.step('Verify clipboard contains a valid, direct URL', async () => {
          await expectText(copiedUrl).toContain(`/api-linter/api/v1/rulesets/${RUL_GENERAL_OAS30_N.id}/data`)
        })
      })
    })

    test.describe('Filtering and Data Display', () => {
      test('P-AQ-RM-FILTER-1 Filter rulesets by API type', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { rulesetManagementTab } = portalPage.portalSettingsPage

        await navigateToRulesetManagement(portalPage)

        await test.step('Verify OAS 3.0 rulesets are visible', async () => {
          const rulesetRow = rulesetManagementTab.getRulesetRow(RUL_INACTIVE_OAS30_N.name)
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
          const rulesetRow = rulesetManagementTab.getRulesetRow(RUL_INACTIVE_OAS31_N.name)
          await expect(rulesetRow.nameCell).toBeVisible()

          // Verify OAS 3.0 ruleset is not visible
          const oas30RulesetRow = rulesetManagementTab.getRulesetRow(RUL_INACTIVE_OAS30_N.name)
          await expect(oas30RulesetRow.nameCell).toBeHidden()
        })
      })
    })
  })

  test.describe('Quality Summary Tab', () => {
    // Constants
    const OAS_30_LABEL = RULESET_API_TYPE_TITLE_MAP[LintRulesetApiTypes.OAS_3_0]
    const OAS_31_LABEL = RULESET_API_TYPE_TITLE_MAP[LintRulesetApiTypes.OAS_3_1]

    // Test resource files
    const ROOT_API_QUALITY = path.join(ROOT_RESOURCES, 'portal', 'api-quality')
    const FILE_SUMMARY_RULESET = new TestFile(path.join(ROOT_API_QUALITY, 'rulesets', 'summary-ruleset.yaml'), {
      yamlString: 'rules:',
    })
    const FILE_SIMPLE_RULESET = new TestFile(path.join(ROOT_API_QUALITY, 'rulesets', 'simple-ruleset.yaml'), {
      yamlString: 'rules:',
    })
    const FILE_SUMMARY_OAS30 = new TestFile(path.join(ROOT_API_QUALITY, 'specs', 'summary-oas30.yaml'))
    const FILE_SUMMARY_OAS31 = new TestFile(path.join(ROOT_API_QUALITY, 'specs', 'summary-oas31.yaml'))
    const FILE_SUMMARY_GRAPHQL = new TestFile(path.join(ROOT_API_QUALITY, 'specs', 'summary-graphql.graphql'))

    // Messages
    const MSG_NO_VALIDATION_RESULTS = 'No validation results.'
    const MSG_CHECKING_VALIDATION = 'Checking validation status...'
    const MSG_VALIDATION_IN_PROGRESS = 'Validation is in progress, please wait...'

    // Issue count constants for single document tests
    const ISSUE_COUNTS_INITIAL = {
      error: '1',
      warning: '1',
      info: '1',
      hint: '1',
    } as const

    const ISSUE_COUNTS_CHANGED = {
      error: '0',
      warning: '1',
      info: '0',
      hint: '0',
    } as const

    // Issue count constants for multi-document tests
    const MULTI_DOC_ISSUE_COUNTS_INITIAL = {
      error: '2',
      warning: '2',
      info: '2',
      hint: '2',
    } as const

    const MULTI_DOC_ISSUE_COUNTS_CHANGED = {
      error: '1',
      warning: '2',
      info: '1',
      hint: '1',
    } as const

    // Tooltip messages
    const TIP_ISSUE_ERROR =
      'ErrorA critical violation of the OpenAPI specification that must be fixed. These issues break compliance and may prevent the API from functioning or integrating correctly.'
    const TIP_ISSUE_WARNING =
      'WarningA significant deviation from recommended practices that should be addressed. While not invalid, it may lead to misunderstandings or misuse by API consumers.'
    const TIP_ISSUE_INFO =
      'InfoA non-blocking suggestion to improve clarity, completeness, or usability. These enhancements help make the API more developer-friendly.'
    const TIP_ISSUE_HINT =
      'HintAn optional recommendation for advanced design improvements or optimizations. Helps raise the overall quality, consistency, and maintainability of the API.'
    const TIP_VALIDATION_FAILED =
      'Validation failed. Some documents could not be processed during quality validation. See information icon below for details about failed documents.'

    // Mock data for failed documents
    const MOCK_FAILED_DOC_1 = 'failed-doc-1.yaml'
    const MOCK_FAILED_DOC_2 = 'failed-doc-2.yaml'
    const FAILED_DOCS_COUNT = '2'

    // Test data entities
    const G_AQ = new Group({
      name: 'API-Quality',
      alias: 'GAQ',
      parent: VAR_GR,
    })

    const PKG_AQ_SUMMARY_N = new Package({
      name: 'Quality-Summary',
      alias: 'PAQSUM',
      parent: G_AQ,
    })

    const V_OAS30_N: Version = {
      pkg: PKG_AQ_SUMMARY_N,
      version: 'v1-oas30',
      status: 'draft',
      files: [{ file: FILE_SUMMARY_OAS30 }],
    }

    const V_MULTI_SPEC_N: Version = {
      pkg: PKG_AQ_SUMMARY_N,
      version: 'v2-multi',
      status: 'draft',
      files: [
        { file: FILE_SUMMARY_OAS30 },
        { file: FILE_SUMMARY_OAS31 },
      ],
    }

    const V_MIXED_REST_GQL_N: Version = {
      pkg: PKG_AQ_SUMMARY_N,
      version: 'v3-mixed',
      status: 'draft',
      files: [
        { file: FILE_SUMMARY_OAS30 },
        { file: FILE_SUMMARY_GRAPHQL },
      ],
    }

    // Ruleset data
    let RUL_SUMMARY_OAS30_N: { id: string; name: string }
    let RUL_SUMMARY_OAS31_N: { id: string; name: string }
    let RUL_ALT_OAS30_N: { id: string; name: string }

    // Helper functions
    const mockValidationSummaryError = async (page: Page): Promise<void> => {
      await test.step('Mock validation summary to return error status with failed documents', async () => {
        await page.route('**/validation/summary', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              status: 'error',
              rulesets: [{
                id: 'mock-ruleset-id',
                name: 'Mock Ruleset',
                apiType: LintRulesetApiTypes.OAS_3_0,
                status: STATUS_ACTIVE,
              }],
              documents: [
                {
                  slug: 'doc-1',
                  documentName: MOCK_FAILED_DOC_1,
                  apiType: LintRulesetApiTypes.OAS_3_0,
                  status: 'error',
                },
                {
                  slug: 'doc-2',
                  documentName: MOCK_FAILED_DOC_2,
                  apiType: LintRulesetApiTypes.OAS_3_0,
                  status: 'error',
                },
              ],
            }),
          })
        })
      })
    }

    const mockValidationSummaryNotFound = async (page: Page): Promise<void> => {
      await test.step('Mock validation summary to return 404 LintResultNotFound', async () => {
        await page.route('**/validation/summary', async (route) => {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({
              code: 'LintResultNotFound',
              message: 'Lint result not found',
            }),
          })
        })
      })
    }

    const mockValidationSummaryLoading = async (page: Page): Promise<void> => {
      await test.step('Mock validation summary to delay response indefinitely', async () => {
        await page.route('**/validation/summary', async () => {
          // Never fulfill - simulate loading state
          await new Promise(() => {})
        })
      })
    }

    const mockValidationSummaryInProgress = async (page: Page): Promise<void> => {
      await test.step('Mock validation summary to return inProgress status', async () => {
        await page.route('**/validation/summary', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              status: 'inProgress',
              rulesets: [],
            }),
          })
        })
      })
    }

    test.beforeAll(async ({ apihubTDM, lintRulesetTdm }) => {
      // Extended timeout for API publishing
      test.setTimeout(HOOK_PUBLISH_TIMEOUT)

      // Create group and package hierarchy
      await apihubTDM.createPackage([
        G_AQ,
        PKG_AQ_SUMMARY_N,
      ])

      // Create custom rulesets for quality validation
      const oas30Ruleset = await lintRulesetTdm.createRuleset({
        rulesetName: `${ALIAS_PREFIX}-Summary-OAS30-${testIdN}`,
        apiType: LintRulesetApiTypes.OAS_3_0,
        linter: LintRulesetLinters.SPECTRAL,
        rulesetFile: FILE_SUMMARY_RULESET,
      })
      RUL_SUMMARY_OAS30_N = { id: oas30Ruleset.id, name: oas30Ruleset.name }

      const oas31Ruleset = await lintRulesetTdm.createRuleset({
        rulesetName: `${ALIAS_PREFIX}-Summary-OAS31-${testIdN}`,
        apiType: LintRulesetApiTypes.OAS_3_1,
        linter: LintRulesetLinters.SPECTRAL,
        rulesetFile: FILE_SUMMARY_RULESET,
      })
      RUL_SUMMARY_OAS31_N = { id: oas31Ruleset.id, name: oas31Ruleset.name }

      const altOas30Ruleset = await lintRulesetTdm.createRuleset({
        rulesetName: `${ALIAS_PREFIX}-Alt-OAS30-${testIdN}`,
        apiType: LintRulesetApiTypes.OAS_3_0,
        linter: LintRulesetLinters.SPECTRAL,
        rulesetFile: FILE_SIMPLE_RULESET,
      })
      RUL_ALT_OAS30_N = { id: altOas30Ruleset.id, name: altOas30Ruleset.name }

      // Establish activation history
      await lintRulesetTdm.activateRuleset(RUL_SUMMARY_OAS30_N)
      await lintRulesetTdm.activateRuleset(RUL_ALT_OAS30_N)

      // Activate final rulesets for tests
      await lintRulesetTdm.activateRuleset(RUL_SUMMARY_OAS30_N)
      await lintRulesetTdm.activateRuleset(RUL_SUMMARY_OAS31_N)

      // Publish versions for quality validation tests
      await apihubTDM.publishVersion(V_OAS30_N)
      await apihubTDM.publishVersion(V_MULTI_SPEC_N)
      await apihubTDM.publishVersion(V_MIXED_REST_GQL_N)
    })

    test.describe('UI Visibility and Access Control', () => {
      test('P-AQ-SM-UI-1 Verify Quality Validation section visibility for REST API', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { restApi } = portalPage.versionPackagePage.overviewTab.summaryTab.body
        const { qualityValidation } = restApi

        await portalPage.gotoVersion(V_OAS30_N)

        await test.step('Verify REST API section is visible', async () => {
          await expect(restApi.operations).toBeVisible()
        })

        await test.step('Verify the Quality Validation section is visible within the REST section', async () => {
          await expect(qualityValidation.title).toBeVisible()
        })
      })

      test('P-AQ-SM-UI-2 Verify Mixed API Types display - REST with GraphQL', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { body } = portalPage.versionPackagePage.overviewTab.summaryTab
        const { restApi, graphQl } = body

        await portalPage.gotoVersion(V_MIXED_REST_GQL_N)

        await test.step('Verify REST API section is visible WITH Quality Validation section', async () => {
          await expect(restApi.operations).toBeVisible()
          await expect(restApi.qualityValidation.title).toBeVisible()
        })

        await test.step('Verify GraphQL API section is visible WITHOUT Quality Validation section', async () => {
          await expect(graphQl.operations).toBeVisible()
          await expect(graphQl.qualityValidation.title).toBeHidden()
        })
      })

      test('P-AQ-SM-UI-3-M Verify Quality Validation section is hidden when linter is disabled', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { restApi } = portalPage.versionPackagePage.overviewTab.summaryTab.body
        const { qualityValidation } = restApi

        await mockSystemConfigurationToDisableLinter(page)

        await portalPage.gotoVersion(V_OAS30_N)

        await test.step('Verify REST API section is visible to confirm page loaded correctly', async () => {
          await expect(restApi.operations).toBeVisible()
        })

        await test.step('Verify the Quality Validation section is NOT visible', async () => {
          await expect(qualityValidation.title).toBeHidden()
        })
      })
    })

    test.describe('Content', () => {
      test('P-AQ-SM-CONTENT-1 Verify Ruleset info for single document', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { qualityValidation } = portalPage.versionPackagePage.overviewTab.summaryTab.body.restApi

        await portalPage.gotoVersion(V_OAS30_N)

        await test.step('Verify one ruleset is listed', async () => {
          await expect(qualityValidation.getValidationRuleset()).toHaveCount(1)
        })

        const ruleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)

        await test.step('Verify ruleset displays correct info', async () => {
          await expect(ruleset.nameLink).toBeVisible()
          await expect(ruleset.apiTypeChip).toHaveText(OAS_30_LABEL)
          await expect(ruleset.statusChip).toHaveText(STATUS_ACTIVE)
        })
      })

      test('P-AQ-SM-CONTENT-2 Verify Ruleset list items for multi-document version', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { qualityValidation } = portalPage.versionPackagePage.overviewTab.summaryTab.body.restApi

        await portalPage.gotoVersion(V_MULTI_SPEC_N)

        await test.step('Verify two rulesets are listed', async () => {
          await expect(qualityValidation.getValidationRuleset()).toHaveCount(2)
        })

        const firstRuleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
        const secondRuleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS31_N.name)

        await test.step('Verify first ruleset displays correct info', async () => {
          await expect(firstRuleset.nameLink).toBeVisible()
          await expect(firstRuleset.apiTypeChip).toHaveText(OAS_30_LABEL)
          await expect(firstRuleset.statusChip).toHaveText(STATUS_ACTIVE)
        })

        await test.step('Verify second ruleset displays correct info', async () => {
          await expect(secondRuleset.nameLink).toBeVisible()
          await expect(secondRuleset.apiTypeChip).toHaveText(OAS_31_LABEL)
          await expect(secondRuleset.statusChip).toHaveText(STATUS_ACTIVE)
        })
      })

      test('P-AQ-SM-CONTENT-3 Verify Issue Counts tooltip content', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { qualityValidation } = portalPage.versionPackagePage.overviewTab.summaryTab.body.restApi

        await portalPage.gotoVersion(V_OAS30_N)

        await test.step('Verify issue counts are visible', async () => {
          await expect(qualityValidation.errorCount).toBeVisible()
          await expect(qualityValidation.warningCount).toBeVisible()
          await expect(qualityValidation.infoCount).toBeVisible()
          await expect(qualityValidation.hintCount).toBeVisible()
        })

        await test.step('Hover over the Error count and verify tooltip', async () => {
          await qualityValidation.errorCount.hover()
          await expect(portalPage.tooltip).toHaveText(TIP_ISSUE_ERROR)
        })

        await test.step('Hover over the Warning count and verify tooltip', async () => {
          await qualityValidation.warningCount.hover()
          await expect(portalPage.tooltip).toHaveText(TIP_ISSUE_WARNING)
        })

        await test.step('Hover over the Info count and verify tooltip', async () => {
          await qualityValidation.infoCount.hover()
          await expect(portalPage.tooltip).toHaveText(TIP_ISSUE_INFO)
        })

        await test.step('Hover over the Hint count and verify tooltip', async () => {
          await qualityValidation.hintCount.hover()
          await expect(portalPage.tooltip).toHaveText(TIP_ISSUE_HINT)
        })
      })

      test('P-AQ-SM-CONTENT-4-M Verify Validation Failed state', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { qualityValidation } = portalPage.versionPackagePage.overviewTab.summaryTab.body.restApi

        await mockValidationSummaryError(page)
        await portalPage.gotoVersion(V_OAS30_N)

        await test.step('Verify red warning icon is visible', async () => {
          await expect(qualityValidation.alertIcon).toBeVisible()
        })

        await test.step('Hover over warning icon and verify tooltip shows failure message', async () => {
          await qualityValidation.alertIcon.hover()
          await expect(portalPage.tooltip).toHaveText(TIP_VALIDATION_FAILED)
        })

        await test.step('Verify failed documents count', async () => {
          await expect(qualityValidation.failedDocuments).toHaveText(FAILED_DOCS_COUNT)
        })

        await test.step('Hover over info icon and verify tooltip shows failed document names', async () => {
          await qualityValidation.failedDocumentsInfoIcon.hover()
          await expect(portalPage.tooltip).toContainText(MOCK_FAILED_DOC_1)
          await expect(portalPage.tooltip).toContainText(MOCK_FAILED_DOC_2)
        })
      })
    })

    test.describe('Ruleset Info Popup Interactions', () => {
      test('P-AQ-SM-POPUP-1 Verify Ruleset Info Popup opens and displays correct content', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { summaryTab } = portalPage.versionPackagePage.overviewTab
        const { qualityValidation } = summaryTab.body.restApi
        const { rulesetInfoDialog } = summaryTab

        await portalPage.gotoVersion(V_OAS30_N)

        const ruleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
        await ruleset.nameLink.click()

        await test.step('Verify dialog displays correct content', async () => {
          await expect(rulesetInfoDialog.title).toContainText(RUL_SUMMARY_OAS30_N.name)
          await expect(rulesetInfoDialog.apiTypeChip).toHaveText(OAS_30_LABEL)
          await expect(rulesetInfoDialog.statusChip).toHaveText(STATUS_ACTIVE)
          await expect(rulesetInfoDialog.rulesetFile).toContainText(FILE_SUMMARY_RULESET.name)
        })
      })

      test('P-AQ-SM-POPUP-2 Verify multiple Rulesets can be opened in multi-spec version', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { summaryTab } = portalPage.versionPackagePage.overviewTab
        const { qualityValidation } = summaryTab.body.restApi
        const { rulesetInfoDialog } = summaryTab

        await portalPage.gotoVersion(V_MULTI_SPEC_N)

        const firstRuleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
        const secondRuleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS31_N.name)

        await test.step('Click on the first ruleset and verify popup content', async () => {
          await firstRuleset.nameLink.click()
          await expect(rulesetInfoDialog.title).toContainText(RUL_SUMMARY_OAS30_N.name)
          await expect(rulesetInfoDialog.apiTypeChip).toHaveText(OAS_30_LABEL)
          await expect(rulesetInfoDialog.statusChip).toHaveText(STATUS_ACTIVE)
          await expect(rulesetInfoDialog.rulesetFile).toContainText(FILE_SUMMARY_RULESET.name)
        })

        await rulesetInfoDialog.closeBtn.click()

        await test.step('Click on the second ruleset and verify popup content', async () => {
          await secondRuleset.nameLink.click()
          await expect(rulesetInfoDialog.title).toContainText(RUL_SUMMARY_OAS31_N.name)
          await expect(rulesetInfoDialog.apiTypeChip).toHaveText(OAS_31_LABEL)
          await expect(rulesetInfoDialog.statusChip).toHaveText(STATUS_ACTIVE)
          await expect(rulesetInfoDialog.rulesetFile).toContainText(FILE_SUMMARY_RULESET.name)
        })
      })

      test('P-AQ-SM-POPUP-3 Verify Download ruleset file', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { summaryTab } = portalPage.versionPackagePage.overviewTab
        const { qualityValidation } = summaryTab.body.restApi
        const { rulesetInfoDialog } = summaryTab

        await portalPage.gotoVersion(V_OAS30_N)

        const ruleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
        await ruleset.nameLink.click()

        const downloadedFile = await rulesetInfoDialog.downloadRuleset()

        await test.step('Verify downloaded file has correct content', async () => {
          await expectFile(downloadedFile).toContainText(FILE_SUMMARY_RULESET.testMeta!.yamlString!)
        })
      })

      test('P-AQ-SM-POPUP-4 Verify Copy Link to ruleset', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { summaryTab } = portalPage.versionPackagePage.overviewTab
        const { qualityValidation } = summaryTab.body.restApi
        const { rulesetInfoDialog } = summaryTab

        await portalPage.gotoVersion(V_OAS30_N)

        const ruleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
        await ruleset.nameLink.click()

        const copiedUrl = await rulesetInfoDialog.copyPublicUrl()

        await test.step('Verify clipboard contains URL matching expected pattern', async () => {
          await expectText(copiedUrl).toContain(`/api-linter/api/v1/rulesets/${RUL_SUMMARY_OAS30_N.id}/data`)
        })
      })

      test('P-AQ-SM-POPUP-5 Verify Activation History table content', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { summaryTab } = portalPage.versionPackagePage.overviewTab
        const { qualityValidation } = summaryTab.body.restApi
        const { rulesetInfoDialog } = summaryTab

        await portalPage.gotoVersion(V_OAS30_N)

        const ruleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
        await ruleset.nameLink.click()

        const firstRecord = rulesetInfoDialog.getActivationRecord(1)
        const secondRecord = rulesetInfoDialog.getActivationRecord(2)

        await test.step('Verify activation history contains at least two rows with correct date formats', async () => {
          await expect(firstRecord).toBeVisible()
          await expect(secondRecord).toBeVisible()
          await expect(firstRecord).toContainText(`${currentFormattedDate} - ...`)
          await expect(secondRecord).toContainText(`${currentFormattedDate} - ${currentFormattedDate}`)
        })
      })
    })

    test.describe('Manual Validation', () => {
      test.skip('P-AQ-SM-RUN-1 Verify re-validation updates status and issue counts for single document', {
        tag: '@smoke',
        annotation: { type: 'Issue', description: 'https://github.com/Netcracker/qubership-apihub/issues/437' },
      }, async ({ sysadminPage: page, lintRulesetTdm }) => {
        const portalPage = new PortalPage(page)
        const { qualityValidation } = portalPage.versionPackagePage.overviewTab.summaryTab.body.restApi

        // Setup: Ensure initial state with Summary ruleset active, then run validation, then activate Alt ruleset
        await test.step('Setup initial state via API', async () => {
          await lintRulesetTdm.activateRuleset(RUL_SUMMARY_OAS30_N)
          await lintRulesetTdm.runValidation({
            packageId: PKG_AQ_SUMMARY_N.packageId,
            version: V_OAS30_N.version,
          })
          await lintRulesetTdm.activateRuleset(RUL_ALT_OAS30_N)
        })

        await portalPage.gotoVersion(V_OAS30_N)

        await test.step('Verify initial state shows Inactive status and original issue counts', async () => {
          const ruleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
          await expect(ruleset.statusChip).toHaveText(STATUS_INACTIVE)
          await expect(qualityValidation.errorCount).toHaveText(ISSUE_COUNTS_INITIAL.error)
          await expect(qualityValidation.warningCount).toHaveText(ISSUE_COUNTS_INITIAL.warning)
          await expect(qualityValidation.infoCount).toHaveText(ISSUE_COUNTS_INITIAL.info)
          await expect(qualityValidation.hintCount).toHaveText(ISSUE_COUNTS_INITIAL.hint)
        })

        await qualityValidation.runValidationLink.click()

        await test.step('Wait for validation to complete and verify status and issue counts updated', async () => {
          const ruleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
          await expect(ruleset.statusChip).toHaveText(STATUS_ACTIVE)
          await expect(qualityValidation.errorCount).toHaveText(ISSUE_COUNTS_CHANGED.error)
          await expect(qualityValidation.warningCount).toHaveText(ISSUE_COUNTS_CHANGED.warning)
          await expect(qualityValidation.infoCount).toHaveText(ISSUE_COUNTS_CHANGED.info)
          await expect(qualityValidation.hintCount).toHaveText(ISSUE_COUNTS_CHANGED.hint)
        })
      })

      test.skip('P-AQ-SM-RUN-2 Verify re-validation updates aggregated issue counts for multi-document version', {
        tag: '@smoke',
        annotation: { type: 'Issue', description: 'https://github.com/Netcracker/qubership-apihub/issues/437' },
      }, async ({ sysadminPage: page, lintRulesetTdm }) => {
        const portalPage = new PortalPage(page)
        const { qualityValidation } = portalPage.versionPackagePage.overviewTab.summaryTab.body.restApi

        // Setup: Ensure both rulesets active, run validation, then make OAS 3.0 inactive
        await test.step('Setup initial state via API', async () => {
          await lintRulesetTdm.activateRuleset(RUL_SUMMARY_OAS30_N)
          await lintRulesetTdm.activateRuleset(RUL_SUMMARY_OAS31_N)
          await lintRulesetTdm.runValidation({
            packageId: PKG_AQ_SUMMARY_N.packageId,
            version: V_MULTI_SPEC_N.version,
          })
          await lintRulesetTdm.activateRuleset(RUL_ALT_OAS30_N)
        })

        await portalPage.gotoVersion(V_MULTI_SPEC_N)

        await test.step('Verify initial state: OAS 3.0 shows Inactive, OAS 3.1 shows Active', async () => {
          const firstRuleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
          const secondRuleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS31_N.name)
          await expect(firstRuleset.statusChip).toHaveText(STATUS_INACTIVE)
          await expect(secondRuleset.statusChip).toHaveText(STATUS_ACTIVE)
        })

        await test.step('Verify aggregated counts initially', async () => {
          await expect(qualityValidation.errorCount).toHaveText(MULTI_DOC_ISSUE_COUNTS_INITIAL.error)
          await expect(qualityValidation.warningCount).toHaveText(MULTI_DOC_ISSUE_COUNTS_INITIAL.warning)
          await expect(qualityValidation.infoCount).toHaveText(MULTI_DOC_ISSUE_COUNTS_INITIAL.info)
          await expect(qualityValidation.hintCount).toHaveText(MULTI_DOC_ISSUE_COUNTS_INITIAL.hint)
        })

        await qualityValidation.runValidationLink.click()

        await test.step('Wait for validation to complete and verify both rulesets show Active and aggregated counts updated', async () => {
          const firstRuleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
          const secondRuleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS31_N.name)
          await expect(firstRuleset.statusChip).toHaveText(STATUS_ACTIVE)
          await expect(secondRuleset.statusChip).toHaveText(STATUS_ACTIVE)
          await expect(qualityValidation.errorCount).toHaveText(MULTI_DOC_ISSUE_COUNTS_CHANGED.error)
          await expect(qualityValidation.warningCount).toHaveText(MULTI_DOC_ISSUE_COUNTS_CHANGED.warning)
          await expect(qualityValidation.infoCount).toHaveText(MULTI_DOC_ISSUE_COUNTS_CHANGED.info)
          await expect(qualityValidation.hintCount).toHaveText(MULTI_DOC_ISSUE_COUNTS_CHANGED.hint)
        })
      })
    })

    test.describe('Status Transitions', () => {
      test('P-AQ-SM-STATUS-1-M Verify Not Validated state display', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { qualityValidation } = portalPage.versionPackagePage.overviewTab.summaryTab.body.restApi

        await mockValidationSummaryNotFound(page)
        await portalPage.gotoVersion(V_OAS30_N)

        await expect(qualityValidation.placeholder).toContainText(MSG_NO_VALIDATION_RESULTS)
        await expect(qualityValidation.runValidationLink).toBeVisible()
      })

      test('P-AQ-SM-STATUS-2-M Verify Checking status display', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { qualityValidation } = portalPage.versionPackagePage.overviewTab.summaryTab.body.restApi

        await mockValidationSummaryLoading(page)
        await portalPage.gotoVersion(V_OAS30_N)

        await expect(qualityValidation.placeholder).toContainText(MSG_CHECKING_VALIDATION)
      })

      test('P-AQ-SM-STATUS-3-M Verify In Progress status display', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { qualityValidation } = portalPage.versionPackagePage.overviewTab.summaryTab.body.restApi

        await mockValidationSummaryInProgress(page)
        await portalPage.gotoVersion(V_OAS30_N)

        await expect(qualityValidation.placeholder).toContainText(MSG_VALIDATION_IN_PROGRESS)
      })
    })
  })
})
