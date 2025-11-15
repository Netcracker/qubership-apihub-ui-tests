import { LintRulesetApiTypes } from '@portal/entities'

/**
 * Server default rulesets that are pre-existing in the system.
 */
export const SERVER_DEFAULT_RULESETS = {
  [LintRulesetApiTypes.OAS_2_0]: 'default-openapi-2-0',
  [LintRulesetApiTypes.OAS_3_0]: 'default-openapi-3-0',
  [LintRulesetApiTypes.OAS_3_1]: 'default-openapi-3-1',
} as const
