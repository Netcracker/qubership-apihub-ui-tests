import type { Page } from '@playwright/test'
import { nthPostfix } from '@services/utils'
import { Button, Select, Tab } from '@shared/components/base'
import { BaseDeleteDialog } from '@shared/components/custom'
import { ActivateRulesetDialog } from './ActivateRulesetDialog'
import { CreateRulesetDialog } from './CreateRulesetDialog'
import { RulesetTableRow } from './RulesetTableRow'

export class RulesetManagementTab extends Tab {
  readonly title = this.page.getByTestId('CardHeaderTitle')
  readonly rulesetTypeSlt = new Select(this.page.getByTestId('RulesetTypeSelect'), 'Ruleset API Type')
  readonly addRulesetBtn = new Button(this.page.getByTestId('AddRulesetButton'), 'Add Ruleset')

  readonly createRulesetDialog = new CreateRulesetDialog(this.page)
  readonly activateRulesetDialog = new ActivateRulesetDialog(this.page)
  readonly deleteRulesetDialog = new BaseDeleteDialog(this.page)

  constructor(protected readonly page: Page) {
    super(page.getByTestId('RulesetManagementTabButton'), 'API Quality Ruleset Management')
  }

  getRulesetRow(rulesetName?: string, options?: { exact: boolean }): RulesetTableRow
  getRulesetRow(nth?: number): RulesetTableRow
  getRulesetRow(rulesetName?: string, options?: { exact: boolean }, nth?: number): RulesetTableRow
  getRulesetRow(rulesetNameOrNth?: string | number, options = { exact: false }, nth?: number): RulesetTableRow {
    if (typeof rulesetNameOrNth === 'string' && !nth) {
      return new RulesetTableRow(
        this.page.getByRole('cell', { name: rulesetNameOrNth, ...options }).locator('..'),
        rulesetNameOrNth,
      )
    }
    if (typeof rulesetNameOrNth === 'number') {
      return new RulesetTableRow(
        this.page.getByTestId('Cell-ruleset-name').nth(rulesetNameOrNth - 1).locator('..'),
        '',
        `${rulesetNameOrNth}${nthPostfix(rulesetNameOrNth)} ruleset row`,
      )
    }
    if (!rulesetNameOrNth && !nth) {
      return new RulesetTableRow(
        this.page.getByTestId('Cell-ruleset-name').locator('..'),
        '',
        'All ruleset rows',
      )
    }
    if (rulesetNameOrNth && nth) {
      return new RulesetTableRow(
        this.page.getByRole('cell', { name: rulesetNameOrNth, ...options }).locator('..').nth(nth - 1),
        rulesetNameOrNth,
        `${nth}${nthPostfix(nth)} ruleset row`,
      )
    }
    throw new Error('Check arguments')
  }
}
