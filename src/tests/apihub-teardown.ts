import { test } from '@fixtures'

test('Non Reusable Test Entities deletion', async ({ apihubTdmLongTimeout: cleaner, lintRulesetTdm }) => {
  await cleaner.deleteTestEntities(process.env.TEST_ID_N!)
  await lintRulesetTdm.deleteTestRulesets(process.env.TEST_ID_N!)
})
