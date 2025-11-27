import type { Locator } from '@playwright/test'
import { BaseComponent, Chip, Link } from '@shared/components/base'

export class ValidationRuleset extends BaseComponent {
  readonly nameLink = new Link(this.rootLocator.getByTestId('ValidationRulesetLinkName'), 'Ruleset name')
  readonly apiTypeChip = new Chip(this.rootLocator.getByTestId('ValidationRulesetApiTypeChip'), 'API type')
  readonly statusChip = new Chip(this.rootLocator.getByTestId('ValidationRulesetStatusChip'), 'Status')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType ?? 'validation ruleset')
  }
}
