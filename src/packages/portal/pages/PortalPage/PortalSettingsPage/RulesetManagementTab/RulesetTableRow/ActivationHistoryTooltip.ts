import type { Page } from '@playwright/test'
import { nthPostfix } from '@services/utils'
import { Content, Title, Tooltip } from '@shared/components/base'

export class ActivationHistoryTooltip extends Tooltip {
  readonly title = new Title(
    this.rootLocator.getByTestId('ActivationHistoryTooltipTitle'),
    'Activation History tooltip',
  )

  constructor(protected readonly page: Page, componentName?: string) {
    super(page.getByRole('tooltip'), componentName, 'activation history tooltip')
  }

  getActivationRecord(nth?: number): Content {
    if (nth !== undefined) {
      const recordLocator = this.rootLocator.getByTestId('ActivationHistoryTooltipRecord').nth(nth - 1)
      return new Content(recordLocator, '', `${nth}${nthPostfix(nth)} activation record`)
    }
    return new Content(this.rootLocator, '', 'All activation records')
  }
}
