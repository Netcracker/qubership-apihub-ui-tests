import type { Locator, Page } from '@playwright/test'
import { BaseComponent, Button, Content } from '@shared/components/base'
import { ProblemPopUp } from './RawView/ProblemPopUp'
import { ProblemTooltip } from './RawView/ProblemTooltip'

export class RawView extends BaseComponent {
  readonly jsonBtn = new Button(this.page.getByTestId('ModeButton-json'), 'JSON')
  readonly yamlBtn = new Button(this.page.getByTestId('ModeButton-yaml'), 'YAML')
  readonly problemPopUp = new ProblemPopUp(this.page)
  readonly problemTooltip = new ProblemTooltip(this.page)

  constructor(private readonly page: Page) {
    super(page.locator('.monaco-editor').and(page.getByRole('code')), 'Raw view')
  }

  getLine(lineNumber: number): Content {
    return new Content(
      this.rootLocator.locator('.margin-view-overlays .line-numbers').filter({ hasText: String(lineNumber) }),
      `Line ${lineNumber}`,
      'line',
    )
  }

  private getTextLocator(text: string): Locator {
    return this.rootLocator.locator('.view-lines').getByText(text)
  }

  async hoverText(text: string): Promise<void> {
    const textLocator = this.getTextLocator(text)
    await textLocator.hover()
  }

  async clickText(text: string): Promise<void> {
    const textLocator = this.getTextLocator(text)
    await textLocator.click()
  }
}
