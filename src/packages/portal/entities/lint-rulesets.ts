export const LintRulesetStatuses = {
  INACTIVE: 'inactive',
  ACTIVE: 'active',
} as const

export type LintRulesetStatus = (typeof LintRulesetStatuses)[keyof typeof LintRulesetStatuses]

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
