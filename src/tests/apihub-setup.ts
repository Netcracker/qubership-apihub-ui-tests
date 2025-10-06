import { test } from '@fixtures'
import { createUsersTDM } from '@services/test-data-manager'
import { logEnvVars, setNonReusableTestId, setReusableTestId, stringifyError } from '@services/utils'
import { ROOT_DOWNLOADS } from '@shared/entities'
import { SYSADMIN, TEST_PREFIX } from '@test-data'
import { mkdir } from 'fs/promises'
import path from 'path'

test('APIHUB Global Setup', async () => {
  // Print environment variables
  logEnvVars([
    'BASE_URL',
    'PLAYGROUND_BACKEND_HOST',
    'DEV_PROXY_MODE',
    'TICKET_SYSTEM_URL',
    'AUTH',
    'CREATE_TD',
    'CLEAR_TD',
    'TEST_ID_R',
    'TEST_ID_N',
    'ADV_FILE',
  ])

  // Verify Test Prefix
  if (!/^[a-z0-9]+-$/ig.test(TEST_PREFIX)) {
    throw new Error(`Test Prefix is "${TEST_PREFIX}"\nBut must contain only letters, numbers and end with "-".`)
  }

  // Set test IDs
  process.env.TEST_ID_R = setReusableTestId()
  process.env.TEST_ID_N = setNonReusableTestId()

  // Create temp directories
  try {
    await mkdir(path.resolve(ROOT_DOWNLOADS), { recursive: true })
  } catch (e) {
    throw Error(stringifyError(e))
  }

  // Create system User
  const tdm = await createUsersTDM()
  await tdm.createSysadmin(SYSADMIN)
})
