import { test } from '@fixtures'
import type { Page } from '@playwright/test'
import {
  type LintRulesetApiType,
  LintRulesetApiTypes,
  LintRulesetLinters,
  LintRulesetStatuses,
  RULESET_API_TYPE_TITLE_MAP,
  SERVER_DEFAULT_RULESETS,
  VERSION_API_QUALITY_TAB_REST,
} from '@portal/entities'
import { PortalPage } from '@portal/pages'
import type { RulesetInfoDialog } from '@portal/pages/PortalPage/VersionPage/VersionOverviewTab/OverviewSummaryTab/components/RulesetInfoDialog'
import { expect, expectFile, expectText } from '@services/expect-decorator'
import type { LintRulesetsTestDataManager } from '@services/test-data-manager'
import { formatDateToUI } from '@services/utils'
import {
  CLASS_ACTIVE_LINE_NUMBER,
  CLASS_CODICON_ERROR,
  CLASS_CODICON_INFO,
  CLASS_CODICON_WARNING,
  CLASS_SELECTED_DECORATOR,
} from '@shared/components/custom/views/RawView'
import { OPENAPI_ICON, ROOT_RESOURCES, TestFile } from '@shared/entities'
import { VAR_GR } from '@test-data/portal/groups'
import { ALIAS_PREFIX } from '@test-data/prefixes'
import type { Version } from '@test-data/props'
import { Group, Package } from '@test-data/props'
import { HOOK_PUBLISH_TIMEOUT } from '@test-setup'
import path from 'node:path'

