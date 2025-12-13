import { test } from '@fixtures'
import { LintRulesetApiTypes, LintRulesetLinters, RULESET_API_TYPE_TITLE_MAP } from '@portal/entities'
import type { PortalPage } from '@portal/pages'
import type { LintRulesetsTestDataManager } from '@services/test-data-manager'
import { TestFile } from '@shared/entities'
import { ALIAS_PREFIX } from '@test-data/prefixes'
import path from 'node:path'
import { ROOT_API_QUALITY } from './aq-shared.support'

/**
 * Direct URL path for the Ruleset Management page.
 */
export const RULESET_MANAGEMENT_PATH = '/portal/settings/rulesets'

/**
 * Default API type label expected in the Ruleset Management API type selector.
 */
export const DEFAULT_API_TYPE_LABEL = RULESET_API_TYPE_TITLE_MAP[LintRulesetApiTypes.OAS_3_0]

/**
 * Minimal valid ruleset file used for positive ruleset creation scenarios.
 */
export const FILE_SIMPLE_RULESET = new TestFile(path.join(ROOT_API_QUALITY, 'rulesets', 'aq-rm-simple-ruleset.yaml'), {
  yamlString: 'rules:',
})

/**
 * Invalid ruleset file (wrong extension) used to verify UI validation errors.
 */
export const FILE_INVALID_EXTENSION = new TestFile(
  path.join(ROOT_API_QUALITY, 'rulesets', 'aq-rm-invalid-extension.txt'),
)

/**
 * Snackbar message shown after a ruleset is created.
 */
export const MSG_RULESET_CREATED_SUCCESS = (rulesetName: string): string => {
  return `${rulesetName} ruleset has been created`
}

/**
 * Snackbar message shown after a ruleset is deleted.
 */
export const MSG_RULESET_DELETED_SUCCESS = (rulesetName: string): string => {
  return `${rulesetName} ruleset has been deleted`
}

/**
 * Snackbar message shown after copying a public ruleset URL.
 */
export const MSG_PUBLIC_URL_COPIED_SUCCESS = 'Public URL copied'

/**
 * Error message shown when attempting to create a ruleset with duplicate name for the same API type.
 */
export const MSG_DUPLICATE_NAME = (rulesetName: string, apiType: string): string => {
  return `Ruleset name ${rulesetName} is not unique for API type ${apiType}`
}

/**
 * Error message shown when an uploaded ruleset file is not YAML.
 */
export const MSG_INVALID_FILE_FORMAT = 'File format must be YAML'

/**
 * Tooltip text shown when trying to delete an active ruleset.
 */
export const TIP_CANNOT_DELETE_ACTIVE = 'Cannot delete active ruleset'

/**
 * Tooltip text shown when trying to delete a ruleset that has activation history (versions validated against it).
 */
export const TIP_CANNOT_DELETE_WITH_HISTORY =
  'The ruleset cannot be deleted due to existing versions that have been validated against this ruleset'

/**
 * References to rulesets created in Ruleset Management suite setup.
 *
 * Kept in a single object so setup can be reused while the spec keeps its original variable names.
 */
export type AqRmRulesetRefs = {
  RUL_INACTIVE_OAS30_N: { id: string; name: string }
  RUL_PREVIOUSLY_ACTIVE_OAS30_N: { id: string; name: string }
  RUL_INACTIVE_OAS31_N: { id: string; name: string }
  RUL_GENERAL_OAS30_N: { id: string; name: string }
}

/**
 * Creates baseline rulesets for the Ruleset Management suite and establishes activation history.
 *
 * Why: several UI tests rely on having:
 * - inactive rulesets for two API types
 * - a ruleset with multiple activation history records (tooltip test)
 * - a "general" ruleset used as a switching target during activation history setup
 */
export const setupRulesetManagementRulesets = async (
  lintRulesetTdm: LintRulesetsTestDataManager,
  testIdN: string,
): Promise<AqRmRulesetRefs> => {
  const rulesetNamePrefix = `${ALIAS_PREFIX}-`

  const inactiveOas30 = await lintRulesetTdm.createRuleset({
    rulesetName: `${rulesetNamePrefix}Inactive-OAS30-${testIdN}`,
    apiType: LintRulesetApiTypes.OAS_3_0,
    linter: LintRulesetLinters.SPECTRAL,
    rulesetFile: FILE_SIMPLE_RULESET,
  })

  const inactiveOas31 = await lintRulesetTdm.createRuleset({
    rulesetName: `${rulesetNamePrefix}Inactive-OAS31-${testIdN}`,
    apiType: LintRulesetApiTypes.OAS_3_1,
    linter: LintRulesetLinters.SPECTRAL,
    rulesetFile: FILE_SIMPLE_RULESET,
  })

  const generalOas30 = await lintRulesetTdm.createRuleset({
    rulesetName: `${rulesetNamePrefix}General-OAS30-${testIdN}`,
    apiType: LintRulesetApiTypes.OAS_3_0,
    linter: LintRulesetLinters.SPECTRAL,
    rulesetFile: FILE_SIMPLE_RULESET,
  })

  const previouslyActive = await lintRulesetTdm.createRuleset({
    rulesetName: `${rulesetNamePrefix}PreviouslyActive-OAS30-${testIdN}`,
    apiType: LintRulesetApiTypes.OAS_3_0,
    linter: LintRulesetLinters.SPECTRAL,
    rulesetFile: FILE_SIMPLE_RULESET,
  })

  const RUL_INACTIVE_OAS30_N = { id: inactiveOas30.id, name: inactiveOas30.name }
  const RUL_INACTIVE_OAS31_N = { id: inactiveOas31.id, name: inactiveOas31.name }
  const RUL_GENERAL_OAS30_N = { id: generalOas30.id, name: generalOas30.name }
  const RUL_PREVIOUSLY_ACTIVE_OAS30_N = { id: previouslyActive.id, name: previouslyActive.name }

  // Establish activation history: activate PREVIOUSLY_ACTIVE three times
  // (last activation is shown in table, previous ones in tooltip)
  for (let i = 0; i < 3; i++) {
    await lintRulesetTdm.activateRuleset(RUL_PREVIOUSLY_ACTIVE_OAS30_N)
    await lintRulesetTdm.activateRuleset(RUL_GENERAL_OAS30_N)
  }

  return {
    RUL_INACTIVE_OAS30_N,
    RUL_PREVIOUSLY_ACTIVE_OAS30_N,
    RUL_INACTIVE_OAS31_N,
    RUL_GENERAL_OAS30_N,
  }
}

/**
 * Navigates to the Ruleset Management tab via direct URL.
 *
 * Use this helper whenever tests start from a clean state (no existing navigation context).
 */
export const navigateToRulesetManagement = async (portalPage: PortalPage): Promise<void> => {
  await test.step('Navigate to Ruleset Management tab', async () => {
    await portalPage.goto(RULESET_MANAGEMENT_PATH)
  })
}
