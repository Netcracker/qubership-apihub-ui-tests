import { test } from '@fixtures'
import { expect } from '@services/expect-decorator'
import { PortalPage } from '@portal/pages/PortalPage'
import { OUTDATED_NOTIFICATION_FLAKY_TEST_ANNOTATION, SHORT_EXPECT, SHORT_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import { VERSION_OPERATIONS_TAB_REST } from '@portal/entities'
import { D_REV_VAR, V_P_DSH_REV_1_N } from '@test-data/portal'

test.describe('13.1.2.2 Dashboard revisions (Outdated revision notification)', () => {

  const testDashboard = D_REV_VAR
  const testVersion = V_P_DSH_REV_1_N

  test('[P-CODR-3.1] Outdated revision notification on the "Operations" tab',
    {
      tag: ['@smoke', '@flaky'],
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8423` },
        { type: 'Flaky', description: OUTDATED_NOTIFICATION_FLAKY_TEST_ANNOTATION },
      ],
    },
    async ({ sysadminPage: page, apihubTDM }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { oldRevisionDialog } = versionPage

      await test.step('With "Yes" button clicking', async () => {
        await portalPage.gotoDashboard(testDashboard)

        await test.step('Publish new revision', async () => {
          await apihubTDM.publishVersion(testVersion)
        })

        await versionPage.operationsTab.click()

        await expect(oldRevisionDialog.yesBtn).toBeVisible()

        await oldRevisionDialog.yesBtn.click()

        await expect(versionPage.toolbar.versionSlt).toHaveText(testVersion.version)
      })

      await test.step('With "Cancel" button clicking', async () => {
        await portalPage.gotoDashboard(testDashboard)

        await test.step('Publish new revision', async () => {
          await apihubTDM.publishVersion(testVersion)
        })

        await versionPage.operationsTab.click()

        await expect(oldRevisionDialog.yesBtn).toBeVisible()

        await oldRevisionDialog.cancelBtn.click()

        await expect(versionPage.toolbar.versionSlt).toContainText('@')
      })
    })

  test.skip('[P-CODR-3.2] Outdated revision notification on the "API Changes" tab',
    {
      tag: ['@flaky'],
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8423` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-977` },
        { type: 'Flaky', description: OUTDATED_NOTIFICATION_FLAKY_TEST_ANNOTATION },
      ],
    },
    async ({ sysadminPage: page, apihubTDM }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { oldRevisionDialog } = versionPage

      await test.step('With "Yes" button clicking', async () => {
        await portalPage.gotoDashboard(testDashboard)

        await test.step('Publish new revision', async () => {
          await apihubTDM.publishVersion(testVersion)
        })

        await versionPage.apiChangesTab.click()

        await expect(oldRevisionDialog.yesBtn).toBeVisible()

        await oldRevisionDialog.yesBtn.click()

        await expect(versionPage.toolbar.versionSlt).toHaveText(testVersion.version)
      })

      await test.step('With "Cancel" button clicking', async () => {
        await portalPage.gotoDashboard(testDashboard)

        await test.step('Publish new revision', async () => {
          await apihubTDM.publishVersion(testVersion)
        })

        await versionPage.apiChangesTab.click()

        await expect(oldRevisionDialog.yesBtn).toBeVisible()

        await oldRevisionDialog.cancelBtn.click()

        await expect(versionPage.toolbar.versionSlt).toContainText('@')
      })
    })

  test.skip('[P-CODR-3.3] Outdated revision notification on the "Deprecated" tab',
    {
      tag: ['@flaky'],
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8423` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-976` },
        { type: 'Flaky', description: OUTDATED_NOTIFICATION_FLAKY_TEST_ANNOTATION },
      ],
    },
    async ({ sysadminPage: page, apihubTDM }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { oldRevisionDialog } = versionPage

      await test.step('With "Yes" button clicking', async () => {
        await portalPage.gotoDashboard(testDashboard)

        await test.step('Publish new revision', async () => {
          await apihubTDM.publishVersion(testVersion)
        })

        await versionPage.deprecatedTab.click()

        await expect(oldRevisionDialog.yesBtn).toBeVisible()

        await oldRevisionDialog.yesBtn.click()

        await expect(versionPage.toolbar.versionSlt).toHaveText(testVersion.version)
      })

      await test.step('With "Cancel" button clicking', async () => {
        await portalPage.gotoDashboard(testDashboard)

        await test.step('Publish new revision', async () => {
          await apihubTDM.publishVersion(testVersion)
        })

        await versionPage.deprecatedTab.click()

        await expect(oldRevisionDialog.yesBtn).toBeVisible()

        await oldRevisionDialog.cancelBtn.click()

        await expect(versionPage.toolbar.versionSlt).toContainText('@')
      })
    })

  test('[P-CODR-3.4] Outdated revision notification on the "Documents" tab',
    {
      tag: ['@flaky'],
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8423` },
        { type: 'Flaky', description: OUTDATED_NOTIFICATION_FLAKY_TEST_ANNOTATION },
      ],
    },
    async ({ sysadminPage: page, apihubTDM }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { oldRevisionDialog } = versionPage

      await test.step('With "Yes" button clicking', async () => {
        await portalPage.gotoDashboard(testDashboard)

        await test.step('Publish new revision', async () => {
          await apihubTDM.publishVersion(testVersion)
        })

        await versionPage.documentsTab.click()

        await expect(oldRevisionDialog.yesBtn).toBeVisible()

        await oldRevisionDialog.yesBtn.click()

        await expect(versionPage.toolbar.versionSlt).toHaveText(testVersion.version)
      })

      await test.step('With "Cancel" button clicking', async () => {
        await portalPage.gotoDashboard(testDashboard)

        await test.step('Publish new revision', async () => {
          await apihubTDM.publishVersion(testVersion)
        })

        await versionPage.documentsTab.click()

        await expect(oldRevisionDialog.yesBtn).toBeVisible()

        await oldRevisionDialog.cancelBtn.click()

        await expect(versionPage.toolbar.versionSlt).toContainText('@')
      })
    })

  test('[P-CODR-3.5] Outdated revision notification on the "Overview" tab',
    {
      tag: ['@flaky'],
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8423` },
        { type: 'Flaky', description: OUTDATED_NOTIFICATION_FLAKY_TEST_ANNOTATION },
      ],
    },
    async ({ sysadminPage: page, apihubTDM }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { oldRevisionDialog } = versionPage

      await test.step('With "Yes" button clicking', async () => {
        await portalPage.gotoVersion(testVersion, VERSION_OPERATIONS_TAB_REST)

        await test.step('Publish new revision', async () => {
          await apihubTDM.publishVersion(testVersion)
        })

        await portalPage.waitForTimeout(SHORT_TIMEOUT)
        if (await oldRevisionDialog.yesBtn.mainLocator.isVisible()) { // Notification appears immediately (not a bug)
          return
        }

        await versionPage.overviewTab.click()

        await expect(oldRevisionDialog.yesBtn).toBeVisible()

        await oldRevisionDialog.yesBtn.click()

        await expect(versionPage.toolbar.versionSlt).toHaveText(testVersion.version)
      })

      await test.step('With "Cancel" button clicking', async () => {
        await portalPage.gotoVersion(testVersion, VERSION_OPERATIONS_TAB_REST)

        await test.step('Publish new revision', async () => {
          await apihubTDM.publishVersion(testVersion)
        })

        await portalPage.waitForTimeout(SHORT_TIMEOUT)
        if (await oldRevisionDialog.yesBtn.mainLocator.isVisible()) { // Notification appears immediately (not a bug)
          return
        }

        await versionPage.overviewTab.click()

        await expect(oldRevisionDialog.yesBtn).toBeVisible()

        await oldRevisionDialog.cancelBtn.click()

        await expect(versionPage.toolbar.versionSlt).toContainText('@')
      })
    })

  test('[P-CODR-3.6] Outdated revision notification on the "Settings" page',
    {
      tag: ['@smoke', '@flaky'],
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8423` },
        { type: 'Flaky', description: OUTDATED_NOTIFICATION_FLAKY_TEST_ANNOTATION },
      ],
    },
    async ({ sysadminPage: page, apihubTDM }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { oldRevisionDialog } = versionPage

      await test.step('Settings page', async () => {

        await portalPage.gotoDashboard(testDashboard)

        await test.step('Publish new revision', async () => {
          await apihubTDM.publishVersion(testVersion)
        })

        await versionPage.toolbar.settingsBtn.click()
        await portalPage.waitForTimeout(SHORT_EXPECT)

        await expect(oldRevisionDialog.yesBtn).not.toBeVisible()
      })
    })

  test('[P-CODR-3.7] Outdated revision notification on the "Comparison" page',
    {
      tag: ['@smoke', '@flaky'],
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8423` },
        { type: 'Flaky', description: OUTDATED_NOTIFICATION_FLAKY_TEST_ANNOTATION },
      ],
    },
    async ({ sysadminPage: page, apihubTDM }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { oldRevisionDialog, compareSelectDialog } = versionPage

      await test.step('Comparison page', async () => {

        await portalPage.gotoDashboard(testDashboard)

        await test.step('Publish new revision', async () => {
          await apihubTDM.publishVersion(testVersion)
        })

        await versionPage.toolbar.compareMenu.click()
        await versionPage.toolbar.compareMenu.revisionsItm.click()
        await compareSelectDialog.fillForm({ previousRevision: '@1' })
        await compareSelectDialog.compareBtn.click()

        await portalPage.waitForTimeout(SHORT_EXPECT)

        await expect(oldRevisionDialog.yesBtn).not.toBeVisible()
      })
    })

  test('[P-CODR-3.8-N] Outdated revision notification on the "Operations" tab (Negative)',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8423` },
    },
    async ({ sysadminPage: page, apihubTDM }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { oldRevisionDialog } = versionPage

      await portalPage.gotoVersion({ ...testVersion, version: `${testVersion.version}@1` })

      await test.step('Publish new revision', async () => {
        await apihubTDM.publishVersion(testVersion)
      })

      await versionPage.operationsTab.click()

      await portalPage.waitForTimeout(SHORT_EXPECT)

      await expect(oldRevisionDialog.yesBtn).not.toBeVisible()
    })

  test('[P-CODR-3.9-N] Outdated revision notification on the "API Changes" tab (Negative)',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8423` },
    },
    async ({ sysadminPage: page, apihubTDM }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { oldRevisionDialog } = versionPage

      await portalPage.gotoVersion({ ...testVersion, version: `${testVersion.version}@1` })

      await test.step('Publish new revision', async () => {
        await apihubTDM.publishVersion(testVersion)
      })

      await versionPage.apiChangesTab.click()

      await portalPage.waitForTimeout(SHORT_EXPECT)

      await expect(oldRevisionDialog.yesBtn).not.toBeVisible()
    })

  test('[P-CODR-3.10-N] Outdated revision notification on the "Deprecated" tab (Negative)',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8423` },
    },
    async ({ sysadminPage: page, apihubTDM }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { oldRevisionDialog } = versionPage

      await portalPage.gotoVersion({ ...testVersion, version: `${testVersion.version}@1` })

      await test.step('Publish new revision', async () => {
        await apihubTDM.publishVersion(testVersion)
      })

      await versionPage.deprecatedTab.click()

      await portalPage.waitForTimeout(SHORT_EXPECT)

      await expect(oldRevisionDialog.yesBtn).not.toBeVisible()
    })

  test('[P-CODR-3.11-N] Outdated revision notification on the "Documents" tab (Negative)',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8423` },
    },
    async ({ sysadminPage: page, apihubTDM }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { oldRevisionDialog } = versionPage

      await portalPage.gotoVersion({ ...testVersion, version: `${testVersion.version}@1` })

      await test.step('Publish new revision', async () => {
        await apihubTDM.publishVersion(testVersion)
      })

      await versionPage.documentsTab.click()

      await portalPage.waitForTimeout(SHORT_EXPECT)

      await expect(oldRevisionDialog.yesBtn).not.toBeVisible()
    })

  test('[P-CODR-3.12-N] Outdated revision notification on the "Overview" tab (Negative)',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8423` },
    },
    async ({ sysadminPage: page, apihubTDM }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { oldRevisionDialog } = versionPage

      await portalPage.gotoVersion({ ...testVersion, version: `${testVersion.version}@1` },
        VERSION_OPERATIONS_TAB_REST)

      await test.step('Publish new revision', async () => {
        await apihubTDM.publishVersion(testVersion)
      })

      await versionPage.overviewTab.click()

      await portalPage.waitForTimeout(SHORT_EXPECT)

      await expect(oldRevisionDialog.yesBtn).not.toBeVisible()
    })

  test('[P-CODR-3.13-N] Outdated revision notification on the "Settings" page (Negative)',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8423` },
    },
    async ({ sysadminPage: page, apihubTDM }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { oldRevisionDialog } = versionPage

      await portalPage.gotoVersion({ ...testVersion, version: `${testVersion.version}@1` })

      await test.step('Publish new revision', async () => {
        await apihubTDM.publishVersion(testVersion)
      })

      await versionPage.toolbar.settingsBtn.click()
      await portalPage.waitForTimeout(SHORT_EXPECT)

      await expect(oldRevisionDialog.yesBtn).not.toBeVisible()
    })

  test('[P-CODR-3.14-N] Outdated revision notification on the "Comparison" page (Negative)',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8423` },
    },
    async ({ sysadminPage: page, apihubTDM }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { oldRevisionDialog, compareSelectDialog } = versionPage

      await portalPage.gotoVersion({ ...testVersion, version: `${testVersion.version}@1` })

      await test.step('Publish new revision', async () => {
        await apihubTDM.publishVersion(testVersion)
      })

      await versionPage.toolbar.compareMenu.click()
      await versionPage.toolbar.compareMenu.revisionsItm.click()
      await compareSelectDialog.fillForm({ previousRevision: '@2' })
      await compareSelectDialog.compareBtn.click()

      await portalPage.waitForTimeout(SHORT_EXPECT)

      await expect(oldRevisionDialog.yesBtn).not.toBeVisible()
    })
})