// Types
type RulesetWithFile = {
  id: string
  name: string
  apiType: LintRulesetApiType
  rulesetFile: TestFile
}

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
  const OAS_30_LABEL = RULESET_API_TYPE_TITLE_MAP[LintRulesetApiTypes.OAS_3_0]
  const OAS_31_LABEL = RULESET_API_TYPE_TITLE_MAP[LintRulesetApiTypes.OAS_3_1]

  // Shared test data entities
  const G_AQ = new Group({
    name: 'API-Quality',
    alias: 'GAQ',
    parent: VAR_GR,
  })

  // Shared resource files
  const ROOT_API_QUALITY = path.join(ROOT_RESOURCES, 'portal', 'api-quality')
  const FILE_GRAPHQL = new TestFile(path.join(ROOT_API_QUALITY, 'specs', 'aq-graphql.graphql'))

  // Shared helper functions - Mocks
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

  // Shared helper functions - Assertions
  const verifyRulesetInfoDialogContent = async (
    portalPage: PortalPage,
    ruleset: RulesetWithFile,
    status: string,
  ): Promise<void> => {
    const { rulesetInfoDialog } = portalPage.versionPackagePage
    const apiTypeLabel = RULESET_API_TYPE_TITLE_MAP[ruleset.apiType]

    await test.step('Verify dialog displays correct content', async () => {
      await expect(rulesetInfoDialog.title).toContainText(ruleset.name)
      await expect(rulesetInfoDialog.apiTypeChip).toHaveText(apiTypeLabel)
      await expect(rulesetInfoDialog.statusChip).toHaveText(status)
      await expect(rulesetInfoDialog.rulesetFile).toContainText(ruleset.rulesetFile.name)
    })
  }

  const verifyRulesetDownload = async (
    portalPage: PortalPage,
    ruleset: RulesetWithFile,
  ): Promise<void> => {
    const { rulesetInfoDialog } = portalPage.versionPackagePage
    const downloadedFile = await rulesetInfoDialog.downloadRuleset()

    await test.step('Verify downloaded file has correct content', async () => {
      await expectFile(downloadedFile).toHaveName(ruleset.rulesetFile.name)
      await expectFile(downloadedFile).toContainText(ruleset.rulesetFile.testMeta!.yamlString!)
    })
  }

  const verifyRulesetCopyLink = async (
    portalPage: PortalPage,
    ruleset: RulesetWithFile,
  ): Promise<void> => {
    const { rulesetInfoDialog } = portalPage.versionPackagePage
    const copiedUrl = await rulesetInfoDialog.copyPublicUrl()

    await test.step('Verify clipboard contains URL matching expected pattern', async () => {
      await expectText(copiedUrl).toContain(`/api-linter/api/v1/rulesets/${ruleset.id}/data`)
    })
  }

  test.beforeAll(async ({ apihubTDM }) => {
    // Create shared group for all API Quality tests
    await apihubTDM.createPackage([G_AQ])
  })

  test.afterAll(async ({ lintRulesetTdm }) => {
    await activateDefaultRulesetsAndCleanup(lintRulesetTdm, testIdN)
  })

  test.describe('Ruleset Management', () => {
    // Constants
    const DEFAULT_API_TYPE_LABEL = RULESET_API_TYPE_TITLE_MAP[LintRulesetApiTypes.OAS_3_0]

    // Test resource files
    const FILE_SIMPLE_RULESET = new TestFile(
      `${ROOT_RESOURCES}/portal/api-quality/rulesets/aq-rm-simple-ruleset.yaml`,
      {
        yamlString: 'rules:',
      },
    )
    const FILE_INVALID_EXTENSION = new TestFile(
      `${ROOT_RESOURCES}/portal/api-quality/rulesets/aq-rm-invalid-extension.txt`,
    )

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

    // Helper functions - Actions
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
    // Test resource files
    const FILE_SUMMARY_RULESET = new TestFile(path.join(ROOT_API_QUALITY, 'rulesets', 'aq-summary-ruleset.yaml'), {
      yamlString: 'rules:',
    })
    const FILE_SIMPLE_RULESET = new TestFile(
      path.join(ROOT_API_QUALITY, 'rulesets', 'aq-rm-simple-ruleset.yaml'),
      {
        yamlString: 'rules:',
      },
    )
    const FILE_SUMMARY_OAS30 = new TestFile(path.join(ROOT_API_QUALITY, 'specs', 'aq-summary-oas30.yaml'))
    const FILE_SUMMARY_OAS31 = new TestFile(path.join(ROOT_API_QUALITY, 'specs', 'aq-summary-oas31.yaml'))

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
        { file: FILE_GRAPHQL },
      ],
    }

    // Ruleset data
    let RUL_SUMMARY_OAS30_N: RulesetWithFile
    let RUL_SUMMARY_OAS31_N: RulesetWithFile
    let RUL_ALT_OAS30_N: { id: string; name: string }

    // Helper functions - Mocks
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

      // Create package hierarchy (G_AQ is already created at top level)
      await apihubTDM.createPackage([PKG_AQ_SUMMARY_N])

      // Create custom rulesets for quality validation
      const oas30Ruleset = await lintRulesetTdm.createRuleset({
        rulesetName: `${ALIAS_PREFIX}-Summary-OAS30-${testIdN}`,
        apiType: LintRulesetApiTypes.OAS_3_0,
        linter: LintRulesetLinters.SPECTRAL,
        rulesetFile: FILE_SUMMARY_RULESET,
      })
      RUL_SUMMARY_OAS30_N = {
        id: oas30Ruleset.id,
        name: oas30Ruleset.name,
        apiType: LintRulesetApiTypes.OAS_3_0,
        rulesetFile: FILE_SUMMARY_RULESET,
      }

      const oas31Ruleset = await lintRulesetTdm.createRuleset({
        rulesetName: `${ALIAS_PREFIX}-Summary-OAS31-${testIdN}`,
        apiType: LintRulesetApiTypes.OAS_3_1,
        linter: LintRulesetLinters.SPECTRAL,
        rulesetFile: FILE_SUMMARY_RULESET,
      })
      RUL_SUMMARY_OAS31_N = {
        id: oas31Ruleset.id,
        name: oas31Ruleset.name,
        apiType: LintRulesetApiTypes.OAS_3_1,
        rulesetFile: FILE_SUMMARY_RULESET,
      }

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

        await test.step('Verify API Quality tab is disabled', async () => {
          await expect(portalPage.versionPackagePage.apiQualityTab).toBeDisabled()
        })

        await test.step('Hover over API Quality tab and verify tooltip', async () => {
          await portalPage.versionPackagePage.apiQualityTab.hover({ force: true })
          await expect(portalPage.tooltip).toHaveText('API quality check is failed')
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

        await portalPage.gotoVersion(V_OAS30_N)

        const ruleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
        await ruleset.nameLink.click()

        await verifyRulesetInfoDialogContent(portalPage, RUL_SUMMARY_OAS30_N, STATUS_ACTIVE)
      })

      test('P-AQ-SM-POPUP-2 Verify multiple Rulesets can be opened in multi-spec version', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { summaryTab } = portalPage.versionPackagePage.overviewTab
        const { qualityValidation } = summaryTab.body.restApi
        const { rulesetInfoDialog } = portalPage.versionPackagePage

        const firstRuleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
        const secondRuleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS31_N.name)

        await portalPage.gotoVersion(V_MULTI_SPEC_N)

        await test.step('Click on the first ruleset and verify popup content', async () => {
          await firstRuleset.nameLink.click()
          await verifyRulesetInfoDialogContent(portalPage, RUL_SUMMARY_OAS30_N, STATUS_ACTIVE)
        })

        await rulesetInfoDialog.closeBtn.click()

        await test.step('Click on the second ruleset and verify popup content', async () => {
          await secondRuleset.nameLink.click()
          await verifyRulesetInfoDialogContent(portalPage, RUL_SUMMARY_OAS31_N, STATUS_ACTIVE)
        })
      })

      test('P-AQ-SM-POPUP-3 Verify Download ruleset file', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { summaryTab } = portalPage.versionPackagePage.overviewTab
        const { qualityValidation } = summaryTab.body.restApi

        await portalPage.gotoVersion(V_OAS30_N)

        const ruleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
        await ruleset.nameLink.click()

        await verifyRulesetDownload(portalPage, RUL_SUMMARY_OAS30_N)
      })

      test('P-AQ-SM-POPUP-4 Verify Copy Link to ruleset', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { summaryTab } = portalPage.versionPackagePage.overviewTab
        const { qualityValidation } = summaryTab.body.restApi

        await portalPage.gotoVersion(V_OAS30_N)

        const ruleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)
        await ruleset.nameLink.click()

        await verifyRulesetCopyLink(portalPage, RUL_SUMMARY_OAS30_N)
      })

      test('P-AQ-SM-POPUP-5 Verify Activation History table content', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { summaryTab } = portalPage.versionPackagePage.overviewTab
        const { qualityValidation } = summaryTab.body.restApi
        const { rulesetInfoDialog } = portalPage.versionPackagePage

        const ruleset = qualityValidation.getValidationRuleset(RUL_SUMMARY_OAS30_N.name)

        await portalPage.gotoVersion(V_OAS30_N)

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

        await test.step('Verify placeholder shows in progress message', async () => {
          await expect(qualityValidation.placeholder).toContainText(MSG_VALIDATION_IN_PROGRESS)
        })

        await test.step('Verify API Quality tab is disabled', async () => {
          await expect(portalPage.versionPackagePage.apiQualityTab).toBeDisabled()
        })

        await test.step('Hover over API Quality tab and verify tooltip', async () => {
          await portalPage.versionPackagePage.apiQualityTab.hover({ force: true })
          await expect(portalPage.tooltip).toHaveText('API quality check is in progress')
        })
      })
    })
  })

  test.describe('API Quality Tab', () => {
    // Test resource files
    const FILE_QUALITY_TAB_RULESET = new TestFile(path.join(ROOT_API_QUALITY, 'rulesets', 'aq-tab-ruleset.yaml'), {
      yamlString: 'rules:',
    })
    const FILE_TAB_OAS30 = new TestFile(path.join(ROOT_API_QUALITY, 'specs', 'aq-tab-large-oas30.yaml'), {
      yamlString: 'openapi: 3.0.0',
      jsonString: '"openapi": "3.0.0"',
    })
    const FILE_TAB_OAS31 = new TestFile(path.join(ROOT_API_QUALITY, 'specs', 'aq-tab-combo-oas31.yaml'), {
      yamlString: 'openapi: 3.1.0',
    })

    // Test data entities
    const PKG_AQ_TAB_N = new Package({
      name: 'Quality-Tab',
      alias: 'PAQTAB',
      parent: G_AQ,
    })

    const V_AQ_TAB_MIXED_N: Version = {
      pkg: PKG_AQ_TAB_N,
      version: 'v2-tab-mixed',
      status: 'draft',
      files: [{ file: FILE_TAB_OAS30 }, { file: FILE_TAB_OAS31 }],
    }

    const V_AQ_TAB_MULTI_N: Version = {
      pkg: PKG_AQ_TAB_N,
      version: 'v1-tab-multi',
      status: 'draft',
      files: [
        { file: FILE_TAB_OAS30 },
        { file: FILE_TAB_OAS31 },
        { file: FILE_GRAPHQL },
      ],
    }

    // Ruleset data
    let RUL_QUALITY_TAB_OAS30_N: RulesetWithFile
    let RUL_QUALITY_TAB_OAS31_N: RulesetWithFile

    // Linter messages (shared across Content and Interactions and Problem Tooltip tests)
    const MSG_ERROR_1 = 'Synthetic Error 1 Found'
    const MSG_ERROR_2 = 'Synthetic Error 2 Found'
    const MSG_WARNING_1 = 'Synthetic Warning 1 Found'
    const MSG_WARNING_2 = 'Synthetic Warning 2 Found'
    const MSG_INFO_1 = 'Synthetic Info 1 Found'
    const MSG_INFO_2 = 'Synthetic Info 2 Found'
    const MSG_HINT_1 = 'Synthetic Hint 1 Found'
    const MSG_HINT_2 = 'Synthetic Hint 2 Found'

    // Rule names from aq-tab-ruleset.yaml (shared across Content and Interactions and Problem Tooltip tests)
    const RULE_ERROR_1 = 'synth-error-1'
    const RULE_ERROR_2 = 'synth-error-2'
    const RULE_WARNING_1 = 'synth-warn-1'
    const RULE_WARNING_2 = 'synth-warn-2'
    const RULE_INFO_1 = 'synth-info-1'
    const RULE_INFO_2 = 'synth-info-2'
    const RULE_HINT_1 = 'synth-hint-1'
    const RULE_HINT_2 = 'synth-hint-2'

    // Overlap error messages (for multi-rule scenario)
    const MSG_OVERLAP_ERROR_1 = 'Synthetic Overlap Error 1 Found'
    const MSG_OVERLAP_ERROR_2 = 'Synthetic Overlap Error 2 Found'
    const TEXT_OVERLAP_OPERATION = 'OverlapErr Operation'

    // Issue test cases configuration
    type IssueTestCase = {
      linterMessage: string
      problemText: string
      yamlLineNumber: number
      jsonLineNumber: number
      ruleName: string
      iconClass: string
    }

    // Test cases for issue navigation and tooltip tests (shared across Content and Interactions and Problem Tooltip tests)
    const ISSUE_TEST_CASES: IssueTestCase[] = [
      {
        linterMessage: MSG_ERROR_1,
        problemText: 'Operation with Error1',
        yamlLineNumber: 9,
        jsonLineNumber: 11,
        ruleName: RULE_ERROR_1,
        iconClass: CLASS_CODICON_ERROR,
      },
      {
        linterMessage: MSG_ERROR_2,
        problemText: 'Operation with Error2',
        yamlLineNumber: 177,
        jsonLineNumber: 275,
        ruleName: RULE_ERROR_2,
        iconClass: CLASS_CODICON_ERROR,
      },
      {
        linterMessage: MSG_WARNING_1,
        problemText: 'Operation with Warn1',
        yamlLineNumber: 51,
        jsonLineNumber: 77,
        ruleName: RULE_WARNING_1,
        iconClass: CLASS_CODICON_WARNING,
      },
      {
        linterMessage: MSG_WARNING_2,
        problemText: 'Operation with Warn2',
        yamlLineNumber: 219,
        jsonLineNumber: 341,
        ruleName: RULE_WARNING_2,
        iconClass: CLASS_CODICON_WARNING,
      },
      {
        linterMessage: MSG_INFO_1,
        problemText: 'Operation with Info1',
        yamlLineNumber: 93,
        jsonLineNumber: 143,
        ruleName: RULE_INFO_1,
        iconClass: CLASS_CODICON_INFO,
      },
      {
        linterMessage: MSG_INFO_2,
        problemText: 'Operation with Info2',
        yamlLineNumber: 261,
        jsonLineNumber: 407,
        ruleName: RULE_INFO_2,
        iconClass: CLASS_CODICON_INFO,
      },
      {
        linterMessage: MSG_HINT_1,
        problemText: 'Operation with Hint1',
        yamlLineNumber: 135,
        jsonLineNumber: 209,
        ruleName: RULE_HINT_1,
        iconClass: CLASS_CODICON_ERROR,
      },
      {
        linterMessage: MSG_HINT_2,
        problemText: 'Operation with Hint2',
        yamlLineNumber: 303,
        jsonLineNumber: 473,
        ruleName: RULE_HINT_2,
        iconClass: CLASS_CODICON_ERROR,
      },
    ]

    // Format type for YAML/JSON tests
    type FormatType = 'yaml' | 'json'

    // Helper to get line number based on format
    const getLineNumber = (
      testCase: IssueTestCase,
      format: FormatType,
    ): number => (format === 'yaml' ? testCase.yamlLineNumber : testCase.jsonLineNumber)

    // Helper functions - Actions
    const navigateToApiQualityTab = async (
      portalPage: PortalPage,
      version: Version,
    ): Promise<void> => {
      await test.step('Navigate to the API Quality tab', async () => {
        await portalPage.gotoVersion(version, VERSION_API_QUALITY_TAB_REST)
      })
    }

    const switchToTestDocument = async (
      portalPage: PortalPage,
      documentName: string,
    ): Promise<void> => {
      const { apiQualityTab } = portalPage.versionPackagePage

      await test.step('Switch to test document', async () => {
        await apiQualityTab.documentSlt.click()
        await apiQualityTab.documentSlt.getListItem(documentName).click()
      })
    }

    const switchToFormat = async (
      portalPage: PortalPage,
      format: FormatType,
    ): Promise<void> => {
      const { rawView } = portalPage.versionPackagePage.apiQualityTab

      if (format === 'json') {
        await test.step('Switch to JSON format', async () => {
          await rawView.jsonBtn.click()
          await expect(rawView.jsonBtn).toBePressed()
        })
      }
    }

    // Helper functions - Actions
    const openProblemPopupViaTooltip = async (
      portalPage: PortalPage,
      testCase: IssueTestCase,
    ): Promise<void> => {
      const { apiQualityTab } = portalPage.versionPackagePage
      const { rawView } = apiQualityTab
      const { problemTooltip } = rawView

      await test.step('Hover over issue marker to show Tooltip and open Problem Popup', async () => {
        await apiQualityTab.getProblemRow(testCase.linterMessage).click()
        await expect(rawView.getTextContent(testCase.problemText)).toBeVisible()
        await rawView.hoverText(testCase.problemText)
        await expect(problemTooltip).toBeVisible()
        await problemTooltip.viewProblemBtn.click()
      })
    }

    const openProblemPopupForOverlappingIssue = async (
      portalPage: PortalPage,
      linterMessage: string,
      problemText: string,
    ): Promise<void> => {
      const { apiQualityTab } = portalPage.versionPackagePage
      const { rawView } = apiQualityTab

      await test.step('Navigate to overlapping issue and open Problem Popup', async () => {
        await apiQualityTab.getProblemRow(linterMessage).click()
        await expect(rawView.getTextContent(problemText)).toBeVisible()
        await rawView.hoverText(problemText)
        await rawView.problemTooltip.viewProblemBtn.click()
      })
    }

    const closeAndVerifyProblemPopup = async (portalPage: PortalPage): Promise<void> => {
      const { problemPopUp } = portalPage.versionPackagePage.apiQualityTab.rawView

      await test.step('Close Problem Popup and verify it is hidden', async () => {
        await problemPopUp.closeBtn.click()
        await expect(problemPopUp).toBeHidden()
      })
    }

    const openProblemPopupViaAltF8 = async (
      portalPage: PortalPage,
      testCase: IssueTestCase,
    ): Promise<void> => {
      const { apiQualityTab } = portalPage.versionPackagePage
      const { rawView } = apiQualityTab
      const { page } = portalPage

      await test.step('Position cursor on issue marker and open Popup via Alt+F8', async () => {
        await apiQualityTab.getProblemRow(testCase.linterMessage).click()
        await expect(rawView.getTextContent(testCase.problemText)).toBeVisible()
        await rawView.clickText(testCase.problemText)
        await page.keyboard.press('Alt+F8')
      })
    }

    // Helper functions - Assertions
    const verifyProblemPopupContent = async (
      portalPage: PortalPage,
      testCase: IssueTestCase,
    ): Promise<void> => {
      const { apiQualityTab } = portalPage.versionPackagePage
      const { rawView } = apiQualityTab
      const { problemPopUp } = rawView

      await test.step('Verify Problem Popup appears with correct content', async () => {
        await expect(problemPopUp).toBeVisible()
        await expect(problemPopUp.message).toContainText(testCase.linterMessage)
        await expect(problemPopUp.message).toContainText(LintRulesetLinters.SPECTRAL)
        await expect(problemPopUp.message).toContainText(testCase.ruleName)
      })

      await test.step('Verify Popup displays problem type icon', async () => {
        await expect(problemPopUp.iconContainer).toHaveIconClass(testCase.iconClass)
      })

      await test.step('Verify Popup shows navigation arrows and Close button', async () => {
        await expect(problemPopUp.nextProblemBtn).toBeVisible()
        await expect(problemPopUp.previousProblemBtn).toBeVisible()
        await expect(problemPopUp.closeBtn).toBeVisible()
      })
    }

    const verifyValidationIssuesSorting = async (
      portalPage: PortalPage,
    ): Promise<void> => {
      const { apiQualityTab } = portalPage.versionPackagePage

      // According to test plan: Issues should be sorted by severity order: Error -> Warning -> Info -> Hint
      // Within the same severity, sorted by document position (line/column) from start to end
      // Expected order: Error1, Error2, Warning1, Warning2, Info1, Info2, Hint1, Hint2
      const SORTED_ISSUES_BY_SEVERITY = [
        MSG_ERROR_1,
        MSG_ERROR_2,
        MSG_WARNING_1,
        MSG_WARNING_2,
        MSG_INFO_1,
        MSG_INFO_2,
        MSG_HINT_1,
        MSG_HINT_2,
      ]

      await test.step('Verify the expected number of issues', async () => {
        await expect(apiQualityTab.getProblemRow()).toHaveCount(SORTED_ISSUES_BY_SEVERITY.length)
      })

      await test.step('Verify issues are sorted by severity order', async () => {
        for (let i = 0; i < SORTED_ISSUES_BY_SEVERITY.length; i++) {
          const row = apiQualityTab.getProblemRow(i + 1)
          await expect(row.messageCell).toContainText(SORTED_ISSUES_BY_SEVERITY[i])
        }
      })
    }

    const verifyIssueNavigationHighlight = async (
      portalPage: PortalPage,
      format: FormatType,
    ): Promise<void> => {
      const { apiQualityTab } = portalPage.versionPackagePage
      const { rawView } = apiQualityTab

      for (const testCase of ISSUE_TEST_CASES) {
        await test.step(`Navigate to "${testCase.linterMessage}" and verify highlighting`, async () => {
          const lineNumber = getLineNumber(testCase, format)
          const lineNumberContainer = rawView.getLineNumberContainer(lineNumber)

          await test.step('Navigate to issue location and verify line number container is visible', async () => {
            await apiQualityTab.getProblemRow(testCase.linterMessage).click()
            await expect(lineNumberContainer).toBeInViewport()
          })

          await test.step('Verify selected line number is active', async () => {
            await expect(lineNumberContainer).toHaveClass(CLASS_ACTIVE_LINE_NUMBER)
          })

          await test.step('Verify selected problem is marked with blue indicator', async () => {
            await expect(lineNumberContainer.marker).toHaveClass(CLASS_SELECTED_DECORATOR)
          })

          await test.step('Verify problem text is visible in the viewport', async () => {
            await expect(rawView.getTextContent(testCase.problemText)).toBeInViewport()
          })
        })
      }
    }

    const verifyTooltipOnHover = async (
      portalPage: PortalPage,
    ): Promise<void> => {
      const { apiQualityTab } = portalPage.versionPackagePage
      const { rawView } = apiQualityTab
      const { problemTooltip } = rawView

      for (const testCase of ISSUE_TEST_CASES) {
        await test.step(`Verify Tooltip appears on hover over "${testCase.linterMessage}" issue marker`, async () => {
          await test.step('Locate an issue marker in the Document Viewer', async () => {
            await apiQualityTab.getProblemRow(testCase.linterMessage).click()
            await expect(rawView.getTextContent(testCase.problemText)).toBeVisible()
          })

          await test.step('Hover over the issue marker text', async () => {
            // Hint tooltips appear on whitespace before text, so we use hoverHintText
            if (testCase.linterMessage === MSG_HINT_1 || testCase.linterMessage === MSG_HINT_2) {
              await rawView.hoverHintText(testCase.problemText)
            } else {
              await rawView.hoverText(testCase.problemText)
            }
          })

          await test.step('Verify Problem Tooltip appears with issue message, Linter version, Rule name and View Problem button', async () => {
            await expect(problemTooltip).toBeVisible()
            await expect(problemTooltip).toContainText(testCase.linterMessage)
            await expect(problemTooltip).toContainText(LintRulesetLinters.SPECTRAL)
            await expect(problemTooltip).toContainText(testCase.ruleName)
            // Hint tooltips don't show "View Problem" button - they only provide informational tooltips
            if (testCase.linterMessage !== MSG_HINT_1 && testCase.linterMessage !== MSG_HINT_2) {
              await expect(problemTooltip.viewProblemBtn).toBeVisible()
            } else {
              await expect(problemTooltip.viewProblemBtn).toBeHidden()
            }
          })
        })
      }
    }

    const verifyTooltipDisappears = async (
      portalPage: PortalPage,
      page: Page,
    ): Promise<void> => {
      const { apiQualityTab } = portalPage.versionPackagePage
      const { rawView } = apiQualityTab
      const { problemTooltip } = rawView

      await test.step('Hover over an issue marker to show the Tooltip', async () => {
        await apiQualityTab.getProblemRow(MSG_ERROR_1).click()
        await expect(rawView.getTextContent('Operation with Error1')).toBeVisible()
        await rawView.hoverText('Operation with Error1')
        await expect(problemTooltip).toBeVisible()
      })

      await test.step('Move the cursor away from the issue marker to a neutral area', async () => {
        await page.mouse.move(0, 0)
      })

      await test.step('Verify Problem Tooltip disappears', async () => {
        await expect(problemTooltip).toBeHidden()
      })
    }

    test.beforeAll(async ({ apihubTDM, lintRulesetTdm }) => {
      // Extended timeout for API publishing
      test.setTimeout(HOOK_PUBLISH_TIMEOUT)

      // Create package hierarchy (G_AQ is already created at top level)
      await apihubTDM.createPackage([PKG_AQ_TAB_N])

      // Create custom rulesets for API Quality Tab tests
      const qualityTabRulesetOas30 = await lintRulesetTdm.createRuleset({
        rulesetName: `${ALIAS_PREFIX}-Quality-Tab-OAS30-${testIdN}`,
        apiType: LintRulesetApiTypes.OAS_3_0,
        linter: LintRulesetLinters.SPECTRAL,
        rulesetFile: FILE_QUALITY_TAB_RULESET,
      })
      RUL_QUALITY_TAB_OAS30_N = {
        id: qualityTabRulesetOas30.id,
        name: qualityTabRulesetOas30.name,
        apiType: LintRulesetApiTypes.OAS_3_0,
        rulesetFile: FILE_QUALITY_TAB_RULESET,
      }

      const qualityTabRulesetOas31 = await lintRulesetTdm.createRuleset({
        rulesetName: `${ALIAS_PREFIX}-Quality-Tab-OAS31-${testIdN}`,
        apiType: LintRulesetApiTypes.OAS_3_1,
        linter: LintRulesetLinters.SPECTRAL,
        rulesetFile: FILE_QUALITY_TAB_RULESET,
      })
      RUL_QUALITY_TAB_OAS31_N = {
        id: qualityTabRulesetOas31.id,
        name: qualityTabRulesetOas31.name,
        apiType: LintRulesetApiTypes.OAS_3_1,
        rulesetFile: FILE_QUALITY_TAB_RULESET,
      }

      // Activate rulesets for OAS 3.0 and OAS 3.1
      await lintRulesetTdm.activateRuleset(RUL_QUALITY_TAB_OAS30_N)
      await lintRulesetTdm.activateRuleset(RUL_QUALITY_TAB_OAS31_N)

      // Publish versions for API Quality Tab tests
      await apihubTDM.publishVersion(V_AQ_TAB_MIXED_N)
      await apihubTDM.publishVersion(V_AQ_TAB_MULTI_N)

      // Wait for validation to complete after publishing
      await lintRulesetTdm.waitForValidationToComplete({
        packageId: PKG_AQ_TAB_N.packageId,
        version: V_AQ_TAB_MIXED_N.version,
      })
      await lintRulesetTdm.waitForValidationToComplete({
        packageId: PKG_AQ_TAB_N.packageId,
        version: V_AQ_TAB_MULTI_N.version,
      })
    })

    test.describe('UI Visibility and Navigation', () => {
      test('P-AQ-TAB-UI-1 Verify API Quality Tab visibility and navigation', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { apiQualityTab } = portalPage.versionPackagePage

        await test.step('Navigate to the Package Version page', async () => {
          await portalPage.gotoVersion(V_AQ_TAB_MIXED_N)
        })

        await test.step('Open the API Quality tab', async () => {
          await apiQualityTab.click()
        })

        await test.step('Verify API Quality tab opening and document selector', async () => {
          await expect(apiQualityTab.documentSlt).toBeVisible()
          await expect(apiQualityTab.documentSlt).not.toBeEmpty()
        })

        await test.step('Verify the Issue List table is visible', async () => {
          await expect(apiQualityTab.getProblemRow(1)).toBeVisible()
        })

        await test.step('Verify the Document Viewer is visible', async () => {
          await expect(apiQualityTab.rawView).toBeVisible()
        })
      })
    })

    test.describe('Document Selector', () => {
      // Note: Documents in selector are ordered alphabetically by their slug.
      // For V_AQ_TAB_MIXED_N: aq-tab-combo-oas31.yaml comes before aq-tab-large-oas30.yaml (combo < large).
      // So by default OAS 3.1 document is selected, which corresponds to RUL_QUALITY_TAB_OAS31_N.

      test('P-AQ-TAB-DOC-1 Verify Document Selector list content and icons', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { apiQualityTab } = portalPage.versionPackagePage
        const { documentSlt } = apiQualityTab

        const oas30Doc = documentSlt.getListItem(FILE_TAB_OAS30.name)
        const oas31Doc = documentSlt.getListItem(FILE_TAB_OAS31.name)
        const graphqlDoc = documentSlt.getListItem(FILE_GRAPHQL.name)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MULTI_N)

        await test.step('Open the Document Selector dropdown', async () => {
          await documentSlt.click()
        })

        await test.step('Verify list contains all validated OAS documents with correct icons and names', async () => {
          await expect(oas30Doc).toBeVisible()
          await expect(oas30Doc).toHaveIcon(OPENAPI_ICON)
          await expect(oas30Doc).toHaveText(FILE_TAB_OAS30.name)

          await expect(oas31Doc).toBeVisible()
          await expect(oas31Doc).toHaveIcon(OPENAPI_ICON)
          await expect(oas31Doc).toHaveText(FILE_TAB_OAS31.name)
        })

        await test.step('Verify the list does NOT contain the GraphQL document', async () => {
          await expect(graphqlDoc).toBeHidden()
        })
      })

      test('P-AQ-TAB-DOC-2 Verify Document Selector Search', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { apiQualityTab } = portalPage.versionPackagePage
        const { documentSlt } = apiQualityTab

        const oas30Doc = documentSlt.getListItem(FILE_TAB_OAS30.name)
        const oas31Doc = documentSlt.getListItem(FILE_TAB_OAS31.name)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MULTI_N)

        await test.step('Open the Document Selector dropdown', async () => {
          await documentSlt.click()
        })

        await test.step('Part of a word', async () => {
          await documentSlt.searchBar.fill('large')
          await expect(oas30Doc).toBeVisible()
          await expect(oas31Doc).toBeHidden()
        })

        await test.step('Adding part of a word', async () => {
          await documentSlt.searchBar.fill('aq-tab-large-oas30')
          await expect(oas30Doc).toBeVisible()
          await expect(oas31Doc).toBeHidden()
        })

        await test.step('Clearing a search query', async () => {
          await documentSlt.searchBar.clear()
          await expect(oas30Doc).toBeVisible()
          await expect(oas31Doc).toBeVisible()
        })

        await test.step('Case insensitive search', async () => {
          await documentSlt.searchBar.fill('oas30')
          await expect(oas30Doc).toBeVisible()
          await expect(oas31Doc).toBeHidden()
          await documentSlt.searchBar.fill('OAS30')
          await expect(oas30Doc).toBeVisible()
          await expect(oas31Doc).toBeHidden()
        })

        await test.step('Invalid search query', async () => {
          await documentSlt.searchBar.fill('nonexistent-document')
          await expect(oas30Doc).toBeHidden()
          await expect(oas31Doc).toBeHidden()
        })
      })

      test('P-AQ-TAB-DOC-3 Verify Switching Documents', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { apiQualityTab } = portalPage.versionPackagePage
        const { documentSlt } = apiQualityTab

        const oas30Doc = documentSlt.getListItem(FILE_TAB_OAS30.name)

        const verifyDocumentContent = async (
          document: TestFile,
          ruleset: { id: string; name: string; apiType: LintRulesetApiType },
        ): Promise<void> => {
          const apiTypeLabel = RULESET_API_TYPE_TITLE_MAP[ruleset.apiType]

          await test.step(`Verify Document Selector shows "${document.name}"`, async () => {
            await expect(documentSlt).toHaveText(document.name)
          })

          await test.step(`Verify Issue List updates to show issues for "${document.name}"`, async () => {
            await expect(apiQualityTab.getProblemRow(1)).toBeVisible()
          })

          await test.step(`Verify Document Viewer updates to show content of "${document.name}"`, async () => {
            await expect(apiQualityTab.rawView).toBeVisible()
            await expect(apiQualityTab.rawView).toContainText(document.testMeta!.yamlString!)
          })

          await test.step(`Verify ruleset link updates to show ruleset for "${document.name}"`, async () => {
            await expect(apiQualityTab.nameLink).toBeVisible()
            await expect(apiQualityTab.nameLink).toContainText(ruleset.name)
            await expect(apiQualityTab.apiTypeChip).toBeVisible()
            await expect(apiQualityTab.apiTypeChip).toHaveText(apiTypeLabel)
            await expect(apiQualityTab.statusChip).toBeVisible()
            await expect(apiQualityTab.statusChip).toHaveText(STATUS_ACTIVE)
          })
        }

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MULTI_N)

        await verifyDocumentContent(FILE_TAB_OAS31, RUL_QUALITY_TAB_OAS31_N)

        await test.step(`Open Document Selector and select "${FILE_TAB_OAS30.name}"`, async () => {
          await documentSlt.click()
          await oas30Doc.click()
        })

        await verifyDocumentContent(FILE_TAB_OAS30, RUL_QUALITY_TAB_OAS30_N)
      })
    })

    test.describe('Ruleset and Dialog Interactions', () => {
      // Helper functions - Actions
      const navigateToApiQualityTabAndOpenRulesetDialog = async (
        portalPage: PortalPage,
        version: Version,
      ): Promise<RulesetInfoDialog> => {
        const { apiQualityTab } = portalPage.versionPackagePage

        await navigateToApiQualityTab(portalPage, version)

        await test.step('Open ruleset dialog', async () => {
          await apiQualityTab.nameLink.click()
        })

        return portalPage.versionPackagePage.rulesetInfoDialog
      }

      test('P-AQ-TAB-RULE-1 Verify Ruleset Info Dialog opens', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        const rulesetInfoDialog = await navigateToApiQualityTabAndOpenRulesetDialog(
          portalPage,
          V_AQ_TAB_MIXED_N,
        )

        await verifyRulesetInfoDialogContent(portalPage, RUL_QUALITY_TAB_OAS31_N, STATUS_ACTIVE)

        await test.step('Verify activation history first record', async () => {
          const firstRecord = rulesetInfoDialog.getActivationRecord(1)
          await expect(firstRecord).toBeVisible()
          await expect(firstRecord).toContainText(`${currentFormattedDate} - ...`)
        })
      })

      test('P-AQ-TAB-RULE-2 Verify Ruleset Dialog Download', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await navigateToApiQualityTabAndOpenRulesetDialog(portalPage, V_AQ_TAB_MIXED_N)

        await verifyRulesetDownload(portalPage, RUL_QUALITY_TAB_OAS31_N)
      })

      test('P-AQ-TAB-RULE-3 Verify Ruleset Dialog Copy Link', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await navigateToApiQualityTabAndOpenRulesetDialog(portalPage, V_AQ_TAB_MIXED_N)

        await verifyRulesetCopyLink(portalPage, RUL_QUALITY_TAB_OAS31_N)
      })
    })

    test.describe('Content and Interactions', () => {
      // Severity icon IDs
      const ERROR_ICON = 'ErrorIcon'
      const WARNING_ICON = 'WarningIcon'
      const INFO_ICON = 'InfoIcon'
      const HINT_ICON = 'HintIcon'

      test('P-AQ-TAB-CONTENT-1 Verify Issue List displays issues with correct structure', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { apiQualityTab } = portalPage.versionPackagePage

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)

        await test.step('Verify issues display severity icons', async () => {
          // Verify Error icon
          const errorRow = apiQualityTab.getProblemRow(MSG_ERROR_1)
          await expect(errorRow.typeCell).toHaveIcon(ERROR_ICON)

          // Verify Warning icon
          const warningRow = apiQualityTab.getProblemRow(MSG_WARNING_1)
          await expect(warningRow.typeCell).toHaveIcon(WARNING_ICON)

          // Verify Info icon
          const infoRow = apiQualityTab.getProblemRow(MSG_INFO_1)
          await expect(infoRow.typeCell).toHaveIcon(INFO_ICON)

          // Verify Hint icon
          const hintRow = apiQualityTab.getProblemRow(MSG_HINT_1)
          await expect(hintRow.typeCell).toHaveIcon(HINT_ICON)
        })
      })

      test('P-AQ-TAB-CONTENT-2 Verify Format Toggler switches between YAML and JSON', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { apiQualityTab } = portalPage.versionPackagePage
        const { rawView } = apiQualityTab

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)

        await test.step('Verify default format is YAML', async () => {
          await expect(rawView.yamlBtn).toBePressed()
          await expect(rawView).toContainText(FILE_TAB_OAS30.testMeta!.yamlString!)
        })

        await test.step('Click JSON in the toggler and verify Editor content is JSON', async () => {
          await rawView.jsonBtn.click()
          await expect(rawView.jsonBtn).toBePressed()
          await expect(rawView).toContainText(FILE_TAB_OAS30.testMeta!.jsonString!)
        })

        await test.step('Click YAML in the toggler and verify Editor content is YAML', async () => {
          await rawView.yamlBtn.click()
          await expect(rawView.yamlBtn).toBePressed()
          await expect(rawView).toContainText(FILE_TAB_OAS30.testMeta!.yamlString!)
        })
      })

      test.skip('P-AQ-TAB-CONTENT-3-YAML Verify Validation Issues Sorting in YAML', {
        tag: '@smoke',
        annotation: {
          type: 'Issue',
          description: 'https://github.com/Netcracker/qubership-apihub/issues/445',
        },
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)

        await verifyValidationIssuesSorting(portalPage)
      })

      test.skip('P-AQ-TAB-CONTENT-3-JSON Verify Validation Issues Sorting in JSON', {
        tag: '@smoke',
        annotation: {
          type: 'Issue',
          description: 'https://github.com/Netcracker/qubership-apihub/issues/445',
        },
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await switchToFormat(portalPage, 'json')

        await verifyValidationIssuesSorting(portalPage)
      })

      test('P-AQ-TAB-CONTENT-4-YAML Verify Issue Navigation highlights selected line in YAML', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)

        await verifyIssueNavigationHighlight(portalPage, 'yaml')
      })

      test('P-AQ-TAB-CONTENT-4-JSON Verify Issue Navigation highlights selected line in JSON', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await switchToFormat(portalPage, 'json')

        await verifyIssueNavigationHighlight(portalPage, 'json')
      })
    })

    test.describe('Problem Tooltip - Hover Behavior', () => {
      // Helper function for combo tooltip test
      const verifyComboTooltip = async (
        portalPage: PortalPage,
      ): Promise<void> => {
        const { apiQualityTab } = portalPage.versionPackagePage
        const { rawView } = apiQualityTab
        const { problemTooltip } = rawView
        const COMBO_TEXT = 'Combo Error1 Warn1 Info1 Hint1'

        await test.step('Locate a marker with multiple issues of different types in the Document Viewer', async () => {
          await apiQualityTab.getProblemRow(MSG_ERROR_1).click()
          await expect(rawView.getTextContent(COMBO_TEXT)).toBeVisible()
        })

        await test.step('Hover over the issue marker', async () => {
          // Use hoverHintText instead of hoverText because Hint tooltips appear on whitespace before text.
          // This ensures we can capture all issues including Hint, which would not be visible if hovering directly on the text.
          await rawView.hoverHintText(COMBO_TEXT)
        })

        await test.step('Verify Problem Tooltip appears with all issues for that location', async () => {
          await expect(problemTooltip).toBeVisible()
          await expect(problemTooltip).toContainText(MSG_ERROR_1)
          await expect(problemTooltip).toContainText(MSG_WARNING_1)
          await expect(problemTooltip).toContainText(MSG_INFO_1)
          await expect(problemTooltip).toContainText(MSG_HINT_1)
          await expect(problemTooltip.viewProblemBtn).toBeVisible()
        })
      }

      // Helper function for multi-rule same type tooltip test
      const verifyMultiRuleTooltip = async (
        portalPage: PortalPage,
      ): Promise<void> => {
        const { apiQualityTab } = portalPage.versionPackagePage
        const { rawView } = apiQualityTab
        const { problemTooltip } = rawView

        await test.step('Locate a marker where one element triggers multiple rules of the same type', async () => {
          await apiQualityTab.getProblemRow(MSG_OVERLAP_ERROR_1).click()
          await expect(rawView.getTextContent(TEXT_OVERLAP_OPERATION)).toBeVisible()
        })

        await test.step('Hover over the issue marker', async () => {
          await rawView.hoverText(TEXT_OVERLAP_OPERATION)
        })

        await test.step('Verify Problem Tooltip appears with both error messages from different rules', async () => {
          await expect(problemTooltip).toBeVisible()
          await expect(problemTooltip).toContainText(MSG_OVERLAP_ERROR_1)
          await expect(problemTooltip).toContainText(MSG_OVERLAP_ERROR_2)
          await expect(problemTooltip.viewProblemBtn).toBeVisible()
        })
      }

      test('P-AQ-TAB-TIP-1-YAML Verify Tooltip appears on hover over issue marker in YAML', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)

        await verifyTooltipOnHover(portalPage)
      })

      test('P-AQ-TAB-TIP-1-JSON Verify Tooltip appears on hover over issue marker in JSON', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await switchToFormat(portalPage, 'json')

        await verifyTooltipOnHover(portalPage)
      })

      test('P-AQ-TAB-TIP-2-YAML Verify Tooltip displays multiple issues of different types in YAML', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS31.name)

        await verifyComboTooltip(portalPage)
      })

      test('P-AQ-TAB-TIP-2-JSON Verify Tooltip displays multiple issues of different types in JSON', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS31.name)
        await switchToFormat(portalPage, 'json')

        await verifyComboTooltip(portalPage)
      })

      test('P-AQ-TAB-TIP-3-YAML Verify Tooltip displays multiple issues of same type in YAML', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS31.name)

        await verifyMultiRuleTooltip(portalPage)
      })

      test('P-AQ-TAB-TIP-3-JSON Verify Tooltip displays multiple issues of same type in JSON', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS31.name)
        await switchToFormat(portalPage, 'json')

        await verifyMultiRuleTooltip(portalPage)
      })

      test('P-AQ-TAB-TIP-4-YAML Verify Tooltip disappears when cursor leaves in YAML', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)

        await verifyTooltipDisappears(portalPage, page)
      })

      test('P-AQ-TAB-TIP-4-JSON Verify Tooltip disappears when cursor leaves in JSON', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await switchToFormat(portalPage, 'json')

        await verifyTooltipDisappears(portalPage, page)
      })
    })

    test.describe('Problem Popup', () => {
      test('P-AQ-TAB-POPUP-1-YAML Verify Popup opens via View Problem button in YAML', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const [error1TestCase] = ISSUE_TEST_CASES

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await openProblemPopupViaTooltip(portalPage, error1TestCase)

        await verifyProblemPopupContent(portalPage, error1TestCase)
      })

      test('P-AQ-TAB-POPUP-1-JSON Verify Popup opens via View Problem button in JSON', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const [error1TestCase] = ISSUE_TEST_CASES

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await switchToFormat(portalPage, 'json')
        await openProblemPopupViaTooltip(portalPage, error1TestCase)

        await verifyProblemPopupContent(portalPage, error1TestCase)
      })

      test.skip(
        'P-AQ-TAB-POPUP-1-BUG-449-YAML Verify Popup opens via View Problem button for Warning issue redirects to correct warning (bug #449)',
        {
          tag: '@smoke',
          annotation: {
            type: 'Issue',
            description: 'https://github.com/Netcracker/qubership-apihub/issues/449',
          },
        },
        async ({ sysadminPage: page }) => {
          const portalPage = new PortalPage(page)
          const warning1TestCase = ISSUE_TEST_CASES[2]

          await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
          await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
          await openProblemPopupViaTooltip(portalPage, warning1TestCase)

          await verifyProblemPopupContent(portalPage, warning1TestCase)
        },
      )

      test.skip(
        'P-AQ-TAB-POPUP-1-BUG-449-JSON Verify Popup opens via View Problem button for Warning issue redirects to correct warning (bug #449)',
        {
          tag: '@smoke',
          annotation: {
            type: 'Issue',
            description: 'https://github.com/Netcracker/qubership-apihub/issues/449',
          },
        },
        async ({ sysadminPage: page }) => {
          const portalPage = new PortalPage(page)
          const warning1TestCase = ISSUE_TEST_CASES[2]

          await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
          await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
          await switchToFormat(portalPage, 'json')
          await openProblemPopupViaTooltip(portalPage, warning1TestCase)

          await verifyProblemPopupContent(portalPage, warning1TestCase)
        },
      )

      test('P-AQ-TAB-POPUP-2-YAML Verify Popup opens via Alt+F8 for specific problem in YAML', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const error2TestCase = ISSUE_TEST_CASES[1]

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await openProblemPopupViaAltF8(portalPage, error2TestCase)

        await verifyProblemPopupContent(portalPage, error2TestCase)
      })

      test('P-AQ-TAB-POPUP-2-JSON Verify Popup opens via Alt+F8 for specific problem in JSON', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const error2TestCase = ISSUE_TEST_CASES[1]

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await switchToFormat(portalPage, 'json')
        await openProblemPopupViaAltF8(portalPage, error2TestCase)

        await verifyProblemPopupContent(portalPage, error2TestCase)
      })

      test('P-AQ-TAB-POPUP-3-YAML Verify Popup closes via Close button in YAML', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const [error1TestCase] = ISSUE_TEST_CASES

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await openProblemPopupViaTooltip(portalPage, error1TestCase)

        await closeAndVerifyProblemPopup(portalPage)
      })

      test('P-AQ-TAB-POPUP-3-JSON Verify Popup closes via Close button in JSON', async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const [error1TestCase] = ISSUE_TEST_CASES

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await switchToFormat(portalPage, 'json')
        await openProblemPopupViaTooltip(portalPage, error1TestCase)

        await closeAndVerifyProblemPopup(portalPage)
      })
    })

    test.describe('Problem Navigation via Popup', () => {
      // Helper function to verify navigation between problems
      const verifyProblemNavigation = async (
        portalPage: PortalPage,
        initialTestCase: IssueTestCase,
        nextTestCase: IssueTestCase,
      ): Promise<void> => {
        const { problemPopUp } = portalPage.versionPackagePage.apiQualityTab.rawView

        await test.step('Verify initial problem is displayed', async () => {
          await expect(problemPopUp.message).toContainText(initialTestCase.linterMessage)
        })

        await test.step('Navigate to next problem and verify Popup updates', async () => {
          await problemPopUp.nextProblemBtn.click()
          await expect(problemPopUp.message).toContainText(nextTestCase.linterMessage)
          await expect(problemPopUp.iconContainer).toHaveIconClass(nextTestCase.iconClass)
        })

        await test.step('Navigate to previous problem and verify Popup updates', async () => {
          await problemPopUp.previousProblemBtn.click()
          await expect(problemPopUp.message).toContainText(initialTestCase.linterMessage)
          await expect(problemPopUp.iconContainer).toHaveIconClass(initialTestCase.iconClass)
        })
      }

      const verifyKeyboardNavigation = async (
        portalPage: PortalPage,
        initialTestCase: IssueTestCase,
        nextTestCase: IssueTestCase,
      ): Promise<void> => {
        const { problemPopUp } = portalPage.versionPackagePage.apiQualityTab.rawView
        const { page } = portalPage

        await test.step('Verify initial problem is displayed', async () => {
          await expect(problemPopUp.message).toContainText(initialTestCase.linterMessage)
        })

        await test.step('Navigate to next problem via F8 and verify Popup updates', async () => {
          await page.keyboard.press('F8')
          await expect(problemPopUp.message).toContainText(nextTestCase.linterMessage)
        })

        await test.step('Navigate to previous problem via Shift+F8 and verify Popup updates', async () => {
          await page.keyboard.press('Shift+F8')
          await expect(problemPopUp.message).toContainText(initialTestCase.linterMessage)
        })
      }

      const verifySeverityOrderNavigation = async (
        portalPage: PortalPage,
      ): Promise<void> => {
        const { problemPopUp } = portalPage.versionPackagePage.apiQualityTab.rawView

        // Expected navigation order: Error1, Error2, Warning1, Warning2, Info1, Info2, Hint1, Hint2
        const SORTED_BY_SEVERITY = [
          MSG_ERROR_1,
          MSG_ERROR_2,
          MSG_WARNING_1,
          MSG_WARNING_2,
          MSG_INFO_1,
          MSG_INFO_2,
          MSG_HINT_1,
          MSG_HINT_2,
        ]

        await test.step('Verify initial problem is first Error', async () => {
          await expect(problemPopUp.message).toContainText(SORTED_BY_SEVERITY[0])
        })

        for (let i = 1; i < SORTED_BY_SEVERITY.length; i++) {
          await test.step(`Navigate to problem ${i + 1} and verify severity order`, async () => {
            await problemPopUp.nextProblemBtn.click()
            await expect(problemPopUp.message).toContainText(SORTED_BY_SEVERITY[i])
          })
        }
      }

      const verifyOverlappingIssuesNavigation = async (
        portalPage: PortalPage,
      ): Promise<void> => {
        const { problemPopUp } = portalPage.versionPackagePage.apiQualityTab.rawView

        await test.step('Verify Popup shows one of the overlapping errors', async () => {
          await expect(problemPopUp.message).toContainText(MSG_OVERLAP_ERROR_1)
        })

        await test.step('Navigate to next problem and verify it follows severity order', async () => {
          await problemPopUp.nextProblemBtn.click()
          // Next should be the second overlap error (same severity)
          await expect(problemPopUp.message).toContainText(MSG_OVERLAP_ERROR_2)
        })

        await test.step('Navigate back to verify we can return to first overlap error', async () => {
          await problemPopUp.previousProblemBtn.click()
          await expect(problemPopUp.message).toContainText(MSG_OVERLAP_ERROR_1)
        })
      }

      test('P-AQ-TAB-NAV-1-YAML Verify Next and Previous Problem navigation via buttons in YAML', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const [error1TestCase, error2TestCase] = ISSUE_TEST_CASES

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await openProblemPopupViaTooltip(portalPage, error1TestCase)

        await verifyProblemNavigation(portalPage, error1TestCase, error2TestCase)
      })

      test('P-AQ-TAB-NAV-1-JSON Verify Next and Previous Problem navigation via buttons in JSON', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const [error1TestCase, error2TestCase] = ISSUE_TEST_CASES

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await switchToFormat(portalPage, 'json')
        await openProblemPopupViaTooltip(portalPage, error1TestCase)

        await verifyProblemNavigation(portalPage, error1TestCase, error2TestCase)
      })

      test('P-AQ-TAB-NAV-2-YAML Verify Next and Previous Problem navigation via F8 and Shift+F8 in YAML', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const [error1TestCase, error2TestCase] = ISSUE_TEST_CASES

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await openProblemPopupViaAltF8(portalPage, error1TestCase)

        await verifyKeyboardNavigation(portalPage, error1TestCase, error2TestCase)
      })

      test('P-AQ-TAB-NAV-2-JSON Verify Next and Previous Problem navigation via F8 and Shift+F8 in JSON', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const [error1TestCase, error2TestCase] = ISSUE_TEST_CASES

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await switchToFormat(portalPage, 'json')
        await openProblemPopupViaAltF8(portalPage, error1TestCase)

        await verifyKeyboardNavigation(portalPage, error1TestCase, error2TestCase)
      })

      test.skip('P-AQ-TAB-NAV-3-YAML Verify navigation follows severity order in YAML', {
        annotation: {
          type: 'Issue',
          description: 'https://github.com/Netcracker/qubership-apihub/issues/445',
        },
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const [error1TestCase] = ISSUE_TEST_CASES

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await openProblemPopupViaTooltip(portalPage, error1TestCase)

        await verifySeverityOrderNavigation(portalPage)
      })

      test.skip('P-AQ-TAB-NAV-3-JSON Verify navigation follows severity order in JSON', {
        annotation: {
          type: 'Issue',
          description: 'https://github.com/Netcracker/qubership-apihub/issues/445',
        },
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const [error1TestCase] = ISSUE_TEST_CASES

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS30.name)
        await switchToFormat(portalPage, 'json')
        await openProblemPopupViaTooltip(portalPage, error1TestCase)

        await verifySeverityOrderNavigation(portalPage)
      })

      test('P-AQ-TAB-NAV-4-YAML Verify navigation behavior with overlapping issues in YAML', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS31.name)
        await openProblemPopupForOverlappingIssue(portalPage, MSG_OVERLAP_ERROR_1, TEXT_OVERLAP_OPERATION)

        await verifyOverlappingIssuesNavigation(portalPage)
      })

      test('P-AQ-TAB-NAV-4-JSON Verify navigation behavior with overlapping issues in JSON', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)
        await switchToTestDocument(portalPage, FILE_TAB_OAS31.name)
        await switchToFormat(portalPage, 'json')
        await openProblemPopupForOverlappingIssue(portalPage, MSG_OVERLAP_ERROR_1, TEXT_OVERLAP_OPERATION)

        await verifyOverlappingIssuesNavigation(portalPage)
      })
    })

    test.describe('Special States', () => {
      // Message for No Validation Results state (note: no newline/space between sentences in rendered text)
      const MSG_NO_VALIDATION_RESULTS =
        'API Quality results are not availablePlease check the Summary tab for validation status'

      // Mock for validation summary to simulate no validation results
      const mockValidationSummaryNotAvailable = async (page: Page): Promise<void> => {
        await test.step('Mock validation summary to return 404 (no validation results)', async () => {
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

      test('P-AQ-TAB-EDGE-1-M Verify No Validation Results state', {
        tag: '@smoke',
      }, async ({ sysadminPage: page }) => {
        const portalPage = new PortalPage(page)
        const { apiQualityTab } = portalPage.versionPackagePage

        await mockValidationSummaryNotAvailable(page)

        await navigateToApiQualityTab(portalPage, V_AQ_TAB_MIXED_N)

        await test.step('Verify placeholder message is displayed', async () => {
          await expect(apiQualityTab.noResultsPlaceholder).toContainText(MSG_NO_VALIDATION_RESULTS)
        })
      })
    })
  })
})
