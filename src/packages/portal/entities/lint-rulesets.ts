export const LintRulesetStatuses = {
  INACTIVE: 'inactive',
  ACTIVE: 'active',
} as const

export type LintRulesetStatus = (typeof LintRulesetStatuses)[keyof typeof LintRulesetStatuses]

// Display values for statuses (UI uses capitalize on status, so 'active' -> 'Active', 'inactive' -> 'Inactive')
export const LINT_RULESET_STATUS_DISPLAY = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
} as const

export const LintRulesetApiTypes = {
  OAS_2_0: 'openapi-2-0',
  OAS_3_0: 'openapi-3-0',
  OAS_3_1: 'openapi-3-1',
} as const

export type LintRulesetApiType = (typeof LintRulesetApiTypes)[keyof typeof LintRulesetApiTypes]

export const RULESET_API_TYPE_TITLE_MAP = {
  [LintRulesetApiTypes.OAS_2_0]: 'OAS 2.0',
  [LintRulesetApiTypes.OAS_3_0]: 'OAS 3.0',
  [LintRulesetApiTypes.OAS_3_1]: 'OAS 3.1',
}

export const LintRulesetLinters = {
  SPECTRAL: 'spectral',
} as const

export type LintRulesetLinter = (typeof LintRulesetLinters)[keyof typeof LintRulesetLinters]

/**
 * Server default rulesets that are pre-existing in the system.
 */
export const SERVER_DEFAULT_RULESETS = {
  [LintRulesetApiTypes.OAS_2_0]: 'default-openapi-2-0',
  [LintRulesetApiTypes.OAS_3_0]: 'default-openapi-3-0',
  [LintRulesetApiTypes.OAS_3_1]: 'default-openapi-3-1',
} as const
