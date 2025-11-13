import { expect, test } from '@playwright/test'
import type { LintRulesetApiType } from '@portal/entities'
import { LintRulesetLinters, LintRulesetStatuses } from '@portal/entities'
import { getAuthDataFromApi } from '@services/auth'
import {
  type CreateLintRulesetRestParams,
  createRestWithToken,
  type LintRulesetRestDto,
  rActivateRuleset,
  rClearLinterTestData,
  rCreateRuleset,
  rDeleteRuleset,
  type Rest,
  rGetRuleset,
  rGetRulesets,
} from '@services/rest'
import type { IdRestParams } from '@services/rest/rest.types'
import type { IdNameTdmParams } from '@services/test-data-manager/tdm.entities'
import { getRestFailMsg } from '@services/utils'
import type { Credentials } from '@shared/entities'
import { BASE_URL } from '@test-setup'

export type LintRulesetNameTdmParams = Readonly<{ rulesetName: string; apiType: LintRulesetApiType }>

export const createRulesetsTDM = async (
  credentials: Credentials,
  requestTimeout?: number,
): Promise<LintRulesetsTestDataManager> => {
  const { token } = await getAuthDataFromApi(BASE_URL, credentials)
  const rest = await createRestWithToken(BASE_URL, token, requestTimeout)
  return new LintRulesetsTestDataManager(rest)
}

export class LintRulesetsTestDataManager {
  private readonly rest: Rest

  constructor(rest: Rest) {
    this.rest = rest
  }

  async createRuleset({
    rulesetName,
    apiType,
    linter = LintRulesetLinters.SPECTRAL,
    rulesetFile,
  }: CreateLintRulesetRestParams): Promise<LintRulesetRestDto> {
    const message = `"${rulesetName}" ruleset of ${apiType} API type creation`

    let createdRuleset!: LintRulesetRestDto

    await test.step(message, async () => {
      const response = await this.rest.send(rCreateRuleset, [201], {
        rulesetName: rulesetName,
        apiType: apiType,
        linter: linter,
        rulesetFile: rulesetFile,
      })

      if (response.status() !== 201) {
        throw Error(await getRestFailMsg(message, response))
      }

      createdRuleset = await response.json()
    }, { box: true })

    await test.step(`Checking ${message}`, async () => {
      if (!createdRuleset) {
        throw Error(await getRestFailMsg(`Checking ${message}`))
      }

      const ruleset = await this.getRulesetById(createdRuleset)
      expect(ruleset).toBeDefined()
      expect(ruleset?.name).toBe(rulesetName)
      expect(ruleset?.apiType).toBe(apiType)
      expect(ruleset?.linter).toBe(linter)
    }, { box: true })

    return createdRuleset
  }

  async activateRuleset({ id, name }: IdNameTdmParams): Promise<void> {
    const message = `"${name || id}" ruleset activation`

    await test.step(message, async () => {
      const response = await this.rest.send(rActivateRuleset, [200], { id })

      if (response.status() !== 200) {
        throw Error(await getRestFailMsg(message, response))
      }
    }, { box: true })

    await test.step(`Checking ${message}`, async () => {
      const ruleset = await this.getRulesetById({ id })
      expect(ruleset).toBeDefined()
      expect(ruleset?.status).toBe(LintRulesetStatuses.ACTIVE)
    }, { box: true })
  }

  async deleteRuleset({ id, name }: IdNameTdmParams): Promise<void> {
    const message = `"${name || id}" ruleset deletion`

    await test.step(message, async () => {
      const response = await this.rest.send(rDeleteRuleset, [204], { id })

      if (response.status() !== 204) {
        throw Error(await getRestFailMsg(message, response))
      }
    }, { box: true })

    await test.step(`Checking ${message}`, async () => {
      const ruleset = await this.getRulesetById({ id })
      expect(ruleset).toBeUndefined()
    }, { box: true })
  }

  async getRulesetById({ id }: IdRestParams): Promise<LintRulesetRestDto | undefined> {
    let ruleset: LintRulesetRestDto | undefined
    const message = `"${id}" ruleset getting`

    await test.step(message, async () => {
      const response = await this.rest.send(rGetRuleset, [200, 404], { id })

      if (response.status() !== 200 && response.status() !== 404) {
        throw Error(await getRestFailMsg(message, response))
      }

      if (response.status() === 200) {
        ruleset = await response.json()
      }
    }, { box: true })

    return ruleset
  }

  async getRulesetByName(
    { rulesetName, apiType }: LintRulesetNameTdmParams,
  ): Promise<LintRulesetRestDto | undefined> {
    const message = `"${rulesetName}" ruleset of ${apiType} API type getting`

    const response = await this.rest.send(rGetRulesets, [200])

    if (response.status() !== 200) {
      throw Error(await getRestFailMsg(message, response))
    }

    const rulesets: LintRulesetRestDto[] = await response.json()

    return rulesets.find((r) => r.name === rulesetName && r.apiType === apiType)
  }

  async deleteTestRulesets(testId: string | string[]): Promise<void> {
    const testIds = Array.isArray(testId) ? testId : [testId]
    const testIdsStr = testIds.join(', ')
    const message = `"${testIdsStr}" test ruleset deletion`

    await test.step(message, async () => {
      for (const id of testIds) {
        const response = await this.rest.send(rClearLinterTestData, [204], { testId: id })
        if (response.status() !== 204) {
          throw Error(await getRestFailMsg(message, response))
        }
      }
    }, { box: true })

    await test.step(`Checking ${message}`, async () => {
      const response = await this.rest.send(rGetRulesets, [200])

      if (response.status() !== 200) {
        throw Error(await getRestFailMsg(message, response))
      }

      const rulesets: LintRulesetRestDto[] = await response.json()

      // Verify that no ruleset names contain any of the test IDs after deletion.
      expect(rulesets.every((r) => !testIds.some((id) => r.name.includes(id)))).toBeTruthy()
    }, { box: true })
  }
}
