import type { Locator } from '@playwright/test'
import { createItemGetter, type ItemGetterConfig } from '@services/utils'
import {BaseComponent, Content, Icon, Link, Placeholder, Title} from '@shared/components/base'
import { ValidationRuleset } from './QualityValidationSection/ValidationRuleset'

export class QualityValidationSection extends BaseComponent {
  readonly title = new Title(this.rootLocator.getByTestId('QualityValidationTitle'), 'Quality Validation')
  readonly alertIcon = new Icon(this.rootLocator.getByTestId('ValidationFailedAlert'), 'Validation failed')
  readonly placeholder = new Placeholder(
    this.rootLocator.getByTestId('QualityValidationPlaceholder'),
    'Quality Validation',
  )
  readonly runValidationLink = new Link(this.rootLocator.getByTestId('RunValidationLink'), 'Run Validation')
  readonly errorCount = new Content(this.rootLocator.getByTestId('IssueCount-error'), 'Error count')
  readonly warningCount = new Content(this.rootLocator.getByTestId('IssueCount-warning'), 'Warning count')
  readonly infoCount = new Content(this.rootLocator.getByTestId('IssueCount-info'), 'Info count')
  readonly hintCount = new Content(this.rootLocator.getByTestId('IssueCount-hint'), 'Hint count')
  readonly failedDocuments = new Content(
    this.rootLocator.getByTestId('FailedDocumentsContainer'),
    'Failed documents',
  )

  private readonly validationRulesetConfig: ItemGetterConfig<ValidationRuleset> = {
    constructor: ValidationRuleset,
    rootLocator: this.rootLocator.getByTestId('ValidationRulesetContainer'),
    componentTypes: {
      singular: 'validation ruleset',
      plural: 'validation rulesets',
    },
  }

  readonly getValidationRuleset = createItemGetter(this.validationRulesetConfig)

  constructor(rootLocator: Locator) {
    super(rootLocator, 'Quality Validation', 'section')
  }
}
