import { test } from '@fixtures'
import { expect } from '@services/expect-decorator'
import { getSysInfo } from '@test-data/props'
import { AgentPage } from '@agent/pages'
import { PortalPage } from '@portal/pages'
import { MIDDLE_EXPECT, TICKET_BASE_URL } from '@test-setup'
import { isDevProxyMode } from '@services/utils'

test.describe('General', () => {

  test('[P-GEN-1] Opening Portal page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4277` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)

      await portalPage.goto()

      await expect(portalPage.header.userMenu).toBeVisible()
      await expect.soft(portalPage.header.portalBtn).toBeVisible()
      await expect.soft(portalPage.header.agentBtn).toBeVisible()
      await expect.soft(portalPage.header.globalSearchBtn).toBeVisible()
      await expect.soft(portalPage.header.sysInfoBtn).toBeVisible()
      await expect.soft(portalPage.header.userAvatar).toBeVisible()
      await expect.soft(portalPage.sidebar.favoritesBtn).toBeVisible()
      await expect.soft(portalPage.sidebar.sharedBtn).toBeVisible()
      await expect.soft(portalPage.sidebar.privateBtn).toBeVisible()
      await expect.soft(portalPage.sidebar.workspacesBtn).toBeVisible()
    })

  test('[P-GEN-3] Navigation to the Agent page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4279` },
    },
    async ({ sysadminPage: page }) => {
      test.skip(isDevProxyMode(), 'Does not support dev proxy mode')

      const portalPage = new PortalPage(page)
      const agentPage = new AgentPage(page)

      await portalPage.goto()
      await portalPage.header.agentBtn.click()

      await expect(agentPage.header.userMenu).toBeVisible({ timeout: MIDDLE_EXPECT })
      await expect.soft(agentPage.cloudAc).toBeVisible()
    })

  test('[P-GEN-4] Check System Information about APIHUB',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1838` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { sysInfoPopup } = portalPage.header
      const { build } = await getSysInfo()

      await portalPage.goto()
      await portalPage.header.sysInfoBtn.click()

      await expect.soft(sysInfoPopup.content).toBeVisible()
      await expect.soft(sysInfoPopup.closeBtn).toBeVisible()
      await expect.soft(sysInfoPopup.content).toContainText(build.backendVersion)
      await expect.soft(sysInfoPopup.content).toContainText(build.frontendVersion)
      // TODO: Add checking api/v1/system/info "externalLinks": []
    })

  test('[P-GEN-5] Closing System Information popup',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4276` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { sysInfoPopup } = portalPage.header

      await portalPage.goto()
      await portalPage.header.sysInfoBtn.click()

      await expect(sysInfoPopup.content).toBeVisible()

      await sysInfoPopup.closeBtn.click()

      await expect.soft(sysInfoPopup.content).not.toBeVisible()

      await portalPage.header.sysInfoBtn.click()

      await expect(sysInfoPopup.content).toBeVisible()

      await portalPage.backdrop.click()

      await expect(sysInfoPopup.content).not.toBeVisible()
    })
})
