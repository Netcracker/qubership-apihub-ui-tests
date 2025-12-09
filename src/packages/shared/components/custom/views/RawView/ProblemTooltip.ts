import type { Page } from '@playwright/test'
import { BaseComponent, Button, Content } from '@shared/components/base'

export class ProblemTooltip extends BaseComponent {
  readonly message = new Content(
    this.rootLocator.locator('.marker.hover-contents'),
    'Problem tooltip',
    'message',
  )
  readonly viewProblemBtn = new Button(this.rootLocator.getByRole('button'), 'View Problem')

  constructor(page: Page) {
    super(page.locator('.monaco-hover-content').filter({ has: page.locator('.hover-row') }), 'Problem', 'tooltip')
  }
}
