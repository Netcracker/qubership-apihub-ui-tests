/* eslint-disable no-empty-pattern */
import { type Page, test as base } from '@playwright/test'
import { createRestWithCredentials, type Rest } from '@services/rest'
import { createUserStorageStateWithAuthCookieFromApi } from '@services/storage-state/save'
import {
  type AgentTestDataManager,
  type ApihubTestDataManager,
  createAgentTDM,
  createApihubTDM,
  createRulesetsTDM,
  createUsersTDM,
  type LintRulesetsTestDataManager,
  type UsersTestDataManager,
} from '@services/test-data-manager'
import { SYSADMIN, TEST_USER_1 } from '@test-data'
import { BASE_URL } from '@test-setup'

export type Fixtures = {
  restApihub: Rest

  usersTDM: UsersTestDataManager
  apihubTDM: ApihubTestDataManager
  apihubTdmLongTimeout: ApihubTestDataManager
  lintRulesetTdm: LintRulesetsTestDataManager
  agentTDM: AgentTestDataManager

  sysadminPage: Page
  user1Page: Page
}

export const test = base.extend<Fixtures>({
  restApihub: async ({}, use) => {
    const rest = await createRestWithCredentials(BASE_URL, SYSADMIN)
    await use(rest)
  },

  usersTDM: async ({}, use) => {
    const creator = await createUsersTDM(SYSADMIN)
    await use(creator)
  },

  apihubTDM: async ({}, use) => {
    const creator = await createApihubTDM(SYSADMIN)
    await use(creator)
  },

  apihubTdmLongTimeout: async ({}, use) => {
    const creator = await createApihubTDM(SYSADMIN, 600000)
    await use(creator)
  },

  lintRulesetTdm: async ({}, use) => {
    const creator = await createRulesetsTDM(SYSADMIN)
    await use(creator)
  },

  agentTDM: async ({}, use) => {
    const creator = await createAgentTDM()
    await use(creator)
  },

  sysadminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: await createUserStorageStateWithAuthCookieFromApi(SYSADMIN),
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },

  user1Page: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: await createUserStorageStateWithAuthCookieFromApi(TEST_USER_1),
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

export { expect } from '@playwright/test'
