import { test } from '@fixtures'
import { LintRulesetApiTypes, RULESET_API_TYPE_TITLE_MAP } from '@portal/entities'
import { PortalPage } from '@portal/pages'
import { expect } from '@services/expect-decorator'

const DEFAULT_API_TYPE_LABEL = RULESET_API_TYPE_TITLE_MAP[LintRulesetApiTypes.OAS_3_0]

test.describe('API Quality Validation', () => {
  test.describe('Ruleset Management', () => {
    test('P-AQ-RM-UI-1 Verify Ruleset Management tab is hidden when linter is disabled', {
      tag: '@smoke',
    }, async ({ sysadminPage: page }) => {
      const portalPage = new PortalPage(page)
      const { portalSettingsPage } = portalPage

      await test.step('Mock system configuration API to disable linter', async () => {
        await page.route('**/api/v2/system/configuration', async (route) => {
          const response = await route.fetch()
          const json = await response.json()

          // Remove api-linter extension from the response
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
        // Get the first ruleset row from the table (default rulesets should exist)
        const firstRulesetRow = rulesetManagementTab.getRulesetRow(1)

        await expect(firstRulesetRow.nameCell).toBeVisible()
        await expect(firstRulesetRow.activationHistoryCell).toBeVisible()
        await expect(firstRulesetRow.statusCell).toBeVisible()
        await expect(firstRulesetRow.createdAtCell).toBeVisible()
      })
    })

    test('P-AQ-RM-CREATE-1 Open, verify title, and close the Create Ruleset dialog', async ({ sysadminPage: page }) => {
      const portalPage = new PortalPage(page)
      const { portalSettingsPage } = portalPage
      const { rulesetManagementTab } = portalSettingsPage
      const { createRulesetDialog } = rulesetManagementTab

      await test.step('Navigate to Ruleset Management tab', async () => {
        await portalPage.goto()
        await portalPage.header.portalSettingsBtn.click()
        await rulesetManagementTab.click()
      })

      await test.step('Open Create Ruleset dialog', async () => {
        await rulesetManagementTab.addRulesetBtn.click()
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
  })
})
