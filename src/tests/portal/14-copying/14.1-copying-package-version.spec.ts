/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { test } from '@fixtures'
import { PortalPage } from '@portal/pages/PortalPage'
import { expect } from '@services/expect-decorator'
import { DRAFT_VERSION_STATUS, NO_PREV_RELEASE_VERSION, RELEASE_VERSION_STATUS } from '@shared/entities'
import {
  P_PK_CP_EMPTY,
  P_PK_CP_PATTERN,
  P_PK_CP_RELEASE,
  P_WS_MAIN_R,
  RV_PATTERN_NEW,
  V_P_PKG_CHANGELOG_REST_CHANGED_R,
  V_P_PKG_COPYING_RELEASE_N,
  VERSION_COPIED_MSG,
} from '@test-data/portal'
import { PUBLISH_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import { SYSADMIN } from '@test-data'

test.describe('14.1 Copying Package Version', () => {

  const sourceVersion = V_P_PKG_CHANGELOG_REST_CHANGED_R

  test('[P-CPAP-1] Copy Version to an empty package',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9365` },
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9363` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1403` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab, operationsTab, deprecatedTab, documentsTab, copyVersionDialog } = versionPage
      const targetWorkspace = P_WS_MAIN_R
      const targetPackage = P_PK_CP_EMPTY

      await test.step('Open source Version', async () => {
        await portalPage.gotoVersion(sourceVersion)
        await versionPage.toolbar.copyBtn.click()

        await expect(copyVersionDialog.workspaceAc).toHaveValue(targetWorkspace.name)
        await expect(copyVersionDialog.versionAc).toHaveValue(sourceVersion.version)
      })

      await test.step('Clear fields', async () => {
        await copyVersionDialog.workspaceAc.clear()
        await copyVersionDialog.versionAc.clear()
        await copyVersionDialog.statusAc.clear()

        await expect(copyVersionDialog.packageAc).toBeDisabled()
      })

      await test.step('Set target Workspace', async () => {
        await copyVersionDialog.fillForm({
          workspace: targetWorkspace,
        })

        await expect(copyVersionDialog.packageAc).toBeEnabled()
        /*!await expect(copyVersionDialog.versionAc).toHaveValue(sourceVersion.version) //Issue: TestCase-B-1403
        await expect(copyVersionDialog.statusAc).toHaveValue(sourceVersion.status)
        for (const label of sourceVersion.metadata!.versionLabels!) {
          await expect(copyVersionDialog.labelsAc).toContainText(label)
        }*/
      })

      await test.step('Set target Package', async () => {
        await copyVersionDialog.fillForm({
          package: targetPackage,
        })

        /*!await expect(copyVersionDialog.versionAc).toHaveValue(sourceVersion.version) //Issue: TestCase-B-1403
        await expect(copyVersionDialog.statusAc).toHaveValue(sourceVersion.status)
        for (const label of sourceVersion.metadata!.versionLabels!) {
          await expect(copyVersionDialog.labelsAc).toContainText(label)
        }*/
      })

      await test.step('Set target Version Info and copy Version', async () => {
        await copyVersionDialog.fillForm({
          version: '2000.2',
          status: DRAFT_VERSION_STATUS,
          labels: ['label-1', 'label-2'],
          previousVersion: NO_PREV_RELEASE_VERSION,
        })
        await copyVersionDialog.copyBtn.click()

        await expect(copyVersionDialog.copyBtn).toBeHidden({ timeout: PUBLISH_TIMEOUT })
        await expect(portalPage.snackbar).toContainText(VERSION_COPIED_MSG)
      })

      await test.step('Navigate to the target Package summary', async () => {
        await portalPage.snackbar.checkItOutLink.click()

        await expect(overviewTab.summaryTab.body.labels).toContainText('label-1')
        await expect(overviewTab.summaryTab.body.labels).toContainText('label-2')
        await expect(overviewTab.summaryTab.body.summary.currentVersion).toHaveText('2000.2')
        await expect(overviewTab.summaryTab.body.summary.revision).not.toBeEmpty() //not a specific number because it changes every retry
        await expect(overviewTab.summaryTab.body.summary.previousVersion).toBeEmpty()
        await expect(overviewTab.summaryTab.body.summary.publishedBy).toHaveText(SYSADMIN.name)
        await expect(overviewTab.summaryTab.body.summary.publicationDate).not.toBeEmpty()
        await expect(overviewTab.summaryTab.body.restApi.operations).toHaveText('19')
        await expect(overviewTab.summaryTab.body.restApi.deprecatedOperations).toHaveText('2')

        await expect(versionPage.apiChangesTab).toBeDisabled()
      })

      await test.step('Navigate to the "Operations" tab', async () => {
        await versionPage.operationsTab.click()

        await expect(operationsTab.table.getOperationRow()).toHaveCount(19)

        await operationsTab.sidebar.groupFilterAc.click()

        await expect(operationsTab.sidebar.groupFilterAc.getListItem('v1')).toBeVisible()
      })

      await test.step('Navigate to the "Deprecated" tab', async () => {
        await versionPage.deprecatedTab.click()

        await expect(deprecatedTab.table.getOperationRow()).toHaveCount(4)
      })

      await test.step('Navigate to the "Documents" tab', async () => {
        await versionPage.documentsTab.click()

        await expect(documentsTab.sidebar.getAllFiles()).toHaveCount(1)
      })

      await test.step('Open the Version selector', async () => {
        await versionPage.toolbar.versionSlt.click()
        await versionPage.toolbar.versionSlt.draftBtn.click()

        await expect(versionPage.toolbar.versionSlt.getVersionRow()).toHaveCount(1)
      })
    })

  test('[P-CPAP-4] Copy Version with previous version (package)',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9371` },
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9370` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1403` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab, operationsTab, apiChangesTab, deprecatedTab, documentsTab, copyVersionDialog } = versionPage
      const targetWorkspace = P_WS_MAIN_R
      const targetPackage = P_PK_CP_RELEASE

      await test.step('Open source Version', async () => {
        await portalPage.gotoVersion(sourceVersion)
        await versionPage.toolbar.copyBtn.click()

        await expect(copyVersionDialog.workspaceAc).toHaveValue(targetWorkspace.name)
      })

      await test.step('Set target Package', async () => {
        await copyVersionDialog.fillForm({
          package: targetPackage,
        })

        await expect(copyVersionDialog.packageAc).toHaveValue(targetPackage.name)
        /*!await expect(copyVersionDialog.versionAc).toHaveValue(sourceVersion.version) //Issue: TestCase-B-1403
        await expect(copyVersionDialog.statusAc).toHaveValue(sourceVersion.status)
        for (const label of sourceVersion.metadata!.versionLabels!) {
          await expect(copyVersionDialog.labelsAc).toContainText(label)
        }*/
        await expect(copyVersionDialog.previousVersionAc).toHaveValue(NO_PREV_RELEASE_VERSION)
      })

      await test.step('Set target Version Info and copy Version', async () => {
        await copyVersionDialog.fillForm({
          version: '2000.2',
          status: RELEASE_VERSION_STATUS,
          labels: ['label-1', 'label-2'],
          previousVersion: V_P_PKG_COPYING_RELEASE_N.version,
        })
        await copyVersionDialog.copyBtn.click()

        await expect(copyVersionDialog.copyBtn).toBeHidden({ timeout: PUBLISH_TIMEOUT })
        await expect(portalPage.snackbar).toContainText(VERSION_COPIED_MSG)
      })

      await test.step('Navigate to the target Package summary', async () => {
        await portalPage.snackbar.checkItOutLink.click()

        await expect(overviewTab.summaryTab.body.labels).toContainText('label-1')
        await expect(overviewTab.summaryTab.body.labels).toContainText('label-2')
        await expect(overviewTab.summaryTab.body.summary.currentVersion).toHaveText('2000.2')
        await expect(overviewTab.summaryTab.body.summary.revision).toHaveText('1')
        await expect(overviewTab.summaryTab.body.summary.previousVersion).toHaveText(V_P_PKG_COPYING_RELEASE_N.version)
        await expect(overviewTab.summaryTab.body.summary.publishedBy).toHaveText(SYSADMIN.name)
        await expect(overviewTab.summaryTab.body.summary.publicationDate).not.toBeEmpty()
        await expect(overviewTab.summaryTab.body.restApi.operations).toHaveText('19')
        await expect(overviewTab.summaryTab.body.restApi.deprecatedOperations).toHaveText('2')
      })

      await test.step('Navigate to the "Operations" tab', async () => {
        await versionPage.operationsTab.click()

        await expect(operationsTab.table.getOperationRow()).toHaveCount(19)
      })

      await test.step('Navigate to the "API Changes" tab', async () => {
        await versionPage.apiChangesTab.click()

        await expect(apiChangesTab.table.getOperationRow()).toHaveCount(5)
      })

      await test.step('Navigate to the "Deprecated" tab', async () => {
        await versionPage.deprecatedTab.click()

        await expect(deprecatedTab.table.getOperationRow()).toHaveCount(4)
      })

      await test.step('Navigate to the "Documents" tab', async () => {
        await versionPage.documentsTab.click()

        await expect(documentsTab.sidebar.getAllFiles()).toHaveCount(1)
      })

      await test.step('Open the Version selector', async () => {
        await versionPage.toolbar.versionSlt.click()

        await expect(versionPage.toolbar.versionSlt.getVersionRow()).toHaveCount(2)
      })
    })

  test('[P-CPAP-4-N] Copy Version with wrong pattern (package)',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9369` },
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9370` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { copyVersionDialog } = versionPage
      const targetWorkspace = P_WS_MAIN_R
      const targetPackage = P_PK_CP_PATTERN

      await test.step('Open source Version', async () => {
        await portalPage.gotoVersion(sourceVersion)
        await versionPage.toolbar.copyBtn.click()

        await expect(copyVersionDialog.workspaceAc).toHaveValue(targetWorkspace.name)
      })

      await test.step('Set copying parameters', async () => {
        await copyVersionDialog.fillForm({
          package: targetPackage,
          version: '2000.2',
          status: RELEASE_VERSION_STATUS,
          previousVersion: NO_PREV_RELEASE_VERSION,
        })
      })

      await test.step('Try to copy Version', async () => {
        await copyVersionDialog.copyBtn.click()

        await expect(copyVersionDialog.errorMsg).toHaveText(`Release version must match the following regular expression: ${RV_PATTERN_NEW}`)
      })
    })
})
