import type { Page } from '@playwright/test'
import { RulesetManagementTab } from './RulesetManagementTab/RulesetManagementTab'

export class PortalSettingsPage {
  readonly rulesetManagementTab = new RulesetManagementTab(this.page)

  constructor(private readonly page: Page) {}
}
