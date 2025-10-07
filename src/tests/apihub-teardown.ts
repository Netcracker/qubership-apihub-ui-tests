import { test } from '@fixtures'

test('Non Reusable Test Entities deletion', async ({ apihubTdmLongTimeout: cleaner }) => {
  await cleaner.deleteTestEntities(process.env.TEST_ID_N!)
})
