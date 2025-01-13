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

/* eslint-disable ui-testing/no-browser-commands-in-tests */
/* eslint-disable ui-testing/no-wait-in-tests */
import { expect, test } from '@fixtures'
import { PortalPage } from '@portal/pages'
import { BASE_ORIGIN } from '@test-setup'
import { readFileSync } from 'fs'
import { saveSsFileByLocalViaAPI } from '@services/storage-state'
import { SYSADMIN } from '@test-data'

// TestCase-A-9527
// TestCase-A-9634

test.describe.configure({ mode: 'parallel' })

const data = readFileSync(`./src/tests/adv/urls/${process.env.ADV_FILE}.json`, 'utf8')
const paths: string[] = JSON.parse(data).urls

for (const [index, path] of paths.entries()) {
  const url = `${BASE_ORIGIN}${path}`

  test(path,
    {
      annotation: { type: 'URL', description: url },
    },
    async ({ sysadminPage: page }) => {

      if (index % 5000 === 0 && index !== 0) {
        await saveSsFileByLocalViaAPI(SYSADMIN)
      }

      const responsePromise = page.waitForResponse(response =>
        response.url().includes('changes?'))

      const consolePromise = page.waitForEvent('console', msg =>
        msg.type() === 'debug' && (msg.text() === 'operation-viewer:ok' || msg.text() === 'operation-viewer:failed'))

      page.on('console', msg => {
        console.log(`${msg.type()}:"${msg.text()}"`)
      })

      await new PortalPage(page).goto(url)

      const response = await responsePromise
      const jsonData = await response.json()

      if (jsonData.operations.length === 0) {
        test.info().annotations.push({ type: 'Issue', description: 'No operations' })
        await page.evaluate(() => {
          console.debug('operation-viewer:ok')
        })
        return
      }

      await test.step('Success message', async () => {
        const msg = (await consolePromise).text()
        if (msg === 'operation-viewer:failed') {
          test.info().annotations.push({ type: 'Issue', description: 'Rendering failure' })
        }
        expect(msg).toEqual('operation-viewer:ok')
      })
    })
}